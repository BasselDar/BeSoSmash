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

const vowels = new Set(['KeyA', 'KeyE', 'KeyI', 'KeyO', 'KeyU']);
const fKeys = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']);
const punctuation = new Set(['Comma', 'Period', 'Slash', 'Semicolon', 'Quote', 'BracketLeft', 'BracketRight', 'Minus', 'Equal', 'Backquote', 'Backslash']);
const deletes = new Set(['Backspace', 'Delete']);
const enters = new Set(['Enter', 'NumpadEnter']);
const modifiers = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

const copyPasteKeys = new Set(['KeyC', 'KeyV', 'ControlLeft', 'ControlRight', 'MetaLeft']);
const mathOperators = new Set(['NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide', 'Equal', 'Minus']);
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

const mobaZone = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyD', 'KeyF']);
const vimZone = new Set(['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Escape']);
const osZone = new Set(['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']);
const mediaZone = new Set(['MediaTrackNext', 'MediaTrackPrevious', 'MediaStop', 'MediaPlayPause', 'AudioVolumeMute', 'AudioVolumeDown', 'AudioVolumeUp']);
const dpadFaceZone = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'KeyC', 'KeyA', 'KeyS', 'KeyD']);

const PROFILES = [
    // -------------------------------------------------------
    // EXCLUSIVE profiles: return immediately if matched
    // -------------------------------------------------------
    {
        title: "The Minimalist",
        flavor: "You pressed exactly one key. Peak efficiency. Zero effort.GigChad.",
        condition: (s) => s.totalKeys === 1
    },
    {
        title: "The Script Kiddie",
        flavor: "Nice try injecting JavaScript directly into the DOM. Caught in 4K.",
        isExclusive: true,
        isCheater: true,
        condition: (s) => s.untrustedHits > 0
    },
    {
        title: "The Hardware Spoof",
        flavor: "Your keyboard physically cannot send data this fast. Busted.",
        isExclusive: true,
        isCheater: true,
        condition: (s) => s.kps > 300 && s.ent < 10
    },
    {
        title: "The Overloader",
        flavor: "You hit the server rate limit. Either you are a bot, or your forearms are literal pistons.",
        isExclusive: true,
        isCheater: true,
        condition: (s) => s.keyCounts['RATE_FLAGGED'] > 0 || s.keyCounts['SCRIPT_DETECTED'] > 0
    },
    {
        title: "The Rage Quitter",
        flavor: "Alt+F4? Seriously? If you're going to rage quit a game about typing fast, at least unplug your keyboard.",
        condition: (s) => s.hasAlt && s.hasF4
    },
    {
        title: "The Plagiarist",
        flavor: "Ctrl+C, Ctrl+V. Did you really just try to copy-paste your way to victory? Stack Overflow can't help you here.",
        condition: (s) => s.copyPasteHits / s.totalKeys > 0.8 && s.uniqueKeys <= 5
    },
    {
        title: "The Glitch",
        flavor: "F5 F5 F5 F5. You're trying to refresh reality but you're just stuck in the matrix. Wake up.",
        condition: (s) => s.keyCounts['F5'] && s.keyCounts['F5'] / s.totalKeys > 0.5
    },
    {
        title: "The Konami Coder",
        flavor: "Up, Up, Down, Down, Left, Right, Left, Right, B, A. Infinite lives unlocked! Just kidding, you still have to pay taxes tomorrow.",
        condition: (s) => s.konamiAchieved
    },
    {
        title: "The Accidental Potato",
        flavor: "A million monkeys on a typewriter, and you typed POTATO.",
        condition: (s) => s.typedString.includes('POTATO')
    },
    {
        title: "The SQL Dropper",
        flavor: "Did you just try to drop my production database? Nice try.",
        condition: (s) => s.typedString.includes('DROP TABLE')
    },
    {
        title: "The Console Logger",
        flavor: "Debugging your keyboard? Try console.log('grass') and go touch some.",
        condition: (s) => s.typedString.toUpperCase().includes('CONSOLELOG')
    },
    {
        title: "The Lorem Ipsum",
        flavor: "You are generating placeholder text manually. We have tools for this now.",
        condition: (s) => s.typedString.toUpperCase().includes('LOREM') || s.typedString.toUpperCase().includes('IPSUM')
    },
    {
        title: "The Sudo Override",
        flavor: "You don't have admin privileges here.",
        condition: (s) => s.typedString.includes('SUDO')
    },
    {
        title: "The Git Pusher",
        flavor: "Force pushing to main branch on a Friday? Pure chaos.",
        condition: (s) => s.typedString.includes('GIT PUSH')
    },
    {
        title: "The Calculator Kid",
        flavor: "80085. You are 12 years old and this is the funniest thing you have ever done. Respect.",
        condition: (s) => s.typedString.includes('80085') || s.typedString.toUpperCase().includes('BOOBS')
    },
    {
        title: "The Upside Down Genius",
        flavor: "5318008 upside down. You have not changed since 4th grade and honestly neither have we.",
        condition: (s) => s.typedString.includes('5318008')
    },
    {
        title: "The Satanist Calculator",
        flavor: "7734 upside down on a calculator. Hello indeed. The dark one has been summoned via numpad.",
        condition: (s) => s.typedString.includes('7734')
    },

    {
        title: "The Countdown",
        flavor: "1, 2, 3, 4, 5, 6, 7, 8, 9. You typed a perfect countdown. Were you launching a rocket or just procrastinating creatively?",
        condition: (s) => s.typedString.includes('123456789')
    },
    {
        title: "The Reverse Engineer",
        flavor: "9, 8, 7, 6, 5, 4, 3, 2, 1. Counting backwards. Either you're defusing a bomb or you just really like dramatic countdowns. T-minus chaos.",
        condition: (s) => s.typedString.includes('987654321')
    },
    {
        title: "The Pi Calculator",
        flavor: "3.14159265... You calculated Pi by smashing your keyboard. The scientific community is baffled, but we're just impressed.",
        condition: (s) => s.typedString.includes('314159265')
    },
    {
        title: "The Fibonacci Sequence",
        flavor: "1, 1, 2, 3, 5, 8, 13... The golden ratio of keyboard smashing. Pure mathematical beauty hidden in the chaos.",
        condition: (s) => s.typedString.includes('11235813')
    },
    {
        title: "The Palindrome",
        flavor: "Your keystroke string is exactly the same forwards as it is backwards. An incredibly rare symmetrical flex.",
        condition: (s) => {
            let str = s.typedString.replace(/\s/g, '');
            if (str.length < 4) return false;
            let uniqueChars = new Set(str.split(''));
            if (uniqueChars.size < 2) return false; // "AAAA..." is not a real palindrome
            let rev = str.split('').reverse().join('');
            return str === rev;
        }
    },
    {
        title: "The Typewriter",
        flavor: "Letter, space, letter, space. You perfectly alternated between keys and the spacebar for a prolonged period. *Ding!*",
        condition: (s) => {
            if (s.typedString.length < 10) return false;
            let lettersCount = 0;
            // Check if every other character is strictly space/non-space
            for (let i = 0; i < 10; i++) {
                const char = s.typedString[i];
                if (i % 2 === 0 && char === ' ') return false;
                if (i % 2 === 1 && char !== ' ') return false;
                if (i % 2 === 0) lettersCount++;
            }
            return lettersCount >= 5;
        }
    },
    {
        title: "The 69er",
        flavor: "You smashed 69. Nice.",
        condition: (s) => s.typedString.includes('69')
    },
    {
        title: "The Any% Speedrunner",
        flavor: "Frame-perfect inputs. You probably skipped half the text just to get here. WR pace.",
        condition: (s) => s.typedString.toUpperCase().includes('SPEEDRUN') || s.typedString.toUpperCase().includes('FRAME') || s.typedString.toUpperCase().includes('FAST') || s.typedString.toUpperCase().includes('ANY%')
    },
    {
        title: "The HackerMan",
        flavor: "I'm in. Bypassing the mainframe in 3... 2... 1...",
        condition: (s) => s.typedString.toUpperCase().includes('HACK') || s.typedString.toUpperCase().includes('MAINFRAME')
    },
    {
        title: "The Botanist",
        flavor: "420. You are either very relaxed right now or you cannot count. Possibly both.",
        condition: (s) => s.typedString.includes('420')
    },
    {
        title: "The 2013 Throwback",
        flavor: "YOLO. You Only Live Once, which is exactly why you spent one of your precious seconds typing this.",
        condition: (s) => s.typedString.toUpperCase().includes('YOLO')
    },
    {
        title: "The Yeet Lord",
        flavor: "YEET. Thrown with force. No regrets. This is peak human expression and we will not debate it.",
        condition: (s) => s.typedString.toUpperCase().includes('YEET')
    },
    {
        title: "The Dark Souls Veteran",
        flavor: "Git gud. You said it to yourself. In a game you are currently losing. Peak self-awareness.",
        condition: (s) => s.typedString.toUpperCase().includes('GITGUD') || s.typedString.toUpperCase().includes('GIT GUD')
    },
    {
        title: "The Hopeful Romantic",
        flavor: "Wrong window. The keyboard game cannot send nudes. Have you tried a different app?",
        condition: (s) => s.typedString.toUpperCase().includes('SENDNUDES') || s.typedString.toUpperCase().includes('SEND NUDES')
    },
    {
        title: "The Confused",
        flavor: "W-T-F. The only valid reaction to this game. We understand completely.",
        condition: (s) => s.typedString.toUpperCase().includes('WTF')
    },
    {
        title: "The Drama Queen",
        flavor: "OMG. You are emotionally overwhelmed by a 5-second keyboard game. Valid, actually.",
        condition: (s) => s.typedString.toUpperCase().includes('OMG')
    },
    {
        title: "The Trash Talker",
        flavor: "You called yourself a noob mid-game. The self-awareness is both impressive and heartbreaking.",
        condition: (s) => s.typedString.toUpperCase().includes('NOOB')
    },
    {
        title: "The Disrespectful One",
        flavor: "EZ. You typed EZ. Bro. Please.",
        condition: (s) => s.typedString.toUpperCase().includes('EZ')
    },
    {
        title: "The Swear Jar",
        flavor: "Watch your language. This is a Muslim Minecraft server. That will be $1 per word. You owe us everything.",
        condition: (s) => {
            const up = s.typedString.toUpperCase();
            return up.includes('FUCK') || up.includes('SHIT') || up.includes('BITCH') ||
                up.includes('DAMN') || up.includes('ASS') || up.includes('CRAP') ||
                (up.includes('HELL') && !up.includes('HELLO')) || up.includes('BASTARD') || up.includes('CUNT') || up.includes('PISS');
        }
    },
    {
        title: "The Instagram User",
        flavor: "You typed NI*** , Spending too much time on Instagram are we?",
        condition: (s) => {
            const up = s.typedString.toUpperCase();
            return up.includes('NIGGA') || up.includes('NIGGER') || up.includes('NI***');
        }
    },
    {
        title: "The Spacebar Supremacist",
        flavor: "Every single keypress was the spacebar. You discovered the biggest key and committed. No regrets. No thoughts. Just space.",
        condition: (s) => s.spaceHits > 5 && s.spaceHits === s.totalKeys
    },

    {
        title: "The Creator",
        flavor: "BESOSE detected. We bow to the architect of this beautiful madness.",
        condition: (s) => s.typedString.toUpperCase().includes('BESOSE')
    },
    {
        title: "The Meta Gamer",
        flavor: "You typed the name of the game you are currently playing. Extremely self-aware. Extremely unhinged. We respect it.",
        condition: (s) => s.typedString.toUpperCase().includes('BESOSMASH') && !s.typedString.toUpperCase().includes('BESOSE')
    },
    {
        title: "The Cry for Help",
        flavor: "H-E-L-P. In a keyboard smashing game. We cannot help you. No one can. But we appreciate the honesty.",
        condition: (s) => s.typedString.toUpperCase().includes('HELP')
    },
    {
        title: "The Polite Menace",
        flavor: "You said hello to a keyboard smashing game. That is either adorable or deeply concerning. Probably both.",
        condition: (s) => s.typedString.toUpperCase().includes('HELLO')
    },
    {
        title: "The 1337 Fossil",
        flavor: "l33tsp34k in the year of our lord? Did you time travel from a 2004 gaming forum? Welcome back, old timer. Nothing has gotten better.",
        condition: (s) => s.typedString.toUpperCase().includes('LEET') || s.typedString.includes('1337')
    },
    {
        title: "The Keyboard Tourist",
        flavor: "You traced the top row like a tourist reading a subway map. You were not smashing. You were sightseeing.",
        condition: (s) => s.typedString.toUpperCase().includes('QWERTY')
    },
    {
        title: "The E-Sports Veteran",
        flavor: "GG. Two letters. You typed GG and called it a session. Based.",
        condition: (s) => s.typedString.toUpperCase().startsWith('GG') && s.totalKeys <= 5
    },
    {
        title: "The Home Row Devotee",
        flavor: "A-S-D-F. Your fingers never left home base. Touch typist? Or just too lazy to move? Either way, respect.",
        condition: (s) => s.typedString.toUpperCase().includes('ASDF')
    },
    {
        title: "The Nice Guy",
        flavor: "You typed NICE. We agree. It is, in fact, quite nice.",
        condition: (s) => s.typedString.toUpperCase().includes('NICE')
    },
    {
        title: "The Mobile Smasher",
        flavor: "Tapping your screen to death. RIP to your oleophobic coating.",
        condition: (s) => s.touchHits === s.totalKeys
    },

    // -------------------------------------------------------
    // ACCUMULATIVE profiles: collect ALL that match
    // -------------------------------------------------------

    {
        title: "Suspected Cheater", // kps > 150
        flavor: "150+ keys per second with almost no variation. That's auto-clicker territory. Your score is saved, but we're watching.",
        isExclusive: true,
        isCheater: true,
        condition: (s) => s.kps > 150 && s.ent < 20
    },
    {
        title: "Suspected Cheater", // kps > 100
        flavor: "Triple-digit KPS with near-zero entropy. Either you're a literal octopus or something fishy is going on.",
        isExclusive: true,
        isCheater: true,
        condition: (s) => s.kps > 100 && s.kps <= 150 && s.ent < 15
    },
    {
        title: "Suspected Cheater", // kps > 80
        flavor: "High speed, one key. That's not smashing, that's a macro with extra steps.",
        isExclusive: true,
        isCheater: true,
        condition: (s) => s.kps > 80 && s.kps <= 100 && s.ent < 5
    },
    {
        title: "The Hybrid",
        flavor: "Using a touchscreen AND a keyboard? Unorthodox and deeply concerning.",
        condition: (s) => s.touchHits > 0 && s.touchHits !== s.totalKeys
    },
    {
        title: "The Pianist",
        flavor: "You didn't just smash keys, you played chords. Perfect simultaneous keystrokes detected. Are you playing a sonata?",
        condition: (s) => s.maxRowSmashInSingleTick >= 4 && s.kps > 8 && s.maxRowSmashInSingleTick < 6
    },
    {
        title: "The Precision Striker",
        flavor: "You maintained a flawless unique key rate for a significant portion of the game. Absolute surgical accuracy.",
        condition: (s) => s.uniqueKeys >= 25 && s.maxSingleKeyCount <= 2 && s.totalKeys >= 30
    },
    {
        title: "The Drummer",
        flavor: "A steady rhythm of alternating taps. You kept a high pace without ever flattening your hand on the board. Rock on.",
        condition: (s) => s.kps >= 12 && s.maxRowSmashInSingleTick <= 2 && s.totalKeys >= 50
    },
    {
        title: "The Stenographer",
        flavor: "Typing faster than the speed of sound with zero wasted movements. Perfect distribution, no frantic repetition.",
        condition: (s) => s.kps >= 10 && s.uniqueKeys >= 20 && s.maxSingleKeyCount / s.totalKeys < 0.15
    },
    {
        title: "The Forearm Sweep",
        flavor: "Forearm slam detected. The hardware is begging for mercy.",
        condition: (s) => s.maxRowSmashInSingleTick >= 6 && s.uniqueKeys > 20
    },
    {
        title: "The Silverback",
        flavor: "No human fingers move like this. You either rolled your face across the desk, or you just forearm-slammed your mechanical keyboard. The hardware is begging for mercy.",
        condition: (s) => s.maxRowSmashInSingleTick >= 3 && s.uniqueKeys > 15 && s.totalKeys < 60 && !(s.maxRowSmashInSingleTick >= 6 && s.uniqueKeys > 20)
    },
    {
        title: "The Single-Key Murderer",
        flavor: "Please apologize to your key. Its warranty is void.",
        condition: (s) => s.maxSingleKeyCount >= 50
    },
    {
        title: "The Center of Attention",
        flavor: "Laser-focused on the dead center. Tunnel vision at its finest.",
        condition: (s) => s.centerHits > 0 && s.centerHits === s.totalKeys
    },
    {
        title: "The BIOS Tech",
        flavor: "Are you trying to boot into Safe Mode? Coward.",
        condition: (s) => s.fKeyHits > 0 && s.fKeyHits === s.totalKeys
    },
    {
        title: "The Flash Gamer",
        flavor: "Playing this like it's a 2004 browser game on Miniclip.",
        condition: (s) => s.arrowHits > 0 && s.spaceHits > 0 && (s.arrowHits + s.spaceHits) / s.totalKeys > 0.8
    },
    {
        title: "The Arrow Key Boomer",
        flavor: "WASD was invented 20 years ago. Let go of the arrow keys, grandpa.",
        condition: (s) => s.arrowHits > 0 && s.arrowHits === s.totalKeys
    },
    {
        title: "The Left-Handed Boomer",
        flavor: "You are playing this on the arrow keys. Either you are left-handed, or you boldly refused to adapt to standard gaming controls after 1998.",
        condition: (s) => s.arrowHits / s.totalKeys > 0.20 && !(s.arrowHits === s.totalKeys) && !(s.arrowHits > 0 && s.spaceHits > 0 && (s.arrowHits + s.spaceHits === s.totalKeys))
    },
    {
        title: "The MOBA Toxic",
        flavor: "Q, W, E, R dominance. You just tried to pop your ultimate, didn't you? Go back to the fountain.",
        condition: (s) => s.mobaHits / s.totalKeys > 0.6
    },
    {
        title: "The Osu! Addict",
        flavor: "Tapping Z and X at the speed of light. Have you blinked since 2019?",
        condition: (s) => s.totalKeys > 40 && s.uniqueKeys <= 2 && ((s.keyCounts['KeyZ'] || 0) + (s.keyCounts['KeyX'] || 0) > 40)
    },
    {
        title: "The Fighting Game Scrub",
        flavor: "Just mashing heavy punch and hoping for a combo, huh?",
        condition: (s) => s.dpadFaceHits / s.totalKeys > 0.6
    },
    {
        title: "The MMO Raider",
        flavor: "Cycling through your 40-button rotation. Too bad the boss enraged.",
        condition: (s) => s.topRowHits / s.totalKeys > 0.8 && s.uniqueKeys > 5
    },
    {
        title: "The Crouch Spammer",
        flavor: "Teabagging the keyboard won't give you a higher score.",
        condition: (s) => (s.keyCounts['ControlLeft'] || 0) + (s.keyCounts['KeyC'] || 0) > s.totalKeys * 0.3
    },
    {
        title: "The Bunny Hopper",
        flavor: "Your spacebar is currently holding on by a single, snapping plastic thread. You can stop jumping now. You're already dead.",
        condition: (s) => s.spaceHits / s.totalKeys > 0.15
    },
    {
        title: "The Sweaty Tryhard",
        flavor: "We get it, you are hardstuck Platinum in Valorant. Your hands naturally form a claw over the WASD keys. Please go take a shower.",
        condition: (s) => s.wasdHits / s.totalKeys > 0.20
    },
    {
        title: "The Alt-Tabber",
        flavor: "Boss walking by? You hit Alt-Tab more times than actual keys. Your 'spreadsheets' are safe.",
        condition: (s) => s.hasAlt && s.tabHits / s.totalKeys > 0.10
    },
    {
        title: "The Vim Escaper",
        flavor: "You can't :wq your way out of this one.",
        condition: (s) => s.vimHits / s.totalKeys > 0.4 && s.escHits > 0
    },
    {
        title: "The HTML Hacker",
        flavor: "You're closing tags faster than your browser is crashing.",
        condition: (s) => s.punctuationHits / s.totalKeys > 0.4 && ((s.keyCounts['Comma'] || 0) > 0 || (s.keyCounts['Period'] || 0) > 0 || (s.keyCounts['Slash'] || 0) > 0)
    },
    {
        title: "The Regex Nightmare",
        flavor: "Nobody knows what those symbols do, including you.",
        condition: (s) => s.regexHits > 3
    },
    {
        title: "The Hexadecimal",
        flavor: "Speaking strictly in base-16. You are a robot.",
        condition: (s) => s.isHex && s.typedString.length > 5 && !s.typedString.includes(' ')
    },
    {
        title: "The Terminal Typist",
        flavor: "Waiting for the command prompt to execute your garbage.",
        condition: (s) => s.enterHits / s.totalKeys > 0.3 && s.totalKeys < 20
    },
    {
        title: "The Mad Scientist",
        flavor: "Plus, minus, multiply, divide. You're out here solving the Riemann Hypothesis instead of playing the game.",
        condition: (s) => s.mathHits / s.totalKeys > 0.10
    },
    {
        title: "The Angry Accountant",
        flavor: "Did the taxes not balance this year? You completely ignored the letters and attacked the calculator zone with lethal intent. HR has been notified.",
        condition: (s) => s.numpadHits / s.totalKeys > 0.35
    },
    {
        title: "The Bottom Feeder",
        flavor: "You stayed rigidly glued to the ZXCVBNM row. Did you spill coffee on the top half of your keyboard, or are you just afraid of heights?",
        condition: (s) => s.bottomRowHits / s.totalKeys > 0.35 && s.uniqueKeys > 5
    },
    {
        title: "The Top Row Tyrant",
        flavor: "QWERTYUIOP. You dominated the top row exclusively. A minimalist approach, but mathematically inefficient.",
        condition: (s) => s.topRowHits / s.totalKeys > 0.35 && s.uniqueKeys > 5 && !(s.topRowHits / s.totalKeys > 0.8)
    },
    {
        title: "The Vowel Enthusiast",
        flavor: "Are you trying to buy a vowel? This isn't Wheel of Fortune.",
        condition: (s) => s.vowelHits > 0 && s.vowelHits === s.totalKeys
    },
    {
        title: "The Consonant Crusader",
        flavor: "Wh nds vwls nywy? Y sk t ths gm.",
        condition: (s) => s.vowelHits === 0 && s.totalKeys > 5
    },
    {
        title: "The Vowel Vulture",
        flavor: "A, E, I, O, U... and sometimes Y? You strictly targeted vowels. We're not playing Wheel of Fortune, you don't need to buy them.",
        condition: (s) => s.vowelHits / s.totalKeys > 0.25 && !(s.vowelHits > 0 && s.vowelHits === s.totalKeys)
    },
    {
        title: "The Left-Handed Demon",
        flavor: "Right hand was busy? We won't ask.",
        condition: (s) => s.leftHits > 0 && s.rightHits === 0 && s.totalKeys > 10
    },
    {
        title: "The Right-Handed Menace",
        flavor: "Refusing to use the left side. Unbalanced.",
        condition: (s) => s.rightHits > 0 && s.leftHits === 0 && s.totalKeys > 10
    },
    {
        title: "The Escape Artist",
        flavor: "You spent the entire match mashing Escape. Are you trying to open the pause menu? Are you trying to flee the simulation? There is no escape.",
        condition: (s) => s.escHits / s.totalKeys > 0.08
    },
    {
        title: "The Typosquatter",
        flavor: "You hit Backspace more times than a regretful ex texting at 2 AM. You can't un-type the chaos, just embrace it.",
        condition: (s) => s.deleteHits / s.totalKeys > 0.10
    },
    {
        title: "The Executioner",
        flavor: "Smashing the Enter key won't send your messages faster, and it certainly won't help you win. Stop trying to submit the game.",
        condition: (s) => s.enterHits / s.totalKeys > 0.10
    },
    {
        title: "The Punctuation Pedant",
        flavor: "Commas, periods, semicolons... Did you accidentally open your IDE? The compiler is going to reject your high score.",
        condition: (s) => s.punctuationHits / s.totalKeys > 0.15
    },

    {
        title: "The Screamer",
        flavor: "WHY ARE WE YELLING? You hit CapsLock repeatedly. Your keyboard doesn't have a volume dial, but you certainly found a way to shout.",
        condition: (s) => s.capsLockHits > 2
    },
    {
        title: "The IT Support",
        flavor: "F1, F5, F12... Are you trying to refresh the page or open the developer console? Did you try turning the keyboard off and on again?",
        condition: (s) => s.fKeyHits / s.totalKeys > 0.10
    },
    {
        title: "The Start Menu Sommelier",
        flavor: "You pressed the Windows key mid-game. The Start Menu opened. Your score survived. Your dignity did not.",
        condition: (s) => s.osHits > 0 && s.totalKeys >= 5
    },
    {
        title: "The Windows Key Victim",
        flavor: "You opened the Start Menu, the game lost focus, and you typed exactly nothing useful. Skill issue.",
        condition: (s) => s.osHits > 0 && s.totalKeys < 5
    },
    {
        title: "The Screenshot Hoarder",
        flavor: "PrintScreen during a keyboard smashing game. What exactly were you trying to document? The suffering?",
        condition: (s) => s.printScreenHits > 0
    },
    {
        title: "The System Interrupter",
        flavor: "You hit Pause. During a 5-second game. There is no pause in life either, but at least you tried.",
        condition: (s) => s.pauseHits > 0
    },
    {
        title: "The Scroll Lock Champion",
        flavor: "Scroll Lock. The loneliest key on the keyboard. It does nothing. You pressed it anyway. We see you.",
        condition: (s) => s.scrollLockHits > 0
    },
    {
        title: "The Toggle Archaeologist",
        flavor: "Insert key. You activated Insert mode on a game that has no text cursor. Explorer of the useless. Pioneer of nothing.",
        condition: (s) => s.insertHits > 0
    },
    {
        title: "The Mod Squad",
        flavor: "Shift, Ctrl, Alt... You know these keys don't actually DO anything on their own, right? You're just boldly modifying nothing.",
        condition: (s) => s.modifierHits / s.totalKeys > 0.10
    },
    {
        title: "The Two-Finger Peck",
        flavor: "Typing like a confused detective in a 1990s movie.",
        condition: (s) => s.totalKeys > 20 && s.uniqueKeys <= 2 && s.maxSingleKeyCount < s.totalKeys * 0.8
    },
    {
        title: "The Stutterer",
        flavor: (s) => `You pressed [${s.mostRepeatedKey.replace('Key', '')}] exactly ${s.maxSingleKeyCount} times. Are you okay? Is that your emotional support key?`,
        condition: (s) => s.maxSingleKeyCount / s.totalKeys > 0.20 && s.maxSingleKeyCount > 5
    },
    {
        title: "The Novelist",
        flavor: "Are you typing 'pls let me win' in the chat? Your keystroke distribution looks like you just wrote a 3-page essay on Shrek lore instead of fighting.",
        condition: (s) => s.uniqueKeys > 15 && s.maxRowSmashInSingleTick < 4
    },

    {
        title: "The Sloth",
        flavor: "Are you moving underwater? Check your pulse.",
        condition: (s) => s.totalKeys > 0 && s.kps < 2
    },
    {
        title: "The Heartbeat",
        flavor: "Uncanny consistency. The time between your keystrokes was so uniform we thought you were a metronome.",
        condition: (s) => s.kps > 4 && s.maxGap < 100 && s.totalKeys > 20 && s.fastStart < s.totalKeys * 0.4
    },
    {
        title: "The Chaotic Evil",
        flavor: "100% Entropy. Maximum chaos. You touched every single key on your keyboard with no discernible pattern. True randomness achieved.",
        condition: (s) => s.ent >= 95 && s.uniqueKeys >= 40
    },
    {
        title: "The Lawful Good",
        flavor: "High KPS, minimal entropy. You had a solid strategy, pressed exactly what you needed to, and didn't panic. A respectable performance.",
        condition: (s) => s.kps >= 8 && s.kps < 15 && s.ent < 35 && s.uniqueKeys <= 8
    },
    {
        title: "The Overclocker",
        flavor: "Your hardware runs hot. Very hot. You pushed out massive keystrokes with explosive surges.",
        condition: (s) => s.maxRowSmashInSingleTick >= 8 && s.kps >= 25 && s.kps < 80
    },
    {
        title: "The Rhythm Gamer",
        flavor: "Perfect alternating patterns. You found the beat and stuck to it. Are you playing Friday Night Funkin' in another tab?",
        condition: (s) => s.uniqueKeys >= 3 && s.uniqueKeys <= 7 && s.ent >= 15 && s.kps > 8 && s.maxSingleKeyCount < s.totalKeys * 0.4
    },
    // -------------------------------------------------------
    // FUN PATTERN PROFILES
    // -------------------------------------------------------
    {
        title: "The F-Key Summoner",
        flavor: "You pressed nothing but function keys. F1 through F12 — like summoning the council of keyboard elders. The ritual is complete. Nothing happened.",
        condition: (s) => s.fKeyHits > 0 && s.fKeyHits === s.totalKeys && s.uniqueKeys >= 3
    },

    {
        title: "The Binary Bot",
        flavor: "01100010 01110010 01110101 01101000. You only typed 0s and 1s. Either you're communicating with the mothership or you failed the Turing test. Beep boop.",
        condition: (s) => {
            if (s.totalKeys < 5) return false;
            const zeros = (s.keyCounts['Digit0'] || 0) + (s.keyCounts['Numpad0'] || 0);
            const ones = (s.keyCounts['Digit1'] || 0) + (s.keyCounts['Numpad1'] || 0);
            return (zeros + ones) === s.totalKeys && zeros > 0 && ones > 0;
        }
    },
    {
        title: "The Roll Call",
        flavor: "A-B-C-D-E-F. You typed the first six letters of the alphabet in order. Were you doing roll call? Attendance: present. Intelligence: debatable.",
        condition: (s) => s.typedString.includes('ABCDEF')
    },
    {
        title: "The Numpad Astronaut",
        flavor: "Houston, we have a numpad. Every single key was from the number pad. You're either an accountant or you lost the rest of your keyboard in a boating accident.",
        condition: (s) => s.numpadHits > 0 && s.numpadHits === s.totalKeys && s.totalKeys >= 5
    },
    {
        title: "The Shift Warrior",
        flavor: "You held Shift like your life depended on it. EVERYTHING IS VERY IMPORTANT WHEN IT'S IN CAPS. Your pinky finger filed a restraining order.",
        condition: (s) => ((s.keyCounts['ShiftLeft'] || 0) + (s.keyCounts['ShiftRight'] || 0)) / s.totalKeys > 0.25
    },
    {
        title: "The Tab Destroyer",
        flavor: "Tab, Tab, Tab. You tabbed through approximately 47 invisible form fields. The web accessibility audit is complete. Everything failed.",
        condition: (s) => s.tabHits > 5 && s.tabHits / s.totalKeys > 0.15
    },
    {
        title: "The Backspace Poet",
        flavor: "Write. Delete. Write. Delete. The Hemingway of keyboard smashing. Your masterpiece was erased before the world could see it. Probably for the best.",
        condition: (s) => s.deleteHits / s.totalKeys > 0.30 && s.totalKeys > 10
    },
    {
        title: "The Perfect Balance",
        flavor: "Exactly 50/50 left and right hand usage. Thanos would be proud. Perfectly balanced, as all things should be. Your chiropractor is thrilled.",
        condition: (s) => {
            if (s.leftHits + s.rightHits < 20) return false;
            const ratio = s.leftHits / (s.leftHits + s.rightHits);
            return ratio >= 0.45 && ratio <= 0.55;
        }
    },
    {
        title: "The Number Cruncher",
        flavor: "Nothing but digits. 0-9, that's your whole vocabulary. You turned a keyboard smashing game into a spreadsheet. Excel would be proud.",
        condition: (s) => {
            if (s.totalKeys < 5) return false;
            let digitHits = 0;
            for (let i = 0; i <= 9; i++) {
                digitHits += (s.keyCounts['Digit' + i] || 0);
                digitHits += (s.keyCounts['Numpad' + i] || 0);
            }
            return digitHits === s.totalKeys;
        }
    },
    {
        title: "The Home Row Anchor",
        flavor: "A-S-D-F-J-K-L-; — you never left the home row. Your typing teacher from 2003 is smiling from heaven. Touch typing purist. Maximum efficiency, minimal excitement.",
        condition: (s) => {
            const homeRowHits = [...rows[1]].reduce((sum, key) => sum + (s.keyCounts[key] || 0), 0);
            return homeRowHits / s.totalKeys > 0.80 && s.totalKeys > 10 && s.uniqueKeys >= 4;
        }
    },
    {
        title: "The Speed Demon",
        flavor: "60+ keys per second and somehow still human. Your fingers have their own heartbeat. Your keyboard is filing for workers' compensation.",
        condition: (s) => s.kps >= 90 && s.ent > 25
    },
    {
        title: "The Mechanical Switch Tester",
        flavor: "You methodically went through your keyboard just listening to the clicks. Satisfying, isn't it?",
        condition: (s) => s.kps < 8 && s.uniqueKeys >= 30 && s.maxSingleKeyCount < 5
    },
    {
        title: "The Pure Smasher",
        flavor: "No patterns, no scripts, just raw keyboard violence. You didn't come here to win, you came here to break something.",
        condition: (s) => s.totalKeys > 20
    }
];

