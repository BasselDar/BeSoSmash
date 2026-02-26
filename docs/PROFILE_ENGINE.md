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

## Profile Categories (101 Total)

### Cheater / Suspicious (Exclusive, `isCheater: true`)
| Profile | Trigger |
|---|---|
| The Ghost | Zero keys detected |
| The Script Kiddie | Any `Untrusted_` key (DOM injection) |
| The Hardware Spoof | KPS > 300 AND entropy < 10% |
| Suspected Cheater | KPS > 80–150 AND entropy < 5–20% — score saved, flagged |

### Rare / Exclusive
| Profile | Trigger |
|---|---|
| The Minimalist | Exactly 1 key pressed |
| The Rage Quitter | Alt + F4 detected |
| The Plagiarist | Heavy Ctrl+C / Ctrl+V ratio |
| The Glitch | F5 spam |
| The Konami Coder | Full Konami Code sequence |
| The Spacebar Supremacist | 100% spacebar |
| The Start Menu Sommelier | Windows key pressed, 5+ total keys |
| The Mobile Smasher | 100% touch input |

### Easter Eggs (Exclusive, typed string detection)
| Profile | Trigger |
|---|---|
| The Accidental Potato | Typed: POTATO |
| The SQL Dropper | Typed: DROP TABLE |
| The Sudo Override | Typed: SUDO |
| The Git Pusher | Typed: GIT PUSH |
| The Calculator Kid | Typed: 80085 |
| The Upside Down Genius | Typed: 5318008 |
| The Satanist Calculator | Typed: 7734 |
| The 69er | Typed: 69 (forces score to exactly 69) |
| The Any% Speedrunner | Typed: SPEEDRUN or FRAME |
| The HackerMan | Typed: HACK or MAINFRAME |
| The Botanist | Typed: 420 |
| The 2013 Throwback | Typed: YOLO |
| The Yeet Lord | Typed: YEET |
| The Dark Souls Veteran | Typed: GIT GUD |
| The Hopeful Romantic | Typed: SEND NUDES |
| The Confused | Typed: WTF |
| The Drama Queen | Typed: OMG |
| The Trash Talker | Typed: NOOB |
| The Disrespectful One | Typed: EZ |
| The Swear Jar | Profanity detected |
| The Instagram User | Racial slur detected |
| The Creator | Typed: BESOSE |
| The Meta Gamer | Typed: BESOSMASH |
| The Cry for Help | Typed: HELP |
| The Polite Menace | Typed: HELLO |
| The 1337 Fossil | Typed: LEET |
| The Keyboard Tourist | Typed: QWERTY |
| The E-Sports Veteran | Typed: GG |
| The Home Row Devotee | Typed: ASDF |
| The Nice Guy | Typed: NICE |

### Gamer Zones (Accumulative)
| Profile | Trigger |
|---|---|
| The Hybrid | Mix of touch + keyboard input |
| The Pianist | 4–5 simultaneous key chords at 8+ KPS |
| The Precision Striker | 25+ unique keys, max 2 repeats of any single key |
| The Drummer | 12+ KPS, max 2 keys per tick — fast but controlled |
| The Stenographer | 10+ KPS, 20+ unique keys, low repetition ratio |
| The Forearm Sweep | 6+ keys in a single tick, 20+ unique total |
| The Silverback | 3–5 keys in a single tick, dense but not full sweep |
| The Single-Key Murderer | Any key pressed 50+ times |
| The Center of Attention | 100% home row (ASDF / JKL;) |
| The BIOS Tech | F-key heavy |
| The Flash Gamer | Arrows + spacebar combo |
| The Arrow Key Boomer | 100% arrow keys |
| The Left-Handed Boomer | Arrow keys only |
| The MOBA Toxic | QWER dominance |
| The Osu! Addict | Z/X at high speed |
| The Fighting Game Scrub | Numpad + face key mashing |
| The MMO Raider | Large modifer + key rotation |
| The Crouch Spammer | Ctrl spam |
| The Bunny Hopper | Space > 15% of total keys |
| The Sweaty Tryhard | WASD > 20% of total keys |
| The Alt-Tabber | Alt heavy |

### Nerd / Tech (Accumulative)
| Profile | Trigger |
|---|---|
| The Vim Escaper | hjkl + Escape usage |
| The HTML Hacker | Punctuation dominance |
| The Regex Nightmare | Symbol chaos |
| The Hexadecimal | Numpad 0–9 + A–F pattern |
| The Terminal Typist | Enter spam |
| The Mad Scientist | Numpad operators |
| The Angry Accountant | Heavy numpad zone usage |

### Keyboard Zones (Accumulative)
| Profile | Trigger |
|---|---|
| The Bottom Feeder | ZXCVBNM row exclusive |
| The Top Row Tyrant | QWERTYUIOP row exclusive |
| The Vowel Enthusiast | 100% vowel keys |
| The Consonant Crusader | 0% vowel keys |
| The Vowel Vulture | Vowel-dominant |
| The Left-Handed Demon | Left-hand keys only |
| The Right-Handed Menace | Right-hand keys only |
| The Escape Artist | Escape spam |
| The Typosquatter | Backspace heavy |
| The Executioner | Enter spam |
| The Punctuation Pedant | Punctuation heavy |
| The QA Tester | Tab spam |
| The Screamer | CapsLock heavy |
| The IT Support | F-key spam |
| The Windows Key Victim | Windows key press, fewer than 5 total keys |
| The Screenshot Hoarder | PrintScreen used |
| The System Interrupter | Pause key used |
| The Scroll Lock Champion | Scroll Lock used |
| The Toggle Archaeologist | Insert key used |
| The Mod Squad | Pure modifier keys (Shift, Ctrl, Alt) |

### Pacing / Timing (Accumulative)
| Profile | Trigger |
|---|---|
| The Two-Finger Peck | Very low KPS (under 5) |
| The Stutterer | One key pressed 20%+ of all input |
| The Novelist | Consistent moderate-pace typing |
| The Pacifist | Delayed start (40+ empty ticks) |
| The AFK | Active only in first and last window |
| The Early Bird | Burned out before 30% of game elapsed |
| The Decaf Drinker | Active only in first 20% of game |
| The Anime Comeback | Explosion of activity in final stretch |
| The Distracted | Long mid-game gap |
| The Sloth | Under 2 KPS |
| The Panic Button | Default fallback — chaotic diverse smashing |

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
