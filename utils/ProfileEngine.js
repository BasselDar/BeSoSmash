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
        isExclusive: true,
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
        isExclusive: true,
        condition: (s) => s.hasAlt && s.hasF4
    },
    {
        title: "The Plagiarist",
        flavor: "Ctrl+C, Ctrl+V. Did you really just try to copy-paste your way to victory? Stack Overflow can't help you here.",
        isExclusive: true,
        condition: (s) => s.copyPasteHits / s.totalKeys > 0.8 && s.uniqueKeys <= 5
    },
    {
        title: "The Glitch",
        flavor: "F5 F5 F5 F5. You're trying to refresh reality but you're just stuck in the matrix. Wake up.",
        isExclusive: true,
        condition: (s) => s.keyCounts['F5'] && s.keyCounts['F5'] / s.totalKeys > 0.5
    },
    {
        title: "The Konami Coder",
        flavor: "Up, Up, Down, Down, Left, Right, Left, Right, B, A. Infinite lives unlocked! Just kidding, you still have to pay taxes tomorrow.",
        isExclusive: true,
        condition: (s) => s.konamiAchieved
    },
    {
        title: "The Accidental Potato",
        flavor: "A million monkeys on a typewriter, and you typed POTATO.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('POTATO')
    },
    {
        title: "The SQL Dropper",
        flavor: "Did you just try to drop my production database? Nice try.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('DROP TABLE')
    },
    {
        title: "The Console Logger",
        flavor: "Debugging your keyboard? Try console.log('grass') and go touch some.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('CONSOLELOG')
    },
    {
        title: "The Lorem Ipsum",
        flavor: "You are generating placeholder text manually. We have tools for this now.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('LOREM') || s.typedString.toUpperCase().includes('IPSUM')
    },
    {
        title: "The Sudo Override",
        flavor: "You don't have admin privileges here.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('SUDO')
    },
    {
        title: "The Git Pusher",
        flavor: "Force pushing to main branch on a Friday? Pure chaos.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('GIT PUSH')
    },
    {
        title: "The Calculator Kid",
        flavor: "80085. You are 12 years old and this is the funniest thing you have ever done. Respect.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('80085') || s.typedString.toUpperCase().includes('BOOBS')
    },
    {
        title: "The Upside Down Genius",
        flavor: "5318008 upside down. You have not changed since 4th grade and honestly neither have we.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('5318008')
    },
    {
        title: "The Satanist Calculator",
        flavor: "7734 upside down on a calculator. Hello indeed. The dark one has been summoned via numpad.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('7734')
    },
    {
        title: "The 69er",
        flavor: "You smashed 69. Nice.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('69')
    },
    {
        title: "The Any% Speedrunner",
        flavor: "Frame-perfect inputs. You probably skipped half the text just to get here. WR pace.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('SPEEDRUN') || s.typedString.toUpperCase().includes('FRAME')
    },
    {
        title: "The HackerMan",
        flavor: "I'm in. Bypassing the mainframe in 3... 2... 1...",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('HACK') || s.typedString.toUpperCase().includes('MAINFRAME')
    },
    {
        title: "The Botanist",
        flavor: "420. You are either very relaxed right now or you cannot count. Possibly both.",
        isExclusive: true,
        condition: (s) => s.typedString.includes('420')
    },
    {
        title: "The 2013 Throwback",
        flavor: "YOLO. You Only Live Once, which is exactly why you spent one of your precious seconds typing this.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('YOLO')
    },
    {
        title: "The Yeet Lord",
        flavor: "YEET. Thrown with force. No regrets. This is peak human expression and we will not debate it.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('YEET')
    },
    {
        title: "The Dark Souls Veteran",
        flavor: "Git gud. You said it to yourself. In a game you are currently losing. Peak self-awareness.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('GITGUD') || s.typedString.toUpperCase().includes('GIT GUD')
    },
    {
        title: "The Hopeful Romantic",
        flavor: "Wrong window. The keyboard game cannot send nudes. Have you tried a different app?",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('SENDNUDES') || s.typedString.toUpperCase().includes('SEND NUDES')
    },
    {
        title: "The Confused",
        flavor: "W-T-F. The only valid reaction to this game. We understand completely.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('WTF')
    },
    {
        title: "The Drama Queen",
        flavor: "OMG. You are emotionally overwhelmed by a 5-second keyboard game. Valid, actually.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('OMG')
    },
    {
        title: "The Trash Talker",
        flavor: "You called yourself a noob mid-game. The self-awareness is both impressive and heartbreaking.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('NOOB')
    },
    {
        title: "The Disrespectful One",
        flavor: "EZ. You typed EZ. Bro. Please.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('EZ')
    },
    {
        title: "The Swear Jar",
        flavor: "Watch your language. This is a Muslim Minecraft server. That will be $1 per word. You owe us everything.",
        isExclusive: true,
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
        isExclusive: true,
        condition: (s) => {
            const up = s.typedString.toUpperCase();
            return up.includes('NIGGA') || up.includes('NIGGER') || up.includes('NI***');
        }
    },
    {
        title: "The Spacebar Supremacist",
        flavor: "Every single keypress was the spacebar. You discovered the biggest key and committed. No regrets. No thoughts. Just space.",
        isExclusive: true,
        condition: (s) => s.spaceHits > 5 && s.spaceHits === s.totalKeys
    },
    {
        title: "The Start Menu Sommelier",
        flavor: "You pressed the Windows key mid-game. The Start Menu opened. Your score survived. Your dignity did not.",
        isExclusive: true,
        condition: (s) => s.osHits > 0 && s.osHits / s.totalKeys > 0
    },
    {
        title: "The Creator",
        flavor: "BESOSE detected. We bow to the architect of this beautiful madness.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('BESOSE')
    },
    {
        title: "The Meta Gamer",
        flavor: "You typed the name of the game you are currently playing. Extremely self-aware. Extremely unhinged. We respect it.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('BESOSMASH') && !s.typedString.toUpperCase().includes('BESOSE')
    },
    {
        title: "The Cry for Help",
        flavor: "H-E-L-P. In a keyboard smashing game. We cannot help you. No one can. But we appreciate the honesty.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('HELP')
    },
    {
        title: "The Polite Menace",
        flavor: "You said hello to a keyboard smashing game. That is either adorable or deeply concerning. Probably both.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('HELLO')
    },
    {
        title: "The 1337 Fossil",
        flavor: "l33tsp34k in the year of our lord? Did you time travel from a 2004 gaming forum? Welcome back, old timer. Nothing has gotten better.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('LEET') || s.typedString.includes('1337')
    },
    {
        title: "The Keyboard Tourist",
        flavor: "You traced the top row like a tourist reading a subway map. You were not smashing. You were sightseeing.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('QWERTY')
    },
    {
        title: "The E-Sports Veteran",
        flavor: "GG. Two letters. You typed GG and called it a session. Based.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().startsWith('GG') && s.totalKeys <= 5
    },
    {
        title: "The Home Row Devotee",
        flavor: "A-S-D-F. Your fingers never left home base. Touch typist? Or just too lazy to move? Either way, respect.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('ASDF')
    },
    {
        title: "The Nice Guy",
        flavor: "You typed NICE. We agree. It is, in fact, quite nice.",
        isExclusive: true,
        condition: (s) => s.typedString.toUpperCase().includes('NICE')
    },
    {
        title: "The Mobile Smasher",
        flavor: "Tapping your screen to death. RIP to your oleophobic coating.",
        isExclusive: true,
        condition: (s) => s.touchHits === s.totalKeys
    },

    // -------------------------------------------------------
    // ACCUMULATIVE profiles: collect ALL that match
    // -------------------------------------------------------

    {
        title: "Suspected Cheater", // kps > 150
        flavor: "150+ keys per second with almost no variation. That's auto-clicker territory. Your score is saved, but we're watching.",
        condition: (s) => s.kps > 150 && s.ent < 20
    },
    {
        title: "Suspected Cheater", // kps > 100
        flavor: "Triple-digit KPS with near-zero entropy. Either you're a literal octopus or something fishy is going on.",
        condition: (s) => s.kps > 100 && s.kps <= 150 && s.ent < 15
    },
    {
        title: "Suspected Cheater", // kps > 80
        flavor: "High speed, one key. That's not smashing, that's a macro with extra steps.",
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
        condition: (s) => s.arrowHits > 0 && s.spaceHits > 0 && (s.arrowHits + s.spaceHits === s.totalKeys)
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
        condition: (s) => s.totalKeys > 80 && s.uniqueKeys <= 2 && ((s.keyCounts['KeyZ'] || 0) + (s.keyCounts['KeyX'] || 0) > 80)
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
        title: "The QA Tester",
        flavor: "Smashing Tab. Are you checking the form accessibility index? The UI is fine, please stop filing Jira tickets.",
        condition: (s) => s.tabHits / s.totalKeys > 0.10
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
        title: "The Pacifist",
        flavor: "Refusing to fight. Gandhi would be proud; your score is not.",
        condition: (s) => s.totalKeys > 0 && s.firstHitTick > 40
    },
    {
        title: "The AFK",
        flavor: "You were completely dead for 80% of the game and woke up at the very end in a panic. Ping 999ms.",
        condition: (s) => s.firstHitTick > s.expectedTicks * 0.7 && !(s.totalKeys > 0 && s.firstHitTick > 40)
    },
    {
        title: "The Early Bird",
        flavor: "You smashed the keyboard for the first half-second and then just gave up entirely. Stamina issue?",
        condition: (s) => s.lastHitTick < s.expectedTicks * 0.3
    },
    {
        title: "The Decaf Drinker",
        flavor: "You ran out of gas 1 second in. Pathetic stamina.",
        condition: (s) => s.fastStart > 30 && (s.totalKeys - s.fastStart) < 5 && s.expectedTicks === 100 // Updated the bug `=== 50` to `=== 100` mode based check
    },
    {
        title: "The Anime Comeback",
        flavor: "You unlocked your final form at the very last second.",
        condition: (s) => s.lateStart > 40 && (s.totalKeys - s.lateStart) < 10 && s.expectedTicks === 100 // Updated the bug `=== 50` to `=== 100`
    },
    {
        title: "The Distracted",
        flavor: "Checking your phone during a 5-second match? Disrespectful.",
        condition: (s) => s.tickTimestamps.length > 3 && s.maxGap > 20 && s.totalKeys > 5
    },
    {
        title: "The Sloth",
        flavor: "Are you moving underwater? Check your pulse.",
        condition: (s) => s.totalKeys > 0 && s.kps < 2
    }
];