class BlitzProfileEngine {
    static calculateStats(keyHistory) {
        let s = {
            totalKeys: 0,
            wasdHits: 0,
            numpadHits: 0,
            spaceHits: 0,
            arrowHits: 0,
            uniqueKeysSet: new Set(),
            metronomeCheats: 0,
            maxRowSmashInSingleTick: 0,
            untrustedHits: 0,
            vowelHits: 0,
            fKeyHits: 0,
            punctuationHits: 0,
            deleteHits: 0,
            enterHits: 0,
            modifierHits: 0,
            escHits: 0,
            topRowHits: 0,
            bottomRowHits: 0,
            keyCounts: {},
            mobaHits: 0,
            vimHits: 0,
            osHits: 0,
            mediaHits: 0,
            dpadFaceHits: 0,
            touchHits: 0,
            typedString: "",
            tickTimestamps: [],
            hasAlt: false,
            hasF4: false,
            copyPasteHits: 0,
            tabHits: 0,
            capsLockHits: 0,
            mathHits: 0,
            printScreenHits: 0,
            pauseHits: 0,
            scrollLockHits: 0,
            insertHits: 0,
            konamiIndex: 0,
            konamiAchieved: false,
            firstHitTick: -1,
            lastHitTick: -1,
            currentTickIndex: 0,
            leftHits: 0,
            rightHits: 0,
            centerHits: 0,
            regexHits: 0,
            fastStart: 0,
            lateStart: 0,
            maxGap: 0,
            isHex: true,
            expectedTicks: 40,
            gameSeconds: 2
        };

        const leftSideKeys = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']);
        const rightSideKeys = new Set(['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyN', 'KeyM']);

        for (const tick of keyHistory) {
            s.currentTickIndex++;
            if (!Array.isArray(tick)) continue;

            const tickCount = tick.length;
            if (tickCount === 0) continue;

            s.totalKeys += tickCount;
            s.tickTimestamps.push(s.currentTickIndex);

            let rowCounts = [0, 0, 0];

            for (let key of tick) {
                if (typeof key === 'string' && key.startsWith('Untrusted_')) {
                    s.untrustedHits++;
                    key = key.replace('Untrusted_', '');
                }

                s.uniqueKeysSet.add(key);
                s.keyCounts[key] = (s.keyCounts[key] || 0) + 1;

                if (wasdZone.has(key)) s.wasdHits++;
                if (numpadZone.has(key)) s.numpadHits++;
                if (key === 'Space') s.spaceHits++;
                if (arrowZone.has(key)) s.arrowHits++;

                if (vowels.has(key)) s.vowelHits++;
                if (fKeys.has(key)) s.fKeyHits++;
                if (punctuation.has(key)) s.punctuationHits++;
                if (deletes.has(key)) s.deleteHits++;
                if (enters.has(key)) s.enterHits++;
                if (modifiers.has(key)) s.modifierHits++;
                if (key === 'Escape') s.escHits++;

                if (mobaZone.has(key)) s.mobaHits++;
                if (vimZone.has(key)) s.vimHits++;
                if (osZone.has(key)) s.osHits++;
                if (mediaZone.has(key)) s.mediaHits++;
                if (dpadFaceZone.has(key)) s.dpadFaceHits++;

                if (typeof key === 'string' && key.startsWith('Touch_')) s.touchHits++;

                if (key.startsWith('Key')) s.typedString += key.charAt(3);
                if (key === 'Space') s.typedString += ' ';
                if (key.startsWith('Digit')) s.typedString += key.charAt(5);
                if (key.startsWith('Numpad') && key.length === 7) s.typedString += key.charAt(6);

                if (key === 'Tab') s.tabHits++;
                if (key === 'CapsLock') s.capsLockHits++;
                if (mathOperators.has(key)) s.mathHits++;
                if (key === 'PrintScreen') s.printScreenHits++;
                if (key === 'Pause') s.pauseHits++;
                if (key === 'ScrollLock') s.scrollLockHits++;
                if (key === 'Insert') s.insertHits++;

                if (key === 'AltLeft' || key === 'AltRight') s.hasAlt = true;
                if (key === 'F4') s.hasF4 = true;
                if (copyPasteKeys.has(key)) s.copyPasteHits++;

                if (!s.konamiAchieved) {
                    if (key === konamiCode[s.konamiIndex]) {
                        s.konamiIndex++;
                        if (s.konamiIndex === konamiCode.length) s.konamiAchieved = true;
                    } else if (key === konamiCode[0]) {
                        s.konamiIndex = 1;
                    } else {
                        s.konamiIndex = 0;
                    }
                }

                if (rows[0].has(key)) { rowCounts[0]++; s.topRowHits++; }
                if (rows[1].has(key)) { rowCounts[1]++; }
                if (rows[2].has(key)) { rowCounts[2]++; s.bottomRowHits++; }

                if (leftSideKeys.has(key)) s.leftHits++;
                if (rightSideKeys.has(key)) s.rightHits++;
            }

            if (s.firstHitTick === -1) s.firstHitTick = s.currentTickIndex;
            s.lastHitTick = s.currentTickIndex;

            const maxInTick = Math.max(...rowCounts);
            if (maxInTick > s.maxRowSmashInSingleTick) {
                s.maxRowSmashInSingleTick = maxInTick;
            }

            if (tickCount > 10) {
                s.metronomeCheats++;
            }
        }

        s.uniqueKeys = s.uniqueKeysSet.size;

        s.maxSingleKeyCount = 0;
        s.mostRepeatedKey = '';
        for (let k in s.keyCounts) {
            if (s.keyCounts[k] > s.maxSingleKeyCount) {
                s.maxSingleKeyCount = s.keyCounts[k];
                s.mostRepeatedKey = k;
            }
        }

        let entropy = 0;
        if (s.totalKeys > 0) {
            for (const key in s.keyCounts) {
                const probability = s.keyCounts[key] / s.totalKeys;
                entropy -= probability * Math.log2(probability);
            }
        }
        s.normalizedEntropy = Math.min((entropy / 6.0) * 100, 100).toFixed(1);
        s.ent = parseFloat(s.normalizedEntropy);
        s.kps = s.totalKeys / s.gameSeconds;

        s.centerHits = (s.keyCounts['KeyG'] || 0) + (s.keyCounts['KeyH'] || 0) + (s.keyCounts['KeyY'] || 0) + (s.keyCounts['KeyB'] || 0);
        s.regexHits = (s.keyCounts['Digit6'] || 0) + (s.keyCounts['Digit4'] || 0) + (s.keyCounts['Digit8'] || 0) + (s.keyCounts['NumpadMultiply'] || 0) + (s.keyCounts['Equal'] || 0) + (s.keyCounts['NumpadAdd'] || 0) + (s.keyCounts['Slash'] || 0) + (s.keyCounts['Backslash'] || 0);

        s.isHex = s.typedString.length > 5;
        const hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        for (let i = 0; i < s.typedString.length; i++) {
            if (!hexChars.includes(s.typedString[i])) s.isHex = false;
        }

        for (let i = 0; i < 10 && i < keyHistory.length; i++) {
            if (Array.isArray(keyHistory[i])) s.fastStart += keyHistory[i].length;
        }

        for (let i = 40; i < keyHistory.length; i++) {
            if (Array.isArray(keyHistory[i])) s.lateStart += keyHistory[i].length;
        }

        if (s.tickTimestamps.length > 3) {
            for (let i = 1; i < s.tickTimestamps.length; i++) {
                let gap = s.tickTimestamps[i] - s.tickTimestamps[i - 1];
                if (gap > s.maxGap) s.maxGap = gap;
            }
        }

        return s;
    }

