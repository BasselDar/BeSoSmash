# The Profile Engine

The magic behind the BeSoSmash diagnosis screen lives in `utils/ProfileEngine.js`. Its job is to take the entire keystroke history of your run and infer who you are. Results are intentionally funny, chaotic, and occasionally judgmental.

## Architecture: Rule-Based Engine

The Profile Engine uses a **declarative, rule-based architecture** — a flat `PROFILES` array rather than a monolithic if-else chain. This makes adding new profiles a single object insertion.

### Two-Phase Design

**Phase 1: `calculateStats(keyHistory, mode)`**
A single O(N) pass over the keystroke matrix produces a `stats` object with every metric needed for profiling:
- Hit counters per zone (WASD, numpad, arrows, vowels, F-keys, modifiers, etc.)
- Shannon Entropy (key distribution randomness, 0–100%)
- Timing data (first/last hit tick, burst patterns, late/early start)
- Typed string reconstruction (for Easter Egg detection)
- Cheat signals (untrusted events, Konami Code tracking)

**Phase 2: `analyze(keyHistory, mode)`**
Iterates over the `PROFILES` array. Each profile is a plain object:

```javascript
{
    title: "The Flash Gamer",
    flavor: "Playing this like it's a 2004 browser game on Miniclip.",
    isExclusive: false,     // true = return immediately, false = accumulate
    isCheater: false,       // true = flag and reject score
    condition: (stats) => stats.arrowHits > 0 && stats.spaceHits > 0 && ...
}
```

- **Exclusive profiles** (`isExclusive: true`) short-circuit immediately. Used for cheater detections, Easter Eggs, and rare hard-trigger behaviours.
- **Accumulative profiles** collect into an array — a player can earn multiple per run.
- `TOTAL_PROFILES` is dynamically generated from the array and can never fall out of sync.

### Adding a Profile

A single object insertion in `ProfileEngine.js`, then one line in the `profileCategoryMap` in `public/js/utils/profileData.js` for the colour theme:

```javascript
// utils/ProfileEngine.js — add to PROFILES array
{
    title: "My New Profile",
    flavor: "Some funny text.",
    isExclusive: false,
    condition: (stats) => stats.someMetric > someThreshold
}

// public/js/utils/profileData.js — add to profileCategoryMap
'My New Profile': 'gamer',
```

No hardcoded lists. No count constants to update.

---

## All Profiles

For a full list of all 110 available profiles, their triggers, and flavor texts, please refer to the [Profile Encyclopedia (ALL_PROFILES.md)](./ALL_PROFILES.md).

---

## Entropy

Shannon Entropy measures keystroke randomness across your run:

```javascript
let entropy = 0;
for (const key in keyCounts) {
    const p = keyCounts[key] / totalKeys;
    entropy -= p * Math.log2(p);
}
```

Normalized to 100% at 6.0 bits (64 unique equally-distributed keys). Higher entropy = broader keyboard coverage. Used as a primary signal to distinguish legitimate fast players from auto-clickers.

---

## Profile Collection

Profiles accumulate across all sessions. Every unique profile earned is merged into the persistent `profiles` JSON column in PostgreSQL. The total count feeds the Smash Score formula (`Profiles × 420`), rewarding exploration.
