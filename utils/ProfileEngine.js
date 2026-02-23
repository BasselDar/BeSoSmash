const wasdZone = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'KeyQ', 'KeyE'
]);

const numpadZone = new Set([
    'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
    'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
    'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply',
    'NumpadDivide', 'NumpadEnter', 'NumpadDecimal'
]);

const rows = [
    new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP']),
    new Set(['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon']),
    new Set(['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period'])
];

const arrowZone = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

// New Zones for absurd profiles
const vowels = new Set(['KeyA', 'KeyE', 'KeyI', 'KeyO', 'KeyU']);
const fKeys = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']);
const punctuation = new Set(['Comma', 'Period', 'Slash', 'Semicolon', 'Quote', 'BracketLeft', 'BracketRight', 'Minus', 'Equal', 'Backquote', 'Backslash']);
const deletes = new Set(['Backspace', 'Delete']);
const enters = new Set(['Enter', 'NumpadEnter']);
const modifiers = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

const copyPasteKeys = new Set(['KeyC', 'KeyV', 'ControlLeft', 'ControlRight', 'MetaLeft']);
const mathOperators = new Set(['NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide', 'Equal', 'Minus']);
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// New Expansion Zones
const mobaZone = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyD', 'KeyF']);
const vimZone = new Set(['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Escape']);
const osZone = new Set(['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']);
const mediaZone = new Set(['MediaTrackNext', 'MediaTrackPrevious', 'MediaStop', 'MediaPlayPause', 'AudioVolumeMute', 'AudioVolumeDown', 'AudioVolumeUp']);
const dpadFaceZone = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'KeyC', 'KeyA', 'KeyS', 'KeyD']); // Generic fighting game default map

