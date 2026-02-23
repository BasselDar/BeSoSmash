const ProfileEngine = require('./utils/ProfileEngine');

const testCases = [
    {
        name: "The Ghost",
        history: [],
        mode: "classic",
        expected: "The Ghost"
    },
    {
        name: "The Minimalist",
        history: [['KeyA']],
        mode: "classic",
        expected: "The Minimalist"
    },
    {
        name: "The Rage Quitter",
        history: [['AltLeft', 'F4'], ['KeyW', 'KeyA']],
        mode: "classic",
        expected: "The Rage Quitter"
    },
    {
        name: "The Plagiarist",
        history: [['ControlLeft', 'KeyC', 'KeyC'], ['ControlLeft', 'KeyV', 'KeyV'], ['ControlLeft', 'KeyV']],
        mode: "classic",
        expected: "The Plagiarist"
    },
    {
        name: "The Glitch",
        history: [['F5'], ['F5'], ['F5'], ['KeyW']],
        mode: "classic",
        expected: "The Glitch"
    },
    {
        name: "The Early Bird",
        history: [['KeyL'], ['KeyK']], // Avoid fighting game default keys and center zone
        mode: "classic",
        expected: "The Early Bird"
    },
    {
        name: "The AFK",
        history: [...Array(38).fill([]), ['KeyL'], ['KeyK']], // Wakes up at tick 39 (78%) to trigger AFK but NOT Pacifist (>40)
        mode: "classic",
        expected: "The AFK"
    },
    {
        name: "The Script Kiddie",
        // Needs total > 150, unique < 5
        history: Array(50).fill(['KeyW', 'KeyW', 'KeyW', 'KeyW']),
        mode: "classic",
        expected: "The Script Kiddie"
    },
    {
        name: "The Silverback",
        // Needs row smash >= 3 and unique > 15, and total < 60, but NOT maxRowSmash >= 6
        history: [
            ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
            ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
            ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'],
            ['KeyU', 'KeyI', 'KeyO', 'KeyP']
        ],
        mode: "classic",
        expected: "The Silverback"
    },
    {
        name: "The Escape Artist",
        history: [['Escape', 'Escape', 'Escape', 'Escape'], ['KeyF', 'KeyG', 'KeyB', 'KeyN', 'KeyM', 'Digit1', 'Digit2', 'Digit3', 'KeyO']],
        mode: "classic",
        expected: "The Escape Artist"
    },
    {
        name: "The Typosquatter",
        history: [['Backspace', 'Delete'], ['KeyF', 'KeyG', 'KeyH', 'KeyB', 'KeyN', 'KeyM', 'KeyA']], // Add vowel to avoid Consonant Crusader
        mode: "classic",
        expected: "The Typosquatter"
    },
    {
        name: "The Executioner",
        history: [['Enter', 'NumpadEnter'], ['Enter', 'Enter'], ['KeyB'], ['KeyP'], ['KeyM'], ['KeyN'], ['KeyV'], ['KeyC'], ['KeyX'], ['KeyL'], ['KeyK'], ['KeyJ'], ['KeyH'], ['KeyG'], ['KeyF'], ['KeyT'], ['KeyY'], ['KeyU'], ['KeyI'], ['KeyO']],
        mode: "classic",
        expected: "The Executioner"
    },
    {
        name: "The Punctuation Pedant",
        history: [['Semicolon', 'Quote'], ['BracketLeft', 'KeyO']], // Add vowel
        mode: "classic",
        expected: "The Punctuation Pedant"
    },
    {
        name: "The Vowel Vulture",
        history: [['KeyU', 'KeyO'], ['KeyO', 'KeyU', 'KeyI', 'KeyP']], // Add 1 consonant to avoid Vowel Enthusiast
        mode: "classic",
        expected: "The Vowel Vulture"
    },
    {
        name: "The IT Support",
        history: [['F1', 'F2'], ['F12', 'KeyA']], // Add vowel
        mode: "classic",
        expected: "The IT Support"
    },
    {
        name: "The Mod Squad",
        history: [['ShiftLeft', 'ControlRight'], ['AltLeft', 'KeyA']], // Add vowel
        mode: "classic",
        expected: "The Mod Squad"
    },
    {
        name: "The Bottom Feeder",
        history: [['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period']],
        mode: "classic",
        expected: "The Bottom Feeder"
    },
    {
        name: "The Top Row Tyrant",
        history: [['KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyT'], ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyM']],
        mode: "classic",
        expected: "The Top Row Tyrant"
    },
    {
        name: "The Angry Accountant",
        history: [['Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter', 'KeyT']], // Add vowel to avoid Consonant Crusader
        mode: "classic",
        expected: "The Angry Accountant"
    },
    {
        name: "The Left-Handed Boomer",
        history: [['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyN', 'KeyM']], // Arrows = 4, Total = 13 (30%)
        mode: "classic",
        expected: "The Left-Handed Boomer"
    },
    {
        name: "The Sweaty Tryhard",
        history: [['KeyW', 'KeyA', 'KeyS', 'KeyD'], ['KeyW', 'KeyA', 'KeyS', 'KeyD']],
        mode: "classic",
        expected: "The Sweaty Tryhard"
    },
    {
        name: "The Bunny Hopper",
        history: [['Space', 'Space'], ['Space', 'KeyA']], // Add vowel
        mode: "classic",
        expected: "The Bunny Hopper"
    },
    {
        name: "The Stutterer",
        history: [...Array(15).fill(['KeyK']), ['KeyA']], // Pushing K 15 times, add vowel
        mode: "classic",
        expected: "The Stutterer"
    },
    {
        name: "The Sloth",
        history: [['KeyG'], ['KeyH'], ['KeyA']],
        mode: "classic",
        expected: "The Sloth"
    },
    {
        name: "The Novelist",
        history: [
            ['Digit1', 'Digit2'], ['Digit3', 'Digit4'], // Neutral Row (0%)
            ['KeyY', 'KeyO'], ['Digit5', 'Digit6'],     // Top Row (16%)
            ['KeyF', 'KeyG'], ['Digit7', 'Digit8'],     // Mid Row (16%)
            ['KeyB', 'KeyN'], ['Digit9', 'Digit0']      // Bot Row (16%)
        ],
        mode: "classic",
        expected: "The Novelist"
    },
    {
        name: "The Panic Button",
        mode: "classic",
        history: (() => {
            const h = [];
            // Pure neural digits to pad out and avoid all zone overrides perfectly gaplessly
            const seq = ['Digit1', 'Digit2', 'Digit3', 'Digit7', 'KeyY', 'KeyO', 'KeyF', 'KeyG', 'KeyB', 'KeyN', 'Digit5', 'Digit9'];
            for (let i = 0; i < 50; i++) {
                h.push([seq[i % seq.length]]);
            }
            return h;
        })(),
        expected: "The Panic Button"
    },
    {
        name: "The Konami Coder",
        history: [['ArrowUp'], ['ArrowUp'], ['ArrowDown'], ['ArrowDown'], ['ArrowLeft'], ['ArrowRight'], ['ArrowLeft'], ['ArrowRight'], ['KeyB'], ['KeyA']],
        mode: "classic",
        expected: "The Konami Coder"
    },
    {
        name: "The QA Tester",
        history: [['Tab'], ['Tab'], ['KeyP'], ['Tab'], ['KeyA']],
        mode: "classic",
        expected: "The QA Tester"
    },
    {
        name: "The Screamer",
        history: [['CapsLock'], ['CapsLock'], ['CapsLock'], ['CapsLock'], ['CapsLock'], ['KeyA']],
        mode: "classic",
        expected: "The Screamer"
    },
    {
        name: "The Mad Scientist",
        history: [['NumpadSubtract', 'NumpadDivide'], ['Minus', 'NumpadDivide'], ['Minus', 'KeyY']],
        mode: "classic",
        expected: "The Mad Scientist"
    },
    {
        name: "The Alt-Tabber",
        history: [
            ['AltLeft', 'Tab'], ['AltLeft', 'Tab'], ['AltLeft', 'Tab']
        ],
        mode: "classic",
        expected: "The Alt-Tabber"
    },
    {
        name: "The Hardware Spoof",
        history: Array(50).fill(Array(11).fill('KeyA')), // totalKeys = 550
        mode: "classic",
        expected: "The Hardware Spoof"
    },
    {
        name: "The Metronome",
        history: Array(50).fill(['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG']),
        mode: "classic",
        expected: "The Metronome"
    },
    {
        name: "The Accidental Potato",
        history: [['KeyP'], ['KeyO'], ['KeyT'], ['KeyA'], ['KeyT'], ['KeyO']],
        mode: "classic",
        expected: "The Accidental Potato"
    },
    {
        name: "The SQL Dropper",
        history: [['KeyD'], ['KeyR'], ['KeyO'], ['KeyP'], ['Space'], ['KeyT'], ['KeyA'], ['KeyB'], ['KeyL'], ['KeyE']],
        mode: "classic",
        expected: "The SQL Dropper"
    },
    {
        name: "The Sudo Override",
        history: [['KeyS'], ['KeyU'], ['KeyD'], ['KeyO']],
        mode: "classic",
        expected: "The Sudo Override"
    },
    {
        name: "The Git Pusher",
        history: [['KeyG'], ['KeyI'], ['KeyT'], ['Space'], ['KeyP'], ['KeyU'], ['KeyS'], ['KeyH']],
        mode: "classic",
        expected: "The Git Pusher"
    },
    {
        name: "The Swear Jar",
        history: [['KeyF'], ['KeyU'], ['KeyC'], ['KeyK']],
        mode: "classic",
        expected: "The Swear Jar"
    },
    {
        name: "The Forearm Sweep",
        history: [['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'], ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ'], ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma']], // Row sizes: 6, 7, 8. maxSingle=8
        mode: "classic",
        expected: "The Forearm Sweep"
    },
    {
        name: "The Single-Key Murderer",
        history: Array(50).fill(['KeyX']),
        mode: "classic",
        expected: "The Single-Key Murderer"
    },
    {
        name: "The Center of Attention",
        history: [['KeyG', 'KeyH', 'KeyY', 'KeyB'], ['KeyG', 'KeyH', 'KeyB', 'KeyY']],
        mode: "classic",
        expected: "The Center of Attention"
    },
    {
        name: "The BIOS Tech",
        history: [['F1', 'F2', 'F12']],
        mode: "classic",
        expected: "The BIOS Tech"
    },
    {
        name: "The Flash Gamer",
        history: [['ArrowUp', 'Space'], ['ArrowLeft']],
        mode: "classic",
        expected: "The Flash Gamer"
    },
    {
        name: "The Arrow Key Boomer",
        history: [['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']],
        mode: "classic",
        expected: "The Arrow Key Boomer"
    },
    {
        name: "The MOBA Toxic",
        history: [['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyD', 'KeyF'], ['KeyA']],
        mode: "classic",
        expected: "The MOBA Toxic"
    },
    {
        name: "The Osu! Addict",
        history: Array(45).fill(['KeyZ', 'KeyX']),
        mode: "classic",
        expected: "The Osu! Addict"
    },
    {
        name: "The Fighting Game Scrub",
        history: [['KeyZ', 'KeyX', 'KeyC', 'KeyZ', 'KeyX', 'KeyC', 'KeyZ']],
        mode: "classic",
        expected: "The Fighting Game Scrub"
    },
    {
        name: "The MMO Raider",
        history: [['KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'], ['KeyL']],
        mode: "classic",
        expected: "The MMO Raider"
    },
    {
        name: "The Crouch Spammer",
        history: [['ControlLeft', 'KeyC', 'KeyP', 'KeyJ', 'KeyK']],
        mode: "classic",
        expected: "The Crouch Spammer"
    },
    {
        name: "The Vim Escaper",
        history: [['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Escape'], ['KeyY', 'KeyU', 'KeyT']],
        mode: "classic",
        expected: "The Vim Escaper"
    },
    {
        name: "The HTML Hacker",
        history: [['Comma', 'Period', 'Slash', 'KeyO', 'KeyU']],
        mode: "classic",
        expected: "The HTML Hacker"
    },
    {
        name: "The Regex Nightmare",
        history: [['Digit6', 'Digit4', 'Digit8', 'NumpadMultiply', 'KeyT']],
        mode: "classic",
        expected: "The Regex Nightmare"
    },
    {
        name: "The Hexadecimal",
        history: [['Digit1'], ['Digit2'], ['Digit3'], ['Digit4'], ['Digit5'], ['Digit6']],
        mode: "classic",
        expected: "The Hexadecimal"
    },
    {
        name: "The Terminal Typist",
        history: [['Enter', 'NumpadEnter', 'KeyP', 'KeyL', 'KeyO']],
        mode: "classic",
        expected: "The Terminal Typist"
    },
    {
        name: "The Vowel Enthusiast",
        history: [['KeyI', 'KeyO', 'KeyU', 'KeyI', 'KeyO']],
        mode: "classic",
        expected: "The Vowel Enthusiast"
    },
    {
        name: "The Consonant Crusader",
        history: [['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyR', 'KeyT']],
        mode: "classic",
        expected: "The Consonant Crusader"
    },
    {
        name: "The Left-Handed Demon",
        history: (() => { let h = Array(50).fill([]); h[0] = ['KeyA', 'KeyF', 'KeyG', 'KeyF', 'KeyG', 'KeyV', 'KeyB', 'KeyF', 'KeyG', 'KeyR', 'KeyT']; return h; })(),
        mode: "classic",
        expected: "The Left-Handed Demon"
    },
    {
        name: "The Right-Handed Menace",
        history: [['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyN', 'KeyM', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyK']],
        mode: "classic",
        expected: "The Right-Handed Menace"
    },
    {
        name: "The Windows Key Victim",
        history: (() => { let h = Array(50).fill([]); h[0] = ['MetaLeft', 'KeyP', 'KeyL']; return h; })(),
        mode: "classic",
        expected: "The Windows Key Victim"
    },
    {
        name: "The Two-Finger Peck",
        history: (() => { let h = Array(50).fill([]); for (let i = 0; i < 5; i++) h[i] = ['KeyI']; for (let i = 5; i < 23; i++) h[i] = ['KeyG']; return h; })(),
        mode: "classic",
        expected: "The Two-Finger Peck"
    },
    {
        name: "The Pacifist",
        history: (() => { let h = Array(50).fill([]); h[42] = ['KeyI']; h[43] = ['KeyG']; h[44] = ['KeyG']; h[45] = ['KeyG']; return h; })(),
        mode: "classic",
        expected: "The Pacifist"
    },
    {
        name: "The Decaf Drinker",
        history: (() => { let h = Array(50).fill([]); h[0] = ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyN', 'KeyM', 'KeyI', 'KeyT']; h[1] = h[0]; h[2] = h[0]; h[3] = h[0]; h[20] = ['KeyT']; return h; })(),
        mode: "classic",
        expected: "The Decaf Drinker"
    },
    {
        name: "The Anime Comeback",
        history: (() => { let h = Array(50).fill([]); h[30] = ['KeyI']; h[42] = ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyI', 'KeyG']; h[43] = h[42]; h[44] = h[42]; h[45] = h[42]; h[46] = h[42]; h[47] = h[42]; h[48] = h[42]; h[49] = h[42]; return h; })(),
        mode: "classic",
        expected: "The Anime Comeback"
    },
    {
        name: "The Distracted",
        history: [['KeyH', 'KeyU'], ['KeyJ'], ...Array(25).fill([]), ['KeyK'], ['KeyL', 'KeyM'], ...Array(21).fill([])],
        mode: "classic",
        expected: "The Distracted"
    }
];

let passed = 0;
let failed = 0;

const fs = require('fs');
let logContent = "=== STARTING PROFILE ENGINE TESTS ===\n";

for (const test of testCases) {
    let historyToTest = [...test.history];
    // Pad out history so they don't all trigger "The Early Bird" due to being too short
    if (test.name !== "The Early Bird" && test.name !== "The AFK" && test.name !== "The Minimalist" && test.history.length > 0 && test.history.length < 50) {
        while (historyToTest.length < 50) {
            historyToTest.push([]); // emulate empty 100ms ticks
        }
        if (historyToTest[0] && historyToTest[0][0]) {
            historyToTest[25] = [historyToTest[0][0]]; // copy the first hit into the middle
            historyToTest[49] = [historyToTest[0][0]]; // copy the first hit into the end
        }
    }

    const result = ProfileEngine.analyze(historyToTest, test.mode);
    const triggeredTitles = result.profiles.map(p => p.title);

    // Check if expected profile is included in triggered titles (overlaps allowed now)
    if (triggeredTitles.includes(test.expected)) {
        logContent += `✅ [PASS] ${test.name} (Entropy: ${result.entropy}%)\n`;
        passed++;
    } else {
        logContent += `❌ [FAIL] ${test.name} -> expected to include '[${test.expected}]', but got '[${triggeredTitles.join(', ')}]'\n`;
        failed++;
    }
}

logContent += "=====================================\n";
logContent += `RESULTS: ${passed} Passed, ${failed} Failed\n`;

fs.writeFileSync('test_output.json', logContent, 'utf8');

if (failed > 0) {
    process.exit(1);
}
