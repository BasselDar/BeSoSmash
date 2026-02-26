# System Architecture

BeSoSmash is designed for highly concurrent, low-latency interactions. The architecture is split between a standard HTTP Express application for view serving and REST APIs, and a WebSocket layer for real-time game state synchronization.

## 1. The HTTP Layer
The HTTP layer is handled by **Express** and configured in `app.js`. It delegates routing to `routes/gameRoutes.js` and view rendering to `controllers/httpController.js`.
- **Views**: The application uses EJS for server-side rendering (`views/classic.ejs`, `views/blitz.ejs`, etc.).
- **REST API**: There is an endpoint at `/api/leaderboard` for paginated fetching of global scores.

## 2. The WebSocket Layer (Real-Time Engine)
Located in `controllers/socketController.js`, this handles the entire game lifecycle.
- **Connection & Lobby**: A user connects via Socket.io. Validates the `Origin` header (Anti-Cheat Layer 1).
- **Event: `startGame`**: Starts a server-side timer (e.g., 5 seconds for Classic) and generates a unique game session token.
- **Event: `keyPressBatch`**: The client batches typed keys locally. The server validates the token (Anti-Cheat Layer 2), enforces a hard elapsed-time speed limit of 300 KPS + 300 burst (Anti-Cheat Layer 3), and checks for impossible flush frequencies < 15ms (Anti-Cheat Layer 4).
- **Event: `clientGameEnd`**: Used merely as a signal, but ignored for scoring.
- **Game End Resolution**: Upon server timeout, the server halts accepting payloads. It runs the keystroke matrix through the `ProfileEngine.js` for cheating validation (Anti-Cheat Layer 5) and personality diagnosis.

## 3. The Game Manager (`controllers/gameManager.js`)
A centralized state manager for active game sessions. Each connected socket has an associated `GameState` object tracking:
- Player name (from Base64 obfuscated localStorage), mode selection, and active status.
- The keystroke `keyHistory` matrix and current score.
- Anti-cheat state: session token, batch frequency tracker, and violation count.

## 4. The Database Layer (`models/scoreModel.js`)
BeSoSmash utilizes a dual-database pattern for optimal performance:
1. **PostgreSQL (Source of Truth)**: Permanently stores `id`, `name`, `score`, `mode`, `kps`, `entropy`, `smash_score`, and `profiles` (as JSON). Provides rigid SQL row counts for accurate global rank lookups.
2. **Redis (Performance Cache)**: Bootstrapped on app initialization via cache warm-up. Used specifically as a Sorted Set (`ZSET`) to rapidly rank users and maintain an instant-load top leaderboard without slamming the PostgreSQL server.

### Smart Score Saving
The score model implements intelligent update logic to protect player progress:

| Scenario | Behavior |
|---|---|
| **New high score** | Overwrites everything: `score`, `kps`, `entropy`, `smash_score`, and `profiles`. |
| **Lower score + new profiles** | Only updates `profiles` and recalculates `smash_score` using the **old best stats** + the **new profile count**. Raw stats are preserved. |
| **Lower score + no new profiles** | No database write. Score is silently discarded. |

This ensures a player's leaderboard position **never decreases** from a bad run, while still rewarding profile discovery.

### Profile Collection
Profiles are accumulated across all game sessions. Every unique profile a player earns is merged into a persistent JSON array stored in the `profiles` column. Duplicate profiles are deduplicated by title. The total profile count contributes to the Smash Score via the `× 420` multiplier.

## 5. Calculating The Smash Score (`utils/scoring.js`)
Your rank isn't purely determined by how many keys you press. The `smash_score` is a holistic representation of your performance:

```javascript
Smash Score = (Keys × 1337) + (Entropy² × 1.7) + (KPS × 69) + (Profiles Earned × 420)
```

Where:
- `Keys` = Raw keystroke count.
- `Entropy` = The Shannon entropy of the keyboard traversal (0.0 to 100.0). High entropy means using every part of the keyboard.
- `KPS` = Keys Per Second.
- `Profiles Earned` = Cumulative count of unique personality profiles collected across all sessions.

## 6. Project Structure

```
BeSoSmash/
├── app.js                    # Express + Socket.io bootstrap
├── controllers/
│   ├── httpController.js     # EJS view rendering
│   ├── socketController.js   # WebSocket game lifecycle
│   └── gameManager.js        # Game state management
├── models/
│   ├── db.js                 # PostgreSQL + Redis connection
│   └── scoreModel.js         # Score CRUD + smart save logic
├── utils/
│   ├── ProfileEngine.js      # Rule-based personality profiler
│   └── scoring.js            # Smash Score formula
├── routes/
│   └── gameRoutes.js         # HTTP routing
├── public/
│   ├── js/
│   │   ├── core/             # state.js, socket.js
│   │   ├── game/             # engine.js, input.js, visuals.js, summary.js, share.js
│   │   ├── ui/               # toast.js, pagination.js, profiles.js
│   │   └── utils/            # profileData.js
│   └── css/                  # Stylesheets
├── views/                    # EJS templates
├── tests/                    # Test suites
├── scripts/                  # Utility scripts
└── docs/                     # Documentation
```