class ProfileEngine {
    static analyze(keyHistory, mode) {
        if (!keyHistory || keyHistory.length === 0) {
            return {
                profiles: [{
                    title: "The Ghost",
                    flavor: "Did you even touch the keyboard? Zero keys detected. Please wake up."
                }],
                entropy: 0.0
            };
        }

        let totalKeys = 0;
        let wasdHits = 0;
        let numpadHits = 0;
        let spaceHits = 0;
        let arrowHits = 0;
        let uniqueKeysSet = new Set();

        let metronomeCheats = 0;
        let maxRowSmashInSingleTick = 0;

        // New Metric Counters
        let vowelHits = 0;
        let fKeyHits = 0;
        let punctuationHits = 0;
        let deleteHits = 0;
        let enterHits = 0;
        let modifierHits = 0;
        let escHits = 0;
        let topRowHits = 0;
        let bottomRowHits = 0;
        let keyCounts = {};

        // New Expansion Trackers
        let mobaHits = 0;
        let vimHits = 0;
        let osHits = 0;
        let mediaHits = 0;
        let dpadFaceHits = 0;
        let typedString = "";
        let tickTimestamps = []; // For variance/stamina tracking

        let hasAlt = false;
        let hasF4 = false;
        let copyPasteHits = 0;
        let tabHits = 0;
        let capsLockHits = 0;
        let mathHits = 0;

        let konamiIndex = 0;
        let konamiAchieved = false;

        let firstHitTick = -1;
        let lastHitTick = -1;
        let currentTickIndex = 0;

        // Analyze over history
        for (const tick of keyHistory) {
            currentTickIndex++;
            if (!Array.isArray(tick)) continue;

            const tickCount = tick.length;
            if (tickCount === 0) continue;

            totalKeys += tickCount;

            if (currentTickIndex - lastHitTick > 5 && lastHitTick !== -1) {
                // Large gap between ticks (pause tracking)
                tickTimestamps.push(currentTickIndex);
            } else {
                tickTimestamps.push(currentTickIndex);
            }

            // For gorilla detection: count how many keys in this tick belong to the same row
            let rowCounts = [0, 0, 0];

            for (const key of tick) {
                uniqueKeysSet.add(key);
                keyCounts[key] = (keyCounts[key] || 0) + 1;

                if (wasdZone.has(key)) wasdHits++;
                if (numpadZone.has(key)) numpadHits++;
                if (key === 'Space') spaceHits++;
                if (arrowZone.has(key)) arrowHits++;

                // Track new zones
                if (vowels.has(key)) vowelHits++;
                if (fKeys.has(key)) fKeyHits++;
                if (punctuation.has(key)) punctuationHits++;
                if (deletes.has(key)) deleteHits++;
                if (enters.has(key)) enterHits++;
                if (modifiers.has(key)) modifierHits++;
                if (key === 'Escape') escHits++;

                if (mobaZone.has(key)) mobaHits++;
                if (vimZone.has(key)) vimHits++;
                if (osZone.has(key)) osHits++;
                if (mediaZone.has(key)) mediaHits++;
                if (dpadFaceZone.has(key)) dpadFaceHits++;

                // Build a string of literal letters for word matching (POTATO, SUDO, etc)
                if (key.startsWith('Key')) typedString += key.charAt(3);
                if (key === 'Space') typedString += ' ';
                if (key.startsWith('Digit')) typedString += key.charAt(5);
                if (key.startsWith('Numpad') && key.length === 7) typedString += key.charAt(6);

                if (key === 'Tab') tabHits++;
                if (key === 'CapsLock') capsLockHits++;
                if (mathOperators.has(key)) mathHits++;

                if (key === 'AltLeft' || key === 'AltRight') hasAlt = true;
                if (key === 'F4') hasF4 = true;
                if (copyPasteKeys.has(key)) copyPasteHits++;

                // Konami Tracker
                if (!konamiAchieved) {
                    if (key === konamiCode[konamiIndex]) {
                        konamiIndex++;
                        if (konamiIndex === konamiCode.length) konamiAchieved = true;
                    } else if (key === konamiCode[0]) {
                        konamiIndex = 1; // Restart if they break the combo but start over immediately
                    } else {
                        konamiIndex = 0; // Combo broken
                    }
                }

                if (rows[0].has(key)) { rowCounts[0]++; topRowHits++; }
                if (rows[1].has(key)) { rowCounts[1]++; }
                if (rows[2].has(key)) { rowCounts[2]++; bottomRowHits++; }
            }

            // Track first and last activity
            if (firstHitTick === -1) firstHitTick = currentTickIndex;
            lastHitTick = currentTickIndex;

            // Track the maximum row smash in a single 100ms tick
            const maxInTick = Math.max(...rowCounts);
            if (maxInTick > maxRowSmashInSingleTick) {
                maxRowSmashInSingleTick = maxInTick;
            }

            // Metronome detection
            if (tickCount > 6) {
                metronomeCheats++;
            }
        }

        if (totalKeys === 0) {
            return {
                profiles: [{
                    title: "The Ghost",
                    flavor: "Did you even touch the keyboard? Zero keys detected. Please wake up."
                }],
                entropy: 0.0
            };
        }

        const uniqueKeys = uniqueKeysSet.size;

        // Find most repeated key
        let maxSingleKeyCount = 0;
        let mostRepeatedKey = '';
        for (let k in keyCounts) {
            if (keyCounts[k] > maxSingleKeyCount) {
                maxSingleKeyCount = keyCounts[k];
                mostRepeatedKey = k;
            }
        }

        // Calculate Shannon Entropy early so we can return it with the profile
        let entropy = 0;
        if (totalKeys > 0) {
            for (const key in keyCounts) {
                const probability = keyCounts[key] / totalKeys;
                entropy -= probability * Math.log2(probability);
            }
        }
        const normalizedEntropy = Math.min((entropy / 6.0) * 100, 100).toFixed(1);

        const matchedProfiles = [];
        const addProfile = (title, flavor) => {
            matchedProfiles.push({ title, flavor });
        };

        // 0. The Minimalist
        if (totalKeys === 1) {
            return { profiles: [{ title: "The Minimalist", flavor: "You pressed exactly one key. Peak efficiency. Zero effort. Maximum gigachad energy." }], entropy: normalizedEntropy };
        }

        // --- 1. CHEATERS / MACROS (Highest Priority) ---
        if (totalKeys > 500) {
            return { profiles: [{ title: "The Hardware Spoof", flavor: "Your keyboard physically cannot send data this fast. Busted." }], entropy: normalizedEntropy };
        }
        if (metronomeCheats > 8) {
            return { profiles: [{ title: "The Metronome", flavor: "Exactly 8 inputs every 100ms. Nice macro, nerd. Invalidated." }], entropy: normalizedEntropy };
        }
        if (totalKeys > 150 && uniqueKeys < 7 && mode === 'classic') {
            return { profiles: [{ title: "The Script Kiddie", flavor: "Wow, perfect rhythm and impossible speed. Exactly the same inputs without human error. Nice macro, nerd. Your score has been invalidated... mentally." }], entropy: normalizedEntropy };
        }

        // --- 2. SPECIAL / EXACT MEMES ---
        if (hasAlt && hasF4) {
            addProfile("The Rage Quitter", "Alt+F4? Seriously? If you're going to rage quit a game about typing fast, at least unplug your keyboard.");
        }
        if (copyPasteHits / totalKeys > 0.8 && uniqueKeys <= 5) {
            addProfile("The Plagiarist", "Ctrl+C, Ctrl+V. Did you really just try to copy-paste your way to victory? Stack Overflow can't help you here.");
        }
        if (keyCounts['F5'] && keyCounts['F5'] / totalKeys > 0.5) {
            addProfile("The Glitch", "F5 F5 F5 F5. You're trying to refresh reality but you're just stuck in the matrix. Wake up.");
        }
        if (konamiAchieved) {
            addProfile("The Konami Coder", "Up, Up, Down, Down, Left, Right, Left, Right, B, A. Infinite lives unlocked! Just kidding, you still have to pay taxes tomorrow.");
        }
        if (hasAlt && tabHits / totalKeys > 0.10) {
            addProfile("The Alt-Tabber", "Boss walking by? You hit Alt-Tab more times than actual keys. Your 'spreadsheets' are safe.");
        }
        if (typedString.includes('POTATO')) {
            addProfile("The Accidental Potato", "A million monkeys on a typewriter, and you typed POTATO.");
        }
        if (typedString.includes('DROP TABLE')) {
            addProfile("The SQL Dropper", "Did you just try to drop my production database? Nice try.");
        }
        if (typedString.includes('SUDO')) {
            addProfile("The Sudo Override", "You don't have admin privileges here.");
        }
        if (typedString.includes('GIT PUSH')) {
            addProfile("The Git Pusher", "Force pushing to main branch on a Friday? Pure chaos.");
        }
        if (typedString.includes('FUCK') || typedString.includes('SHIT') || typedString.includes('BITCH') || typedString.includes('DAMN') || typedString.includes('ASS')) {
            addProfile("The Swear Jar", "Watch your language! This is a Christian Minecraft server.");
        }

        // --- 3. EXTREME HARDWARE / SPAM ---
        if (maxRowSmashInSingleTick >= 6 && uniqueKeys > 20) {
            addProfile("The Forearm Sweep", "Forearm slam detected. The hardware is begging for mercy.");
        }
        if (maxRowSmashInSingleTick >= 3 && uniqueKeys > 15 && totalKeys < 60) {
            addProfile("The Silverback", "No human fingers move like this. You either rolled your face across the desk, or you just forearm-slammed your mechanical keyboard. The hardware is begging for mercy.");
        }
        if (maxSingleKeyCount >= 50) {
            addProfile("The Single-Key Murderer", "Please apologize to your key. Its warranty is void.");
        }
        let centerHits = (keyCounts['KeyG'] || 0) + (keyCounts['KeyH'] || 0) + (keyCounts['KeyY'] || 0) + (keyCounts['KeyB'] || 0);
        if (centerHits > 0 && centerHits === totalKeys) {
            addProfile("The Center of Attention", "Laser-focused on the dead center. Tunnel vision at its finest.");
        }
        if (fKeyHits > 0 && fKeyHits === totalKeys) {
            addProfile("The BIOS Tech", "Are you trying to boot into Safe Mode? Coward.");
        }

        // --- 4. GAMER ZONES ---
        if (arrowHits > 0 && spaceHits > 0 && arrowHits + spaceHits === totalKeys) {
            addProfile("The Flash Gamer", "Playing this like it's a 2004 browser game on Miniclip.");
        }
        if (arrowHits > 0 && arrowHits === totalKeys) {
            addProfile("The Arrow Key Boomer", "WASD was invented 20 years ago. Let go of the arrow keys, grandpa.");
        }
        if (arrowHits / totalKeys > 0.20) {
            addProfile("The Left-Handed Boomer", "You are playing this on the arrow keys. Either you are left-handed, or you boldly refused to adapt to standard gaming controls after 1998.");
        }
        if (mobaHits / totalKeys > 0.6) {
            addProfile("The MOBA Toxic", "Q, W, E, R dominance. You just tried to pop your ultimate, didn't you? Go back to the fountain.");
        }
        if (totalKeys > 80 && uniqueKeys <= 2 && (keyCounts['KeyZ'] || 0) + (keyCounts['KeyX'] || 0) > 80) {
            addProfile("The Osu! Addict", "Tapping Z and X at the speed of light. Have you blinked since 2019?");
        }
        if (dpadFaceHits / totalKeys > 0.6) {
            addProfile("The Fighting Game Scrub", "Just mashing heavy punch and hoping for a combo, huh?");
        }
        if (topRowHits / totalKeys > 0.8 && uniqueKeys > 5) {
            addProfile("The MMO Raider", "Cycling through your 40-button rotation. Too bad the boss enraged.");
        }
        if ((keyCounts['ControlLeft'] || 0) + (keyCounts['KeyC'] || 0) > totalKeys * 0.3) {
            addProfile("The Crouch Spammer", "Teabagging the keyboard won't give you a higher score.");
        }
        if (spaceHits / totalKeys > 0.15) {
            addProfile("The Bunny Hopper", "Your spacebar is currently holding on by a single, snapping plastic thread. You can stop jumping now. You're already dead.");
        }
        if (wasdHits / totalKeys > 0.20) {
            addProfile("The Sweaty Tryhard", "We get it, you are hardstuck Platinum in Valorant. Your hands naturally form a claw over the WASD keys. Please go take a shower.");
        }

        // --- 5. NERD / PRODUCTIVITY ZONES ---
        if (vimHits / totalKeys > 0.4 && escHits > 0) {
            addProfile("The Vim Escaper", "You can't :wq your way out of this one.");
        }
        if (punctuationHits / totalKeys > 0.4 && ((keyCounts['Comma'] || 0) > 0 || (keyCounts['Period'] || 0) > 0 || (keyCounts['Slash'] || 0) > 0)) {
            addProfile("The HTML Hacker", "You're closing tags faster than your browser is crashing.");
        }
        let regexHits = (keyCounts['Digit6'] || 0) + (keyCounts['Digit4'] || 0) + (keyCounts['Digit8'] || 0) + (keyCounts['NumpadMultiply'] || 0) + (keyCounts['Equal'] || 0) + (keyCounts['NumpadAdd'] || 0) + (keyCounts['Slash'] || 0) + (keyCounts['Backslash'] || 0);
        if (regexHits > 3) {
            addProfile("The Regex Nightmare", "Nobody knows what those symbols do, including you.");
        }
        let isHex = typedString.length > 5;
        const hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        for (let i = 0; i < typedString.length; i++) {
            if (!hexChars.includes(typedString[i])) isHex = false;
        }
        if (isHex && typedString.length > 5 && !typedString.includes(' ')) {
            addProfile("The Hexadecimal", "Speaking strictly in base-16. You are a robot.");
        }
        if (enterHits / totalKeys > 0.3 && totalKeys < 20) {
            addProfile("The Terminal Typist", "Waiting for the command prompt to execute your garbage.");
        }
        if (mathHits / totalKeys > 0.10) {
            addProfile("The Mad Scientist", "Plus, minus, multiply, divide. You're out here solving the Riemann Hypothesis instead of playing the game.");
        }
        if (numpadHits / totalKeys > 0.35) {
            addProfile("The Angry Accountant", "Did the taxes not balance this year? You completely ignored the letters and attacked the calculator zone with lethal intent. HR has been notified.");
        }

        if (bottomRowHits / totalKeys > 0.35 && uniqueKeys > 5) {
            addProfile("The Bottom Feeder", "You stayed rigidly glued to the ZXCVBNM row. Did you spill coffee on the top half of your keyboard, or are you just afraid of heights?");
        }
        if (topRowHits / totalKeys > 0.35 && uniqueKeys > 5) {
            addProfile("The Top Row Tyrant", "QWERTYUIOP. You dominated the top row exclusively. A minimalist approach, but mathematically inefficient.");
        }

        // --- 6. KEYBOARD HABITS ---
        if (vowelHits > 0 && vowelHits === totalKeys) {
            addProfile("The Vowel Enthusiast", "Are you trying to buy a vowel? This isn't Wheel of Fortune.");
        }
        if (vowelHits === 0 && totalKeys > 5) {
            addProfile("The Consonant Crusader", "Wh nds vwls nywy? Y sk t ths gm.");
        }
        if (vowelHits / totalKeys > 0.25) {
            addProfile("The Vowel Vulture", "A, E, I, O, U... and sometimes Y? You strictly targeted vowels. We're not playing Wheel of Fortune, you don't need to buy them.");
        }
        let leftSideKeys = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']);
        let rightSideKeys = new Set(['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyN', 'KeyM']);
        let leftHits = 0, rightHits = 0;
        for (const k in keyCounts) {
            if (leftSideKeys.has(k)) leftHits += keyCounts[k];
            if (rightSideKeys.has(k)) rightHits += keyCounts[k];
        }
        if (leftHits > 0 && rightHits === 0 && totalKeys > 10) {
            addProfile("The Left-Handed Demon", "Right hand was busy? We won't ask.");
        }
        if (rightHits > 0 && leftHits === 0 && totalKeys > 10) {
            addProfile("The Right-Handed Menace", "Refusing to use the left side. Unbalanced.");
        }
        if (escHits / totalKeys > 0.08) {
            addProfile("The Escape Artist", "You spent the entire match mashing Escape. Are you trying to open the pause menu? Are you trying to flee the simulation? There is no escape.");
        }
        if (deleteHits / totalKeys > 0.10) {
            addProfile("The Typosquatter", "You hit Backspace more times than a regretful ex texting at 2 AM. You can't un-type the chaos, just embrace it.");
        }
        if (enterHits / totalKeys > 0.10) {
            addProfile("The Executioner", "Smashing the Enter key won't send your messages faster, and it certainly won't help you win. Stop trying to submit the game.");
        }
        if (punctuationHits / totalKeys > 0.15) {
            addProfile("The Punctuation Pedant", "Commas, periods, semicolons... Did you accidentally open your IDE? The compiler is going to reject your high score.");
        }
        if (tabHits / totalKeys > 0.10) {
            addProfile("The QA Tester", "Smashing Tab. Are you checking the form accessibility index? The UI is fine, please stop filing Jira tickets.");
        }
        if (capsLockHits > 2) {
            addProfile("The Screamer", "WHY ARE WE YELLING? You hit CapsLock repeatedly. Your keyboard doesn't have a volume dial, but you certainly found a way to shout.");
        }
        if (fKeyHits / totalKeys > 0.10) {
            addProfile("The IT Support", "F1, F5, F12... Are you trying to refresh the page or open the developer console? Did you try turning the keyboard off and on again?");
        }
        if (osHits > 0 && totalKeys < 5) {
            addProfile("The Windows Key Victim", "Start menu opened, didn't it? Skill issue.");
        }
        if (modifierHits / totalKeys > 0.10) {
            addProfile("The Mod Squad", "Shift, Ctrl, Alt... You know these keys don't actually DO anything on their own, right? You're just boldly modifying nothing.");
        }

        // --- 7. STUTTERING / SLOW ---
        if (totalKeys > 20 && uniqueKeys <= 2 && maxSingleKeyCount < totalKeys * 0.8) {
            addProfile("The Two-Finger Peck", "Typing like a confused detective in a 1990s movie.");
        }
        if (maxSingleKeyCount / totalKeys > 0.20 && maxSingleKeyCount > 5) {
            addProfile("The Stutterer", `You pressed [${mostRepeatedKey.replace('Key', '')}] exactly ${maxSingleKeyCount} times. Are you okay? Is that your emotional support key?`);
        }
        if (uniqueKeys > 15 && maxRowSmashInSingleTick < 4) {
            addProfile("The Novelist", "Are you typing 'pls let me win' in the chat? Your keystroke distribution looks like you just wrote a 3-page essay on Shrek lore instead of fighting.");
        }

        // --- 8. PACING & TIMING (Afks, Early Birds) ---
        const expectedTicks = mode === 'blitz' ? 20 : 50;
        const gameSeconds = mode === 'blitz' ? 2 : 5;
        let finalKPS = totalKeys / gameSeconds;

        if (totalKeys > 0 && firstHitTick > 40) {
            addProfile("The Pacifist", "Refusing to fight. Gandhi would be proud; your score is not.");
        }
        if (firstHitTick > expectedTicks * 0.7) {
            addProfile("The AFK", "You were completely dead for 80% of the game and woke up at the very end in a panic. Ping 999ms.");
        }
        if (lastHitTick < expectedTicks * 0.3) {
            addProfile("The Early Bird", "You smashed the keyboard for the first half-second and then just gave up entirely. Stamina issue?");
        }
        let fastStart = 0;
        for (let i = 0; i < 10 && i < keyHistory.length; i++) {
            if (Array.isArray(keyHistory[i])) fastStart += keyHistory[i].length;
        }
        if (fastStart > 30 && (totalKeys - fastStart) < 5 && expectedTicks === 50) {
            addProfile("The Decaf Drinker", "You ran out of gas 1 second in. Pathetic stamina.");
        }
        let lateStart = 0;
        for (let i = 40; i < keyHistory.length; i++) {
            if (Array.isArray(keyHistory[i])) lateStart += keyHistory[i].length;
        }
        if (lateStart > 40 && (totalKeys - lateStart) < 10 && expectedTicks === 50) {
            addProfile("The Anime Comeback", "You unlocked your final form at the very last second.");
        }
        if (tickTimestamps.length > 3) {
            let maxGap = 0;
            for (let i = 1; i < tickTimestamps.length; i++) {
                let gap = tickTimestamps[i] - tickTimestamps[i - 1];
                if (gap > maxGap) maxGap = gap;
            }
            if (maxGap > 20 && totalKeys > 5) {
                addProfile("The Distracted", "Checking your phone during a 5-second match? Disrespectful.");
            }
        }
        if (totalKeys > 0 && finalKPS < 2) {
            return buildResult("The Sloth", "Are you moving underwater? Check your pulse.");
        }

        // --- 9. DEFAULT FALLBACK ---
        if (matchedProfiles.length === 0) {
            addProfile("The Panic Button", "Pure, unfiltered chaos. No strategy, no physical zones, just a terrifying blend of adrenaline and flailing fingers. We respect the panic.");
        }

        return {
            profiles: matchedProfiles,
            entropy: normalizedEntropy
        };
    }
}

module.exports = ProfileEngine;
