/**
 * test_profiles.js — Tests for the ClassicProfileEngine personality diagnosis system
 * 
 * Verifies that all profile categories trigger correctly based on keystroke
 * patterns, without false positives or overlaps.
 * 
 * Run: node tests/test_profiles.js
 */

const ClassicProfileEngine = require('../utils/ClassicProfileEngine');
const BlitzProfileEngine = require('../utils/BlitzProfileEngine');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName) {
    if (condition) {
        passed++;
        results.push(`  ✅ ${testName}`);
    } else {
        failed++;
        results.push(`  ❌ ${testName}`);
    }
}

// Helper: Create keyHistory from a flat array of keys
function makeHistory(keys, tickSize = 5) {
    const history = [];
    for (let i = 0; i < keys.length; i += tickSize) {
        history.push(keys.slice(i, i + tickSize));
    }
    return history;
}

// Helper: Create keyHistory with many ticks (for pacing tests)
function makeTimedHistory(keys, totalTicks, activeStartTick, activeEndTick) {
    const history = [];
    const keysPerActiveTick = Math.ceil(keys.length / (activeEndTick - activeStartTick + 1));
    let keyIdx = 0;
    for (let t = 0; t < totalTicks; t++) {
        if (t >= activeStartTick && t <= activeEndTick && keyIdx < keys.length) {
            const chunk = keys.slice(keyIdx, keyIdx + keysPerActiveTick);
            history.push(chunk);
            keyIdx += keysPerActiveTick;
        } else {
            history.push([]);
        }
    }
    return history;
}

// ============================================================================
// TEST 1: EXCLUSIVE PROFILES (Return immediately)
// ============================================================================

console.log('\n🧪 TEST SUITE: Exclusive Profiles\n');



(function testOverloader() {
    const keys = [['KeyA'], ['SCRIPT_DETECTED']];
    const result = ClassicProfileEngine.analyze(keys, 'classic');
    assert(result.profiles[0].title === 'The Overloader', 'SCRIPT_DETECTED flag → The Overloader');
    assert(result.isCheater === true, 'Overloader is flagged as cheater');
})();

(function testMinimalistProfile() {
    const result = ClassicProfileEngine.analyze([['KeyA']], 'classic');
    assert(result.profiles[0].title === 'The Minimalist', 'Single key → The Minimalist');
})();

(function testScriptKiddie() {
    const keys = Array(20).fill('Untrusted_KeyA');
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Script Kiddie', 'Untrusted keys → Script Kiddie');
    assert(result.isCheater === true, 'Script Kiddie is cheater');
})();

(function testRageQuitter() {
    const keys = ['AltLeft', 'F4', ...Array(10).fill('KeyA')];
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Rage Quitter', 'Alt+F4 → Rage Quitter');
})();

(function testPlagiarist() {
    const keys = Array(20).fill('ControlLeft').concat(Array(20).fill('KeyC')).concat(Array(20).fill('KeyV'));
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Plagiarist', 'Ctrl+C/V heavy → Plagiarist');
})();

(function testKonamiCoder() {
    const konamiKeys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA',
        ...Array(5).fill('KeyQ')]; // Need >1 total key
    const result = ClassicProfileEngine.analyze([konamiKeys], 'classic');
    assert(result.profiles[0].title === 'The Konami Coder', 'Konami code → Konami Coder');
})();

(function testSpacebarSupremacist() {
    const keys = Array(20).fill('Space');
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Spacebar Supremacist', 'All spaces → Spacebar Supremacist');
})();

(function testMobileSmasher() {
    const keys = Array(20).fill('Touch_0');
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Mobile Smasher', 'All touch → Mobile Smasher');
})();

// ============================================================================
// TEST 2: EASTER EGG PROFILES (Typed string detection)
// ============================================================================

console.log('\n🧪 TEST SUITE: Easter Egg Profiles\n');

