# The Profile Engine 🧠

The magic behind the BeSoSmash diagnosis screen relies on `utils/ProfileEngine.js`. Its job is to take the entire topological history of your keystrokes and infer who you are. The results are intentionally funny, chaotic, and occasionally judgmental.

## How it Works

The client records every keydown event and collects them in an array, emitting them asynchronously per 'tick' to the server. The server builds an array of arrays representing each tick containing simultaneous keys.
Upon game over, the matrix is evaluated sequentially:

1. **Anti-Cheat Layer & Rejection (Exclusive Rules)**
   - Profiles like "The Script Kiddie" (detects simulated DOM events carrying `Untrusted_` tags).
   - "The Metronome" detects macros by checking the cadence of the ticks. If perfectly identical distributions exist across intervals, you are ousted.
   - "The Hardware Spoof" immediately flags your score if keys typed exceed physically possible USB hardware polling limits.
   As these are exclusive, they immediately halt profiling and return. Your session is not saved to the DB.

2. **Easter Eggs (Exclusive Rules)**
   - Rare and highly specific sequences result in Easter Egg profiles.
   - Example 1: `Alt + F4` yields "The Rage Quitter".
   - Example 2: Typing `80085` triggers "The Calculator Kid".
   - Example 3: Pressing the Konami Code arrows results in "The Konami Coder".
   - Example 4: Touching the Windows Key triggers "The Start Menu Sommelier".

3. **Accumulative Profiling Layer**
   If you aren't a cheater, the engine loops through your keystrokes globally and aggregates hits per "Zone" (WASD Zone, Numpad Zone, Vowels, Punctuations, Top Row, Bottom Row).

   It returns an array of ALL matched habits, creating your combined personality profile:
   - **Gamer Zones:** Checks if you're a "MOBA Toxic" spanning QWER, or "The Flash Gamer" strictly spamming arrows and spacebar.
   - **Habits & Workspaces:** Checks if you're "The QA Tester" for slamming Tab, or "The Vim Escaper" for spamming `Esc` with hjkl.
   - **Physics / Anatomy:** Evaluates if you just wiped your forearm across the board based on unique lateral keys ("The Forearm Sweep").
   - **Pacing Metrics:** Identifies "The Early Bird" (ran out of stamina) or "The Anime Comeback" (started mashing at the last second).

## Entropy

The Profile Engine calculates Shannon Entropy to determine randomness:
```javascript
let entropy = 0;
for (const key in keyCounts) {
    const probability = keyCounts[key] / totalKeys;
    entropy -= probability * Math.log2(probability);
}
```
A higher entropy indicates you actively smashed across the entire board, whereas lower entropy implies you mashed only a select few keys, like WASD or the spacebar.
