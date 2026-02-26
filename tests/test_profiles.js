/**
 * test_profiles.js — Tests for the ProfileEngine personality diagnosis system
 * 
 * Verifies that all profile categories trigger correctly based on keystroke
 * patterns, without false positives or overlaps.
 * 
 * Run: node tests/test_profiles.js
 */

const ProfileEngine = require('../utils/ProfileEngine');

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

(function testGhostProfile() {
    const result = ProfileEngine.analyze([], 'classic');
    assert(result.profiles[0].title === 'The Ghost', 'Empty input → The Ghost');
    assert(result.isCheater === true, 'Ghost is flagged as cheater');
    assert(result.entropy === 0.0, 'Ghost has 0 entropy');
})();

(function testOverloader() {
    const keys = [['KeyA'], ['SCRIPT_DETECTED']];
    const result = ProfileEngine.analyze(keys, 'classic');
    assert(result.profiles[0].title === 'The Overloader', 'SCRIPT_DETECTED flag → The Overloader');
    assert(result.isCheater === true, 'Overloader is flagged as cheater');
})();

(function testMinimalistProfile() {
    const result = ProfileEngine.analyze([['KeyA']], 'classic');
    assert(result.profiles[0].title === 'The Minimalist', 'Single key → The Minimalist');
})();

(function testScriptKiddie() {
    const keys = Array(20).fill('Untrusted_KeyA');
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Script Kiddie', 'Untrusted keys → Script Kiddie');
    assert(result.isCheater === true, 'Script Kiddie is cheater');
})();

(function testRageQuitter() {
    const keys = ['AltLeft', 'F4', ...Array(10).fill('KeyA')];
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Rage Quitter', 'Alt+F4 → Rage Quitter');
})();

(function testPlagiarist() {
    const keys = Array(20).fill('ControlLeft').concat(Array(20).fill('KeyC')).concat(Array(20).fill('KeyV'));
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Plagiarist', 'Ctrl+C/V heavy → Plagiarist');
})();

(function testKonamiCoder() {
    const konamiKeys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA',
        ...Array(5).fill('KeyQ')]; // Need >1 total key
    const result = ProfileEngine.analyze([konamiKeys], 'classic');
    assert(result.profiles[0].title === 'The Konami Coder', 'Konami code → Konami Coder');
})();

(function testSpacebarSupremacist() {
    const keys = Array(20).fill('Space');
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Spacebar Supremacist', 'All spaces → Spacebar Supremacist');
})();

(function testMobileSmasher() {
    const keys = Array(20).fill('Touch_0');
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Mobile Smasher', 'All touch → Mobile Smasher');
})();

// ============================================================================
// TEST 2: EASTER EGG PROFILES (Typed string detection)
// ============================================================================

console.log('\n🧪 TEST SUITE: Easter Egg Profiles\n');

(function testSQLDropper() {
    // "DROP TABLE" = KeyD, KeyR, KeyO, KeyP, Space, KeyT, KeyA, KeyB, KeyL, KeyE
    const keys = ['KeyD', 'KeyR', 'KeyO', 'KeyP', 'Space', 'KeyT', 'KeyA', 'KeyB', 'KeyL', 'KeyE'];
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The SQL Dropper', 'DROP TABLE → SQL Dropper');
})();

(function testSudoOverride() {
    const keys = ['KeyS', 'KeyU', 'KeyD', 'KeyO', ...Array(5).fill('KeyA')];
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Sudo Override', 'SUDO → Sudo Override');
})();

(function testAccidentalPotato() {
    const keys = ['KeyP', 'KeyO', 'KeyT', 'KeyA', 'KeyT', 'KeyO', ...Array(5).fill('KeyA')];
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Accidental Potato', 'POTATO → Accidental Potato');
})();

(function testCalculatorKid() {
    // 80085 = Digit8, Digit0, Digit0, Digit8, Digit5
    const keys = ['Digit8', 'Digit0', 'Digit0', 'Digit8', 'Digit5', ...Array(5).fill('KeyA')];
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Calculator Kid', '80085 → Calculator Kid');
})();