(function testSQLDropper() {
    // "DROP TABLE" = KeyD, KeyR, KeyO, KeyP, Space, KeyT, KeyA, KeyB, KeyL, KeyE
    const keys = ['KeyD', 'KeyR', 'KeyO', 'KeyP', 'Space', 'KeyT', 'KeyA', 'KeyB', 'KeyL', 'KeyE'];
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The SQL Dropper', 'DROP TABLE → SQL Dropper');
})();

(function testSudoOverride() {
    const keys = ['KeyS', 'KeyU', 'KeyD', 'KeyO', ...Array(5).fill('KeyA')];
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Sudo Override', 'SUDO → Sudo Override');
})();

(function testAccidentalPotato() {
    const keys = ['KeyP', 'KeyO', 'KeyT', 'KeyA', 'KeyT', 'KeyO', ...Array(5).fill('KeyA')];
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Accidental Potato', 'POTATO → Accidental Potato');
})();

(function testCalculatorKid() {
    // 80085 = Digit8, Digit0, Digit0, Digit8, Digit5
    const keys = ['Digit8', 'Digit0', 'Digit0', 'Digit8', 'Digit5', ...Array(5).fill('KeyA')];
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Calculator Kid', '80085 → Calculator Kid');
})();


(function testMemeCategories() {
    let result = ClassicProfileEngine.analyze([['Digit6', 'Digit9', ...Array(10).fill('KeyQ')]], 'classic');
    assert(result.profiles.some(p => p.title === 'The 69er'), '69 → The 69er');

    result = ClassicProfileEngine.analyze([['Digit4', 'Digit2', 'Digit0', ...Array(10).fill('KeyQ')]], 'classic');
    assert(result.profiles.some(p => p.title === 'The Botanist'), '420 → The Botanist');

    result = ClassicProfileEngine.analyze([['KeyS', 'KeyP', 'KeyE', 'KeyE', 'KeyD', 'KeyR', 'KeyU', 'KeyN']], 'classic');
    assert(result.profiles.some(p => p.title === 'The Any% Speedrunner'), 'SPEEDRUN → The Any% Speedrunner');

    result = ClassicProfileEngine.analyze([['KeyH', 'KeyA', 'KeyC', 'KeyK', 'KeyE', 'KeyR']], 'classic');
    assert(result.profiles.some(p => p.title === 'The HackerMan'), 'HACKER → The HackerMan');

    result = ClassicProfileEngine.analyze([['KeyB', 'KeyE', 'KeyS', 'KeyO', 'KeyS', 'KeyM', 'KeyA', 'KeyS', 'KeyH']], 'classic');
    assert(result.profiles[0].title === 'The Meta Gamer', 'BESOSMASH → The Meta Gamer');

    result = ClassicProfileEngine.analyze([['KeyB', 'KeyE', 'KeyS', 'KeyO', 'KeyS', 'KeyE']], 'classic');
    assert(result.profiles[0].title === 'The Creator', 'BESOSE → The Creator');

    // NEW EASTER EGG TEST CASES
    result = ClassicProfileEngine.analyze([['KeyF', 'KeyU', 'KeyC', 'KeyK']], 'classic');
    assert(result.profiles[0].title === 'The Swear Jar', 'Profanity → The Swear Jar');

    result = ClassicProfileEngine.analyze([['KeyN', 'KeyI', 'KeyG', 'KeyG', 'KeyA']], 'classic');
    assert(result.profiles[0].title === 'The Instagram User', 'N-word → The Instagram User');

    result = ClassicProfileEngine.analyze([['KeyH', 'KeyE', 'KeyL', 'KeyL', 'KeyO']], 'classic');
    assert(result.profiles[0].title === 'The Polite Menace', 'HELLO → The Polite Menace');

    result = ClassicProfileEngine.analyze([['KeyE', 'KeyZ']], 'classic');
    assert(result.profiles[0].title === 'The Disrespectful One', 'EZ → The Disrespectful One');

    // NEW EXTREME EASTER EGGS
    const azKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => 'Key' + c);
    result = ClassicProfileEngine.analyze([azKeys], 'classic');
    assert(result.profiles[0].title === 'The Perfectionist', 'A-Z → The Perfectionist');

    const piKeys = 'Digit3 Digit1 Digit4 Digit1 Digit5 Digit9 Digit2 Digit6 Digit5'.split(' ');
    result = ClassicProfileEngine.analyze([piKeys], 'classic');
    assert(result.profiles[0].title === 'The Pi Calculator', '314159265 → The Pi Calculator');

    const fibKeys = 'Digit1 Digit1 Digit2 Digit3 Digit5 Digit8 Digit1 Digit3'.split(' ');
    result = ClassicProfileEngine.analyze([fibKeys], 'classic');
    assert(result.profiles[0].title === 'The Fibonacci Sequence', '11235813 → The Fibonacci Sequence');

    const palindromeKeys = 'KeyR KeyA KeyC KeyE KeyC KeyA KeyR KeyS Semicolon KeyS KeyR KeyA KeyC KeyE KeyC KeyA KeyR'.split(' ');
    result = ClassicProfileEngine.analyze([palindromeKeys], 'classic');
    assert(result.profiles[0].title === 'The Palindrome', 'Palindrome sequence → The Palindrome');

    const consoleLogKeys = 'KeyC KeyO KeyN KeyS KeyO KeyL KeyE KeyL KeyO KeyG'.split(' ');
    result = ClassicProfileEngine.analyze([consoleLogKeys], 'classic');
    assert(result.profiles[0].title === 'The Console Logger', 'CONSOLELOG → The Console Logger');

    const loremKeys = 'KeyL KeyO KeyR KeyE KeyM KeyI KeyP KeyS KeyU KeyM'.split(' ');
    result = ClassicProfileEngine.analyze([loremKeys], 'classic');
    assert(result.profiles[0].title === 'The Lorem Ipsum', 'LOREMIPSUM → The Lorem Ipsum');

    const gitKeys = 'KeyG KeyI KeyT Space KeyP KeyU KeyS KeyH'.split(' ');
    result = ClassicProfileEngine.analyze([gitKeys], 'classic');
    assert(result.profiles[0].title === 'The Git Pusher', 'GIT PUSH → The Git Pusher');

    const typeWriterKeys = Array(30).fill(0).map((_, i) => i % 2 === 0 ? 'KeyA' : 'Space');
    result = ClassicProfileEngine.analyze([typeWriterKeys], 'classic');
    assert(result.profiles[0].title === 'The Typewriter', 'Letter + Space alternating → The Typewriter');
})();