class ProfileEngine {
    static calculateStats(keyHistory, mode) {
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
            expectedTicks: mode === 'blitz' ? 40 : 100,
            gameSeconds: mode === 'blitz' ? 2 : 5
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

    static analyze(keyHistory, mode) {
        if (!keyHistory || keyHistory.length === 0) {
            return {
                profiles: [{ title: "The Ghost", flavor: "Did you even touch the keyboard? Zero keys detected. Please wake up." }],
                entropy: 0.0,
                isCheater: true
            };
        }

        const stats = this.calculateStats(keyHistory, mode);

        if (stats.totalKeys === 0) {
            return {
                profiles: [{ title: "The Ghost" }],
                entropy: 0.0,
                isCheater: true
            };
        }

        let matched = [];
        let isCheaterRun = false;

        for (const profile of PROFILES) {
            if (profile.condition(stats)) {
                let flavorText = typeof profile.flavor === 'function' ? profile.flavor(stats) : profile.flavor;
                if (profile.isCheater) {
                    isCheaterRun = true;
                }

                matched.push({ title: profile.title, flavor: flavorText });
            }
        }

        if (matched.length === 0) {
            matched.push({ title: "The Panic Button", flavor: "You smashed so randomly even the algorithm gave up." });
        }

        return {
            profiles: matched,
            entropy: stats.normalizedEntropy,
            isCheater: isCheaterRun
        };
    }

    // Now dynamically computed. We filter to unique titles since "Suspected Cheater" is in PROFILES multiple times
    static TOTAL_PROFILES = [
        "The Ghost", ...Array.from(new Set(PROFILES.map(p => p.title))), "The Panic Button"
    ].filter((value, index, self) => self.indexOf(value) === index);

    static getTotalCount() {
        return ProfileEngine.TOTAL_PROFILES.length;
    }
}

ProfileEngine.RAW_PROFILES = PROFILES;

module.exports = ProfileEngine;