    static analyze(keyHistory) {
        if (!keyHistory || keyHistory.length === 0) {
            return {
                profiles: [],
                entropy: 0.0,
                isCheater: false
            };
        }

        const stats = this.calculateStats(keyHistory);

        if (stats.totalKeys === 0) {
            return {
                profiles: [],
                entropy: 0.0,
                isCheater: false
            };
        }

        let matched = [];
        let isCheaterRun = false;

        for (const profile of PROFILES) {
            if (profile.condition(stats)) {
                let flavorText = typeof profile.flavor === 'function' ? profile.flavor(stats) : profile.flavor;

                let matchedProfile = { title: profile.title, flavor: flavorText };
                if (profile.isCheater) {
                    isCheaterRun = true;
                    matchedProfile.isCheater = true;
                }

                matched.push(matchedProfile);

                if (profile.isExclusive) {
                    break;
                }
            }
        }

        if (isCheaterRun && !matched.some(p => p.title === "Suspected Cheater")) {
            matched.push({ title: "Suspected Cheater", flavor: "Your inputs were flagged by the anti-cheat system.", isCheater: true });
        }

        return {
            profiles: matched,
            entropy: stats.normalizedEntropy,
            isCheater: isCheaterRun
        };
    }

    // Now dynamically computed. We filter to unique titles since "Suspected Cheater" is in PROFILES multiple times
    static TOTAL_PROFILES = Array.from(new Set(PROFILES.map(p => p.title)));

    static getTotalCount() {
        return BlitzProfileEngine.TOTAL_PROFILES.length;
    }
}

BlitzProfileEngine.RAW_PROFILES = PROFILES;

module.exports = BlitzProfileEngine;