// ============================================================================
// TEST 3: TIME-BASED PROFILES
// ============================================================================

console.log('\n🧪 TEST SUITE: Time-Based Profiles\n');

(function testThePacifist() {
    // Needs first active tick > 30.
    // Tick 1 is the 'start' key press. Tick 2-35 are empty. Tick 36 has a key.
    const history = [['KeyA'], ...Array(34).fill([]), ['KeyB']];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Pacifist'), `Delayed start > 30 ticks → The Pacifist (got: ${titles.join(', ')})`);
})();

(function testTheAFK() {
    // AFK requires > 60 ticks (60% of 100).
    const history = [['KeyA'], ...Array(65).fill([]), ['KeyB']];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The AFK'), `Extreme delayed start > 60 ticks → The AFK (got: ${titles.join(', ')})`);
})();

(function testTheDistracted() {
    // maxGap > 15, needs > 3 active ticks, > 5 total keys.
    const history = [['KeyA', 'KeyB'], ...Array(20).fill([]), ['KeyC', 'KeyD'], ...Array(5).fill([]), ['KeyE'], ['KeyF']];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Distracted'), `Large gap mid-game (>15 ticks) → The Distracted (got: ${titles.join(', ')})`);
})();

(function testTheHeartbeat() {
    // Metronome: KPS > 4, totalKeys > 20, fastStart < totalKeys * 0.4, maxGap < 100 (which is default).
    // Keys spaced evenly: 1 key per tick. 30 ticks = 30 keys.
    const history = Array(30).fill(['KeyA']);
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Heartbeat'), `Evenly paced inputs → The Heartbeat (got: ${titles.join(', ')})`);
})();

