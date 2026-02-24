# The Profile Engine

The magic behind the BeSoSmash diagnosis screen relies on `utils/ProfileEngine.js`. Its job is to take the entire topological history of your keystrokes and infer who you are. The results are intentionally funny, chaotic, and occasionally judgmental.

## Architecture: Rule-Based Engine (Strategy Pattern)

The Profile Engine uses a **declarative, rule-based architecture** rather than a monolithic if-else chain. This makes adding new profiles trivial and keeps the logic clean.

### Two-Phase Design

**Phase 1: `calculateStats(keyHistory, mode)`**
A single O(N) pass over the entire keystroke matrix produces a comprehensive `stats` object containing every metric needed for profiling:
- Hit counters per zone (WASD, numpad, arrows, vowels, F-keys, modifiers, etc.)
- Entropy calculation (Shannon Entropy)
- Timing data (first/last hit tick, gaps, fast start, late start)
- Typed string reconstruction (for Easter Egg detection)
- Cheat signals (untrusted events, Konami Code tracking)

**Phase 2: `analyze(keyHistory, mode)`**
Iterates over a flat `PROFILES` array. Each profile is a plain object:

```javascript
{
    title: "The Flash Gamer",
    flavor: "Playing this like it's a 2004 browser game on Miniclip.",
    isExclusive: false,     // true = immediately return, false = accumulate
    isCheater: false,       // true = reject the score
    condition: (stats) => stats.arrowHits > 0 && stats.spaceHits > 0 && ...
}
```

- **Exclusive profiles** (`isExclusive: true`) short-circuit the loop and return immediately. These are cheater detections and rare Easter Eggs.
- **Accumulative profiles** collect into an array — a player can earn multiple in a single run.
- The `TOTAL_PROFILES` list is **dynamically generated** from the array, so it can never fall out of sync.

### Adding a New Profile
Adding a new profile is a single object insertion:
```javascript
{
    title: "My New Profile",
    flavor: "Some funny text.",
    isExclusive: false,
    condition: (stats) => stats.someMetric > someThreshold
}
```
No need to update any hardcoded lists or counts.

## Profile Categories

### 1. Anti-Cheat Layer (Exclusive)
- **"The Script Kiddie"** — Detects simulated DOM events carrying `Untrusted_` tags.
- **"The Hardware Spoof"** — Flags runs exceeding physically possible USB hardware polling limits (300+ KPS with near-zero entropy).
- **"Suspected Cheater"** — Grey zone detection (score saves, but flagged). Triggers at 80-150+ KPS with suspiciously low entropy.

### 2. Easter Eggs (Exclusive)
Rare and highly specific sequences result in Easter Egg profiles:
- `Alt + F4` → "The Rage Quitter"
- Typing `80085` → "The Calculator Kid"
- Konami Code → "The Konami Coder"
- Windows Key → "The Start Menu Sommelier"
- Typed words: `POTATO`, `DROP TABLE`, `SUDO`, `GIT PUSH`, `SKIBIDI`, `YOLO`, `YEET`, `420`, `69` (forces score to 69), and many more.

### 3. Gamer Zones (Accumulative)
- **MOBA Toxic** — QWER dominance
- **Flash Gamer** — Arrows + spacebar only
- **Osu! Addict** — Z/X at extreme speed
- **Fighting Game Scrub** — D-pad + face button mashing
- **Sweaty Tryhard** — WASD claw grip
- **Bunny Hopper** — Spacebar abuse

### 4. Nerd / Productivity Zones (Accumulative)
- **Vim Escaper** — hjkl + Escape
- **HTML Hacker** — Punctuation dominance
- **Angry Accountant** — Numpad zone
- **Terminal Typist** — Enter spamming
- **Regex Nightmare** — Symbol chaos

### 5. Keyboard Habits (Accumulative)
- **Left/Right-Handed Demon/Menace** — One-sided keyboard usage
- **Vowel Vulture / Consonant Crusader** — Letter distribution analysis
- **Escape Artist** — Panic button mashing
- **Screamer** — CapsLock abuse

### 6. Pacing & Timing (Accumulative)
- **Pacifist** — Delayed start (40+ ticks late)
- **Early Bird** — Burned out in the first 30% of the game
- **Anime Comeback** — Explosion of activity in the final stretch
- **Sloth** — Under 2 KPS

### 7. Default Fallback
If no accumulative profiles match, the player receives **"The Panic Button"** — pure, unfiltered chaos.

## Profile Collection

Profiles are **accumulated across all game sessions**. Every unique profile a player earns is merged into a persistent collection stored in the database. The total count of unique profiles contributes to the Smash Score formula via the `Profiles × 420` multiplier, rewarding exploration and variety.

## Entropy

The Profile Engine calculates Shannon Entropy to determine randomness:
```javascript
let entropy = 0;
for (const key in keyCounts) {
    const probability = keyCounts[key] / totalKeys;
    entropy -= probability * Math.log2(probability);
}
```
A higher entropy indicates you actively smashed across the entire board, whereas lower entropy implies you mashed only a select few keys, like WASD or the spacebar. The engine normalizes to 100% at 6.0 bits of information (64 unique equally-distributed keys).