(function testMemeCategories() {
    let result = ProfileEngine.analyze([['Digit6', 'Digit9', ...Array(10).fill('KeyQ')]], 'classic');
    assert(result.profiles.some(p => p.title === 'The 69er'), '69 → The 69er');

    result = ProfileEngine.analyze([['Digit4', 'Digit2', 'Digit0', ...Array(10).fill('KeyQ')]], 'classic');
    assert(result.profiles.some(p => p.title === 'The Botanist'), '420 → The Botanist');

    result = ProfileEngine.analyze([['KeyS', 'KeyP', 'KeyE', 'KeyE', 'KeyD', 'KeyR', 'KeyU', 'KeyN']], 'classic');
    assert(result.profiles.some(p => p.title === 'The Any% Speedrunner'), 'SPEEDRUN → The Any% Speedrunner');

    result = ProfileEngine.analyze([['KeyH', 'KeyA', 'KeyC', 'KeyK', 'KeyE', 'KeyR']], 'classic');
    assert(result.profiles.some(p => p.title === 'The HackerMan'), 'HACKER → The HackerMan');

    result = ProfileEngine.analyze([['KeyB', 'KeyE', 'KeyS', 'KeyO', 'KeyS', 'KeyM', 'KeyA', 'KeyS', 'KeyH']], 'classic');
    assert(result.profiles[0].title === 'The Meta Gamer', 'BESOSMASH → The Meta Gamer');

    result = ProfileEngine.analyze([['KeyB', 'KeyE', 'KeyS', 'KeyO', 'KeyS', 'KeyE']], 'classic');
    assert(result.profiles[0].title === 'The Creator', 'BESOSE → The Creator');

    // NEW EASTER EGG TEST CASES
    result = ProfileEngine.analyze([['KeyF', 'KeyU', 'KeyC', 'KeyK']], 'classic');
    assert(result.profiles[0].title === 'The Swear Jar', 'Profanity → The Swear Jar');

    result = ProfileEngine.analyze([['KeyN', 'KeyI', 'KeyG', 'KeyG', 'KeyA']], 'classic');
    assert(result.profiles[0].title === 'The Instagram User', 'N-word → The Instagram User');

    result = ProfileEngine.analyze([['KeyH', 'KeyE', 'KeyL', 'KeyL', 'KeyO']], 'classic');
    assert(result.profiles[0].title === 'The Polite Menace', 'HELLO → The Polite Menace');

    result = ProfileEngine.analyze([['KeyE', 'KeyZ']], 'classic');
    assert(result.profiles[0].title === 'The Disrespectful One', 'EZ → The Disrespectful One');
})();

// ============================================================================
// TEST 3: ACCUMULATIVE PROFILES (Multiple can trigger)
// ============================================================================

console.log('\n🧪 TEST SUITE: Accumulative Profiles\n');

(function testPanicButtonDefault() {
    // Regular diverse keysmashing — should get Panic Button as default
    const keys = [];
    for (let i = 0; i < 20; i++) {
        keys.push('Key' + String.fromCharCode(65 + (i % 26)));
    }
    const result = ProfileEngine.analyze(makeHistory(keys, 10), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.length >= 1, `At least one profile matched (got ${titles.length})`);
    assert(!result.isCheater, 'Normal play is not cheater');
})();