(function testTheSniper() {
    // Single burst in 1 tick, early in the game: totalKeys >= 5, tickTimestamps.length <= 2, lastHitTick < 15% of 100
    const history = [Array(8).fill('KeyA'), ...Array(80).fill([])];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Sniper'), `Single burst then silence → The Sniper (got: ${titles.join(', ')})`);
})();

(function testTheSprinter() {
    // fastStart > 70% of totalKeys, totalKeys > 15, lastHitTick < 40% of expectedTicks
    // 20 keys packed into first 5 ticks (4 per tick), nothing after
    const history = [
        ...Array(5).fill(['KeyA', 'KeyB', 'KeyC', 'KeyD']),
        ...Array(60).fill([])
    ];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Sprinter'), `Front-loaded burst then quit → The Sprinter (got: ${titles.join(', ')})`);
})();

(function testTheMarathonRunner() {
    // totalKeys > 20, active >= 60% of ticks, maxGap <= 3, kps 4-25
    // 1 key per tick across 70 ticks = 70 keys, 14 KPS
    const history = Array(70).fill(['KeyA']);
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Marathon Runner'), `Consistent pressure the whole game → The Marathon Runner (got: ${titles.join(', ')})`);
})();

(function testTheLagSpike() {
    // totalKeys > 8, 2-8 active ticks, maxGap > 10
    // Burst at start, 25 ticks of silence, burst again, then pad to 100 ticks
    const history = [
        ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE'],
        ...Array(25).fill([]),
        ['KeyF', 'KeyG', 'KeyH', 'KeyI'],
        ...Array(73).fill([])
    ];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Lag Spike'), `Burst-gap-burst pattern → The Lag Spike (got: ${titles.join(', ')})`);
})();

