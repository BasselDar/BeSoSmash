# Security Architecture

BeSoSmash uses a layered, server-authoritative anti-cheat system. The client is never trusted for score validation. All game state lives on the server.

## Anti-Cheat Layers

### Layer 1 — Origin & Sec-Fetch Validation

**File:** `controllers/socketController.js` (Socket.io middleware)

All WebSocket connections are rigorously validated at the initial handshake. We perform two critical checks:
1. **Origin Header:** Must match our exact known-good domains. 
2. **sec-fetch-site Check:** We strictly demand that the request contains a `sec-fetch-site` attribute representing `same-origin` or `same-site`. Because basic scripts (Python/cURL) can trivially forge the `Origin` header but cannot replicate complex browser-behavior contexts organically unless using headless-browsers, this single check eliminates a vast majority of lightweight bots.

```
Allowed: http://localhost:3000
         https://besosmash.com
         https://www.besosmash.com
         https://besosmash.onrender.com
         https://www.besosmash.onrender.com

All others or missing sec-fetch-site → connection refused (production only)
```

This is the primary wall. Scripts that bypass it must know, spoof the exact origin header, and use browser-like headers.

---

### Layer 1.5 — Per-IP Connection Limiting

**File:** `controllers/socketController.js` 

To deter DDoS style flooding, farming attacks, and excessive script bots, we apply a hard limit of **3 concurrent WebSocket connections per IP address**. Sockets are actively monitored, and subsequent connections are immediately disconnected with a `Too many connections` error.

---

### Layer 2 — Challenge Token

**File:** `controllers/socketController.js` (`startGame` / `keyPressBatch` handlers)

On `startGame`, the server generates a random 16-character hex token (`crypto.randomBytes(8)`) and sends it to the client inside `gameStarted`. Every subsequent `keyPressBatch` must include this token or it is silently dropped.

- Prevents replaying a previously captured session
- Prevents forging key batches without first completing the `startGame` handshake
- Late batches arriving more than 1 second after the game duration are also dropped regardless of token validity

---

### Layer 3 — Elapsed-Time Rate Limiter

**File:** `controllers/socketController.js` (`keyPressBatch` handler)

The server tracks total accepted keys against real wallclock elapsed time. No matter how fast batches arrive, the server will never accept more keys than the physical ceiling allows:

```
maxAllowedTotal = 300 (burst) + floor(elapsedSeconds × 300)
```

| Scenario | Max keys accepted |
|---|---|
| 5-second Classic game | `300 + (5 × 300)` = **1,800** |
| 2-second Blitz game | `300 + (2 × 300)` = **900** |
| Python exploit at 18,000 KPS | **Hits ceiling in <0.1s, 3 violations → killed** |

The burst buffer of 300 accommodates N-key rollover keyboards where forearm slams can register 30+ simultaneous keys in a single 16ms frame.

After 3 consecutive ceiling violations, the session is force-terminated and flagged.

---

### Layer 4 — Batch Frequency Check

**File:** `controllers/socketController.js` (`keyPressBatch` handler)

The minimum allowed time between consecutive batches is **15ms**. The browser client flushes its buffer on a 50ms safety-net interval (never faster), so anything arriving below 15ms is definitively non-human.

- Each sub-threshold batch increments the violation counter
- 3 total violations (shared with Layer 3) → force terminate + flag

Note: a batch arriving < 15ms immediately before game-end is tolerated (the violation counter increments but the keys are still accepted), because a player's final keyboard flush can legitimately race with the game-end timer.

---

### Layer 5 — ProfileEngine Cheater Flags

**File:** `utils/ProfileEngine.js` (exclusive profiles, evaluated post-game)

After the game ends, the entire keystroke history is passed to `ProfileEngine.analyze()`. Profiles with `isCheater: true` are flagged in the database and suppressed from the leaderboard.

| Profile | Condition | Notes |
|---|---|---|
| **The Script Kiddie** | Any `Untrusted_` key | DOM-injected events have a distinct prefix |
| **The Hardware Spoof** | KPS > 300 AND entropy < 10% | Physically impossible key rate |
| **Suspected Cheater** | KPS > 80–150 AND entropy < 5–20% | Auto-clicker at moderate speed; score saved but flagged |
| **The Heartbeat** | Score > 500 AND strict uniform intervals | Exposes perfectly timed macro scripts (Metronome bots) |

High-entropy fast players (e.g., 238.7 KPS, 80% entropy with an N-key rollover keyboard) are **not flagged**. The entropy gate specifically protects legitimate forearm smashers.

---

## Username Obfuscation

The player codename stored in `localStorage` is obfuscated using Base64 + URI encoding:

```js
// Save
localStorage.setItem('besose_codename', btoa(encodeURIComponent(name)));
// Load
decodeURIComponent(atob(localStorage.getItem('besose_codename')));
```

This deters casual inspection and manual tampering via browser DevTools. A fallback handles legacy plaintext values written by older clients.

---

## Start-Game Rate Limiting

Players must wait **3 seconds** between games. This prevents stat flooding from rapidly submitting empty or minimal-key games. The cooldown is tracked server-side in `gameManager.js` and is cleaned up on disconnect.

---

## Outer HTTP Defenses

Beyond WebSocket logic, basic HTTP routes are shielded using:
1. **Helmet:** Enabled on all routes to instantly implement crucial security headers (x-dns-prefetch-control, x-frame-options, strict-transport-security, x-download-options, x-content-type-options, x-xss-protection, etc.) while disabling `X-Powered-By` so our tech stack remains concealed.
2. **Express Rate Limit:** HTTP endpoints cap at 60 requests per minute per IP to neutralize brute-forcing and heavy web crawlers.

---

## Score Authority

The server is the sole authoritative source of truth for score:

- The client maintains a local optimistic counter for UI feedback only
- The server's `game.score` accumulates accepted keys only
- `clientGameEnd` triggers the server to finalize — the server count is used, never the client's reported number
- Both Redis `ZSET` and PostgreSQL are updated atomically after game resolution. Flagged cheaters have their score negated in Redis (`-score`) to natively push them to the absolute bottom of the global rankings while preserving their stored metrics.

---

## Summary Table

| Threat | Layer that stops it |
|---|---|
| Raw Python/curl bot | Layer 1 (sec-fetch-site & Origin checks) |
| Multiple socket connections farming | Layer 1.5 (IP Limit of 3 Sockets) |
| Forged batch without token | Layer 2 (Token) |
| Flood bot (50,000+ KPS) | Layer 3 (Rate limiting) |
| Micro-interval bot (4ms batches) | Layer 4 (Frequency check) |
| Auto-clicker (moderate speed, 1 key) | Layer 5 (Entropy + KPS flag) |
| Macro script with perfect timing | Layer 5 (The Heartbeat flag) |
| DOM key injection from browser console | Layer 5 (Untrusted_ prefix flag) |
| Score inflation via client-side edit | Server authority (client count ignored) |
| Username tampering in localStorage | Base64 + URI obfuscation |
| Rest API Abuse & Stack Sniffing | Outer HTTP Defenses (Helmet + Rate Limit) |