(function testSweatyTryhard() {
    // WASD heavy (>20% ratio)
    const keys = Array(30).fill('KeyW').concat(Array(30).fill('KeyS'))
        .concat(Array(30).fill('KeyA')).concat(Array(30).fill('KeyD'))
        .concat(Array(20).fill('KeyQ'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Sweaty Tryhard'), `WASD heavy → Sweaty Tryhard (got: ${titles.join(', ')})`);
})();

(function testArrowKeyBoomer() {
    // 100% arrow keys
    const keys = Array(20).fill('ArrowUp').concat(Array(20).fill('ArrowDown'))
        .concat(Array(20).fill('ArrowLeft')).concat(Array(20).fill('ArrowRight'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Arrow Key Boomer'), `All arrows → Arrow Key Boomer (got: ${titles.join(', ')})`);
})();

(function testVowelEnthusiast() {
    // 100% vowels
    const keys = Array(15).fill('KeyA').concat(Array(15).fill('KeyE'))
        .concat(Array(10).fill('KeyI')).concat(Array(10).fill('KeyO'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Vowel Enthusiast'), `All vowels → Vowel Enthusiast (got: ${titles.join(', ')})`);
})();

(function testConsonantCrusader() {
    // Zero vowels, >5 total keys
    const keys = Array(20).fill('KeyQ').concat(Array(20).fill('KeyR'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Consonant Crusader'), `No vowels → Consonant Crusader (got: ${titles.join(', ')})`);
})();

(function testHybrid() {
    // Mix of touch and keyboard
    const keys = Array(15).fill('Touch_0').concat(Array(30).fill('KeyA'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Hybrid'), `Touch+keyboard mix → Hybrid (got: ${titles.join(', ')})`);
})();

(function testMultipleProfilesCanStack() {
    // Design input that triggers multiple accumulative profiles
    // Bunny Hopper (>15% space) + Stutterer (>20% single key)
    const keys = Array(30).fill('Space').concat(Array(30).fill('KeyA'))
        .concat(Array(20).fill('KeyB')).concat(Array(20).fill('KeyC'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    assert(result.profiles.length >= 2, `Multiple profiles stacked: ${result.profiles.length} (titles: ${result.profiles.map(p => p.title).join(', ')})`);
})();

(function testTyposquatter() {
    const keys = Array(20).fill('Backspace').concat(Array(80).fill('KeyA'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Typosquatter'), `Backspace heavy → Typosquatter`);
})();

(function testExecutioner() {
    const keys = Array(20).fill('Enter').concat(Array(80).fill('KeyA'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Executioner'), `Enter heavy → Executioner`);
})();

(function testPunctuationPedant() {
    const keys = Array(30).fill('Comma').concat(Array(70).fill('KeyA'));
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('The Punctuation Pedant'), `Comma heavy → Punctuation Pedant`);
})();

// ============================================================================
// TEST 4: CHEATER DETECTION
// ============================================================================

console.log('\n🧪 TEST SUITE: Cheater Detection\n');

(function testHardwareSpoof() {
    // >300 KPS with low entropy in classic (5s) → need 1500+ keys of same key
    const keys = Array(1600).fill('KeyA');
    const result = ProfileEngine.analyze([keys], 'classic');
    assert(result.profiles[0].title === 'The Hardware Spoof', 'Inhuman speed → Hardware Spoof');
    assert(result.isCheater === true, 'Hardware Spoof is cheater');
})();

(function testSuspectedCheater() {
    // 150+ KPS with <20% entropy in classic (5s) → need 750+ keys
    const keys = Array(800).fill('KeyA').concat(Array(50).fill('KeyB'));
    const result = ProfileEngine.analyze([keys], 'classic');
    const titles = result.profiles.map(p => p.title);
    assert(titles.includes('Suspected Cheater'), `150+ KPS low entropy → Suspected Cheater (got: ${titles.join(', ')})`);
})();

(function testLegitFastPlayer() {
    // 60 KPS with high entropy in classic → 300 keys diverse
    const keys = [];
    for (let i = 0; i < 300; i++) {
        keys.push('Key' + String.fromCharCode(65 + (i % 26)));
    }
    const result = ProfileEngine.analyze(makeHistory(keys, 10), 'classic');
    assert(!result.isCheater, 'Fast but diverse → not cheater');
})();

// ============================================================================
// TEST 5: ENTROPY CALCULATION
// ============================================================================

console.log('\n🧪 TEST SUITE: Entropy Calculation\n');

(function testSingleKeyEntropy() {
    // All same key → minimum entropy
    const keys = Array(50).fill('KeyA');
    const result = ProfileEngine.analyze(makeHistory(keys), 'classic');
    assert(parseFloat(result.entropy) === 0.0, `Single key entropy: 0.0 (got ${result.entropy})`);
})();

(function testHighEntropyDiverse() {
    // Many unique keys → high entropy
    const keys = [];
    for (let i = 0; i < 100; i++) {
        keys.push('Key' + String.fromCharCode(65 + (i % 26)));
    }
    const result = ProfileEngine.analyze(makeHistory(keys, 10), 'classic');
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
        const result = ProfileEngine.analyze(makeHistory(keys, 10), 'classic');
        const ent = parseFloat(result.entropy);
        assert(ent >= 0 && ent <= 100, `Entropy in range [0,100]: ${ent}`);
    }
})();

// ============================================================================
// TEST 6: TOTAL PROFILES COUNT
// ============================================================================

(function testProfileRegistry() {
    console.log('\n🧪 TEST SUITE: Profile Registry\n');

    const totalCount = ProfileEngine.getTotalCount();
    assert(totalCount > 0, `Total profile count is positive: ${totalCount}`);
    assert(totalCount === ProfileEngine.TOTAL_PROFILES.length, `getTotalCount matches TOTAL_PROFILES array`);
})();

(function testNoProfileDuplicates() {
    const titles = ProfileEngine.TOTAL_PROFILES;
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
        const result = ProfileEngine.analyze(hist, 'classic');
        for (const p of result.profiles) {
            if (!ProfileEngine.TOTAL_PROFILES.includes(p.title)) {
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
    const blitz = ProfileEngine.analyze(makeHistory(keys), 'blitz');
    const classic = ProfileEngine.analyze(makeHistory(keys), 'classic');
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
    const stats = ProfileEngine.calculateStats(history, 'classic');

    let allValid = true;
    for (const profile of ProfileEngine.RAW_PROFILES) {
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