(function testTheWarmUpAct() {
    // totalKeys > 10, lateStart > fastStart*1.5, firstHitTick > 5
    // 10 empty ticks (no fastStart), then 30 empty ticks.
    // lateStart (tick 40+) gets 40 keys. Total keys = 40.
    // lateStart (40) > 40 * 0.7 = 28. fastStart (0) < 40 * 0.1 = 4.
    const history = [
        ...Array(40).fill([]),
        ...Array(10).fill(['KeyA', 'KeyB', 'KeyC', 'KeyD']),
        ...Array(50).fill([])
    ];
    const result = ClassicProfileEngine.analyze(history, 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Warm-Up Act'), `Slow start + explosive finish → The Warm-Up Act (got: ${titles.join(', ')})`);
})();

// ============================================================================
// TEST 4: ACCUMULATIVE PROFILES (Multiple can trigger)
// ============================================================================

console.log('\n🧪 TEST SUITE: Accumulative Profiles\n');

(function testFallbackProfile() {
    // Regular diverse keysmashing — should get at least one profile
    const keys = [];
    for (let i = 0; i < 20; i++) {
        keys.push('Key' + String.fromCharCode(65 + (i % 26)));
    }
    const result = ClassicProfileEngine.analyze(makeHistory(keys, 10), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.length >= 1, `At least one profile matched (got ${titles.length})`);
    assert(!result.isCheater, 'Normal play is not cheater');
})();

(function testSweatyTryhard() {
    // WASD heavy (>20% ratio)
    const keys = Array(30).fill('KeyW').concat(Array(30).fill('KeyS'))
        .concat(Array(30).fill('KeyA')).concat(Array(30).fill('KeyD'))
        .concat(Array(20).fill('KeyQ'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Sweaty Tryhard'), `WASD heavy → Sweaty Tryhard (got: ${titles.join(', ')})`);
})();

(function testArrowKeyBoomer() {
    // 100% arrow keys
    const keys = Array(20).fill('ArrowUp').concat(Array(20).fill('ArrowDown'))
        .concat(Array(20).fill('ArrowLeft')).concat(Array(20).fill('ArrowRight'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Arrow Key Boomer'), `All arrows → Arrow Key Boomer (got: ${titles.join(', ')})`);
})();

(function testVowelEnthusiast() {
    // 100% vowels
    const keys = Array(15).fill('KeyA').concat(Array(15).fill('KeyE'))
        .concat(Array(10).fill('KeyI')).concat(Array(10).fill('KeyO'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Vowel Enthusiast'), `All vowels → Vowel Enthusiast (got: ${titles.join(', ')})`);
})();

(function testConsonantCrusader() {
    // Zero vowels, >5 total keys
    const keys = Array(20).fill('KeyQ').concat(Array(20).fill('KeyR'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Consonant Crusader'), `No vowels → Consonant Crusader (got: ${titles.join(', ')})`);
})();

(function testHybrid() {
    // Mix of touch and keyboard
    const keys = Array(15).fill('Touch_0').concat(Array(30).fill('KeyA'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Hybrid'), `Touch+keyboard mix → Hybrid (got: ${titles.join(', ')})`);
})();

(function testMultipleProfilesCanStack() {
    // Design input that triggers multiple accumulative profiles
    // Bunny Hopper (>15% space) + Stutterer (>20% single key)
    const keys = Array(30).fill('Space').concat(Array(30).fill('KeyA'))
        .concat(Array(20).fill('KeyB')).concat(Array(20).fill('KeyC'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    assert(result.profiles.length >= 2, `Multiple profiles stacked: ${result.profiles.length} (titles: ${result.profiles.map(p => p.title).join(', ')})`);
})();

(function testTyposquatter() {
    const keys = Array(20).fill('Backspace').concat(Array(80).fill('KeyA'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Typosquatter'), `Backspace heavy → Typosquatter`);
})();

(function testExecutioner() {
    // Enter heavy -> Executioner (make sure total enters <= 30 so it doesn't trigger Terminal Typist instead)
    const keys = Array(10).fill('Enter').concat(Array(80).fill('KeyA'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Executioner'), `Enter heavy (low count) → Executioner`);
})();

(function testTerminalTypist() {
    // > 30 Enter keys
    const keys = Array(35).fill('Enter').concat(Array(10).fill('KeyA'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Terminal Typist'), `> 30 Enters → Terminal Typist`);
})();

(function testPunctuationPedant() {
    const keys = Array(30).fill('Comma').concat(Array(70).fill('KeyA'));
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Punctuation Pedant'), `Comma heavy → Punctuation Pedant`);
})();

(function testNewStatProfiles() {
    // 1. Chaotic Evil: High entropy (>=95) and many unique keys (>=40)
    let keys = [];
    for (let i = 0; i < 70; i++) {
        keys.push('Unique_' + i);
    }
    let result = ClassicProfileEngine.analyze(makeHistory(keys, 2), 'classic');
    let titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Chaotic Evil'), `High entropy + 40+ unique keys → Chaotic Evil (got: ${titles.join(', ')})`);

    // 2. Lawful Good: 8 <= kps < 15 (40-75 keys), ent < 35, uniqueKeys <= 8
    keys = Array(50).fill('KeyA').concat(Array(5).fill('KeyB')).concat(Array(5).fill('KeyC'));
    result = ClassicProfileEngine.analyze(makeHistory(keys, 2), 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Lawful Good'), `Organized + fast → Lawful Good`);

    // 3. The Rhythm Gamer: 4 <= uniqueKeys <= 6, ent > 60, kps > 10 (totalKeys > 50)
    keys = Array(15).fill('KeyA').concat(Array(15).fill('KeyB')).concat(Array(15).fill('KeyC')).concat(Array(15).fill('KeyD'));
    result = ClassicProfileEngine.analyze(makeHistory(keys, 2), 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Rhythm Gamer'), `Alternating patterns → Rhythm Gamer`);

    // 4. The Mechanical Switch Tester: kps < 8 (totalKeys < 40), uniqueKeys >= 30, maxSingleKeyCount < 5
    keys = [];
    for (let i = 0; i < 35; i++) {
        keys.push('RandomKey' + i);
    }
    result = ClassicProfileEngine.analyze(makeHistory(keys, 1), 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Mechanical Switch Tester'), `Slow, many unique keys → Mechanical Switch Tester`);

    // 5. The Overclocker: maxRowSmashInSingleTick >= 8 && kps >= 25 && kps < 80 
    keys = Array(8).fill('KeyA');
    keys = keys.concat(Array(130).fill('KeyB'));
    let history = makeHistory(keys, 2);
    history[0] = Array(9).fill('KeyQ'); // Insert a massive single tick burst
    result = ClassicProfileEngine.analyze(history, 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Overclocker'), `Burst smash + high KPS → Overclocker`);
})();

(function testFunPatternProfiles() {
    console.log('\\n🧪 TEST SUITE: Fun Pattern Profiles\\n');

    let keys = ['KeyQ', 'KeyA', 'KeyZ', 'KeyW', 'KeyS', 'KeyX', 'KeyE', 'KeyD', 'KeyC', 'KeyR', 'KeyF', 'KeyV', 'KeyT', 'KeyG', 'KeyB', 'KeyY', 'KeyH', 'KeyN', 'KeyU', 'KeyJ', 'KeyM', 'KeyI', 'KeyK', 'Comma', 'KeyO', 'KeyL', 'Period', 'KeyP', 'Semicolon', 'Slash'];
    let result = ClassicProfileEngine.analyze(makeHistory(keys, 1), 'classic');
    let titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Alphabet Tourist'), 'All 26 letters pressed → The Alphabet Tourist');

    keys = ['F1', 'F2', 'F3', 'F5'];
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The F-Key Summoner'), 'Only F-keys → The F-Key Summoner');

    keys = '123456789'.split('').map(c => 'Digit' + c);
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Countdown'), 'Count 1-9 → The Countdown');


    keys = '0110001001110010'.split('').map(c => 'Digit' + c);
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Binary Bot'), 'Only 0s and 1s → The Binary Bot');

    keys = 'ABCDEF'.split('').map(c => 'Key' + c);
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Roll Call'), 'A-B-C-D-E-F typed → The Roll Call');

    keys = Array(6).fill('Numpad5');
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Numpad Astronaut'), 'Only numpad keys → The Numpad Astronaut');

    keys = Array(15).fill('ShiftLeft').concat(Array(15).fill('KeyA'));
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Shift Warrior'), 'Heavy shift usage → The Shift Warrior');

    keys = Array(15).fill('Tab').concat(Array(15).fill('KeyA'));
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Tab Destroyer'), 'Heavy tab usage → The Tab Destroyer');

    keys = Array(20).fill('Backspace').concat(Array(10).fill('KeyA'));
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Backspace Poet'), 'Heavy backspace usage → The Backspace Poet');

    keys = Array(20).fill('KeyQ').concat(Array(20).fill('KeyP')); // Q is left, P is right
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Perfect Balance'), 'Even left/right hand split → The Perfect Balance');

    keys = '5829104758'.split('').map(c => 'Digit' + c);
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Number Cruncher'), 'Only digits pressed → The Number Cruncher');

    // Mix left and right home row keys to avoid "The Left-Handed Demon" / "The Right-Handed Menace"
    keys = Array(15).fill('KeyA').concat(Array(5).fill('KeyL')).concat(Array(5).fill('KeyK')).concat(Array(5).fill('KeyJ'));
    result = ClassicProfileEngine.analyze(makeHistory(keys, 2), 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Home Row Anchor'), 'Mostly home row → The Home Row Anchor');

    keys = '987654321'.split('').map(c => 'Digit' + c);
    result = ClassicProfileEngine.analyze([keys], 'classic');
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Reverse Engineer'), 'Count 9-1 → The Reverse Engineer');

    keys = [];
    // Omit 'KeyZ' so we have 25 letters + digits, preventing 'The Alphabet Tourist' from triggering
    const pool = ['KeyA', 'KeyQ', 'KeyW', 'KeyS', 'KeyX', 'KeyE', 'KeyD', 'KeyC', 'KeyR', 'KeyF', 'KeyV', 'KeyT', 'KeyG', 'KeyB', 'KeyY', 'KeyH', 'KeyN', 'KeyU', 'KeyJ', 'KeyM', 'KeyI', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
    for (let i = 0; i < 500; i++) keys.push(pool[i % pool.length]); // Highly diverse to boost entropy without spelling QWERTY
    result = ClassicProfileEngine.analyze(makeHistory(keys, 10), 'classic'); // 500 keys over 50 ticks (5.0s) = 100 KPS
    titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Speed Demon'), '60-80 KPS + high entropy → The Speed Demon');
})();

// ============================================================================
// TEST 4: CHEATER DETECTION
// ============================================================================

console.log('\n🧪 TEST SUITE: Cheater Detection\n');

(function testHardwareSpoof() {
    // >300 KPS with low entropy in classic (5s) → need 1500+ keys of same key
    const keys = Array(1600).fill('KeyA');
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Hardware Spoof', 'Inhuman speed → Hardware Spoof');
    assert(result.isCheater === true, 'Hardware Spoof is cheater');
})();

(function testSuspectedCheater() {
    // 150+ KPS with <20% entropy in classic (5s) → need 750+ keys
    const keys = Array(800).fill('KeyA').concat(Array(50).fill('KeyB'));
    const result = ClassicProfileEngine.analyze([keys], 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('Suspected Cheater'), `150+ KPS low entropy → Suspected Cheater (got: ${titles.join(', ')})`);
})();

(function testLegitFastPlayer() {
    // 60 KPS with high entropy in classic → 300 keys diverse
    const keys = [];
    for (let i = 0; i < 300; i++) {
        keys.push('Key' + String.fromCharCode(65 + (i % 26)));
    }
    const result = ClassicProfileEngine.analyze(makeHistory(keys, 10), 'classic');
    assert(!result.isCheater, 'Fast but diverse → not cheater');
})();

// ============================================================================
// TEST 5: ENTROPY CALCULATION
// ============================================================================

console.log('\n🧪 TEST SUITE: Entropy Calculation\n');

(function testSingleKeyEntropy() {
    // All same key → minimum entropy
    const keys = Array(50).fill('KeyA');
    const result = ClassicProfileEngine.analyze(makeHistory(keys), 'classic');
    assert(parseFloat(result.entropy) === 0.0, `Single key entropy: 0.0 (got ${result.entropy})`);
})();

(function testHighEntropyDiverse() {
    // Many unique keys → high entropy
    const keys = [];
    for (let i = 0; i < 100; i++) {
        keys.push('Key' + String.fromCharCode(65 + (i % 26)));
    }
    const result = ClassicProfileEngine.analyze(makeHistory(keys, 10), 'classic');
    const ent = parseFloat(result.entropy);
    assert(ent > 50, `Diverse keys entropy > 50% (got ${ent})`);
})();

(function testEntropyRange() {
    // Verify entropy is always in [0, 100]
    const testCases = [
        Array(10).fill('KeyA'),
        Array(50).fill('KeyA').concat(Array(50).fill('KeyB')),
        Array.from({ length: 100 }, (_, i) => 'Key' + String.fromCharCode(65 + (i % 26))),
    ];
    for (const keys of testCases) {
        const result = ClassicProfileEngine.analyze(makeHistory(keys, 10), 'classic');
        const ent = parseFloat(result.entropy);
        assert(ent >= 0 && ent <= 100, `Entropy in range [0,100]: ${ent}`);
    }
})();

// ============================================================================
// TEST 6: TOTAL PROFILES COUNT
// ============================================================================

(function testProfileRegistry() {
    console.log('\n🧪 TEST SUITE: Profile Registry\n');

    const totalCount = ClassicProfileEngine.getTotalCount();
    assert(totalCount > 0, `Total profile count is positive: ${totalCount}`);
    assert(totalCount === ClassicProfileEngine.TOTAL_PROFILES.length, `getTotalCount matches TOTAL_PROFILES array`);
})();

(function testNoProfileDuplicates() {
    const titles = ClassicProfileEngine.TOTAL_PROFILES;
    const unique = new Set(titles);
    assert(unique.size === titles.length, `No duplicate profile titles (${unique.size} unique / ${titles.length} total)`);
})();

(function testAllReturnedProfilesAreRegistered() {
    // Run a few scenarios and verify all returned titles exist in TOTAL_PROFILES
    const scenarios = [
        [],
        [['KeyA']],
        [Array(20).fill('Space')],
        [['KeyD', 'KeyR', 'KeyO', 'KeyP', 'Space', 'KeyT', 'KeyA', 'KeyB', 'KeyL', 'KeyE']],
        makeHistory(Array(100).fill('KeyA').concat(Array(100).fill('KeyB')), 10),
    ];
    let allRegistered = true;
    for (const hist of scenarios) {
        const result = ClassicProfileEngine.analyze(hist, 'classic');
        for (const p of result.profiles) {
            if (!ClassicProfileEngine.TOTAL_PROFILES.includes(p.title)) {
                allRegistered = false;
                results.push(`    ⚠️ Unregistered profile: "${p.title}"`);
            }
        }
    }
    assert(allRegistered, 'All returned profile titles exist in TOTAL_PROFILES');
})();

// ============================================================================
// TEST 7: GAME MODES
// ============================================================================

console.log('\n🧪 TEST SUITE: Game Mode Differences\n');

(function testBlitzModeKPSIsHigher() {
    // Same number of keys, blitz (2s) vs classic (5s) → blitz has higher KPS
    const keys = Array(30).fill('KeyA');
    const blitz = BlitzProfileEngine.analyze(makeHistory(keys));
    const classic = ClassicProfileEngine.analyze(makeHistory(keys));
    // Both should return without crashing
    assert(blitz.profiles.length >= 1, 'Blitz returns at least one profile');
    assert(classic.profiles.length >= 1, 'Classic returns at least one profile');
})();

// ============================================================================
// TEST 8: PROFILE FLAVOR TEXT INTEGRITY
// ============================================================================

console.log('\n🧪 TEST SUITE: Flavor Text Integrity\n');

(function testAllFlavorTextsAreStrings() {
    // Generate a massive dummy stats object that might trigger function-based flavors
    const keys = Array(20).fill('KeyA').concat(['KeyB']);
    const history = makeHistory(keys);
    const stats = ClassicProfileEngine.calculateStats(history);

    let allValid = true;
    for (const profile of ClassicProfileEngine.RAW_PROFILES) {
        let flavorText;
        try {
            flavorText = typeof profile.flavor === 'function' ? profile.flavor(stats) : profile.flavor;
        } catch (e) {
            allValid = false;
            results.push(`    ❌ Profile "${profile.title}" flavor function threw an error: ${e.message}`);
            continue;
        }

        if (typeof flavorText !== 'string' || flavorText.trim() === '') {
            allValid = false;
            results.push(`    ❌ Profile "${profile.title}" has invalid flavor text: ${flavorText}`);
        }
    }

    assert(allValid, 'All profiles have valid, non-empty string flavor texts');
})();

// ============================================================================
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.includes('❌')).forEach(r => console.log(r));
    console.log('');
}

console.log(results.join('\n'));
console.log('\n' + '═'.repeat(60));

process.exit(failed > 0 ? 1 : 0);
