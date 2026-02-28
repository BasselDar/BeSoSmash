/**
 * test_scoring.js — Tests for the Smash Score formula
 * 
 * Formula: keys × 1337 + entropy² × 1.7 + KPS × 69 + profiles × 420
 * 
 * Run: node tests/test_scoring.js
 */

const { calculateSmashScore } = require('../utils/scoring');

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

// ============================================================================
// TEST 1: BASIC FORMULA CORRECTNESS
// ============================================================================

console.log('\n🧪 TEST SUITE: Smash Score Formula\n');

(function testBasicCalculation() {
    const score = calculateSmashScore(100, 50, 20, 5);
    // Expected: 100*1337 + 50²*1.7 + 20*69 + 5*420
    //         = 133700 + 4250 + 1380 + 2100 = 141430
    assert(score === 141430, `Basic calculation: 141430 (got ${score})`);
})();

(function testZeroInputs() {
    const score = calculateSmashScore(0, 0, 0, 0);
    assert(score === 0, `All zeros returns 0 (got ${score})`);
})();

(function testKeysOnlyDominate() {
    const keysOnly = calculateSmashScore(500, 0, 0, 0);
    const withEntropy = calculateSmashScore(500, 10, 0, 0);
    // Keys: 500 * 1337 = 668500
    assert(keysOnly === 668500, `Keys-only score: 668500 (got ${keysOnly})`);
    assert(withEntropy > keysOnly, 'Entropy bonus adds to score');
})();

(function testProfileCountBonus() {
    const noProfiles = calculateSmashScore(100, 50, 20, 0);
    const fiveProfiles = calculateSmashScore(100, 50, 20, 5);
    const diff = fiveProfiles - noProfiles;
    // 5 profiles × 420 = 2100
    assert(diff === 2100, `5 profiles add exactly 2100 (got ${diff})`);
})();

(function testEntropySquared() {
    // entropy² × 1.7 → high entropy has quadratic impact
    const lowEntropy = calculateSmashScore(0, 10, 0, 0);  // 10² × 1.7 = 170
    const highEntropy = calculateSmashScore(0, 100, 0, 0); // 100² × 1.7 = 17000
    assert(lowEntropy === 170, `Low entropy: 170 (got ${lowEntropy})`);
    assert(highEntropy === 17000, `High entropy: 17000 (got ${highEntropy})`);
    assert(highEntropy === lowEntropy * 100, 'Quadratic scaling: 10x entropy = 100x score');
})();

(function testRoundingBehavior() {
    // Verify Math.round is applied
    const score = calculateSmashScore(1, 3, 1, 1);
    // 1*1337 + 9*1.7 + 1*69 + 1*420 = 1337 + 15.3 + 69 + 420 = 1841.3 → 1841
    assert(score === 1841, `Rounding: 1841 (got ${score})`);
})();

(function testKPSContribution() {
    const zeroKps = calculateSmashScore(0, 0, 0, 0);
    const highKps = calculateSmashScore(0, 0, 100, 0); // 100 × 69 = 6900
    assert(highKps === 6900, `100 KPS adds 6900 (got ${highKps})`);
})();

// ============================================================================
// TEST 2: REALISTIC GAME SCENARIOS
// ============================================================================

console.log('\n🧪 TEST SUITE: Realistic Game Scenarios\n');

(function testCasualPlayer() {
    // 50 keys, 30% entropy, 10 KPS, 2 profiles
    const score = calculateSmashScore(50, 30, 10, 2);
    // 50*1337 + 900*1.7 + 10*69 + 2*420 = 66850 + 1530 + 690 + 840 = 69910
    assert(score === 69910, `Casual player score: 69910 (got ${score})`);
    assert(score > 50000, 'Casual player gets a decent score');
})();

(function testProPlayer() {
    // 500 keys, 80% entropy, 100 KPS, 10 profiles
    const score = calculateSmashScore(500, 80, 100, 10);
    // 500*1337 + 6400*1.7 + 100*69 + 10*420 = 668500 + 10880 + 6900 + 4200 = 690480
    assert(score === 690480, `Pro player score: 690480 (got ${score})`);
})();

(function testBlitzMode() {
    // Blitz: shorter time, fewer keys but higher KPS
    const blitz = calculateSmashScore(80, 40, 40, 3);
    // 80*1337 + 1600*1.7 + 40*69 + 3*420 = 106960 + 2720 + 2760 + 1260 = 113700
    assert(blitz === 113700, `Blitz mode score: 113700 (got ${blitz})`);
})();

(function testCompletionist() {
    // Player with many profiles but average game
    const score = calculateSmashScore(100, 50, 20, 90);
    // 100*1337 + 2500*1.7 + 20*69 + 90*420 = 133700 + 4250 + 1380 + 37800 = 177130
    assert(score === 177130, `Completionist score: 177130 (got ${score})`);
    // Profile bonus is significant: 90*420 = 37800
    const noProfiles = calculateSmashScore(100, 50, 20, 0);
    assert(score - noProfiles === 37800, '90 profiles add 37800 bonus');
})();

// ============================================================================
// TEST 3: EDGE CASES
// ============================================================================

console.log('\n🧪 TEST SUITE: Edge Cases\n');

(function testSingleKeypress() {
    const score = calculateSmashScore(1, 0, 1, 0);
    // 1*1337 + 0 + 1*69 + 0 = 1406
    assert(score === 1406, `Single keypress: 1406 (got ${score})`);
})();

(function testVeryHighValues() {
    // Stress test: extreme inputs
    const score = calculateSmashScore(9999, 100, 999, 100);
    assert(typeof score === 'number', 'Returns a number for extreme inputs');
    assert(!isNaN(score), 'Not NaN for extreme inputs');
    assert(score > 0, 'Positive for extreme inputs');
})();

(function testNegativeInputsHandled() {
    // Negative inputs shouldn't crash
    const score = calculateSmashScore(-1, -1, -1, -1);
    assert(typeof score === 'number', 'Returns a number for negative inputs');
    assert(!isNaN(score), 'Not NaN for negative inputs');
})();

(function testDecimalInputs() {
    const score = calculateSmashScore(10, 33.3, 15.5, 3);
    assert(typeof score === 'number', 'Returns a number for decimal inputs');
    assert(Number.isInteger(score), 'Returns an integer (Math.round)');
})();

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.includes('❌')).forEach(r => console.log(r));
    console.log('');
}

console.log(results.join('\n'));
console.log('\n' + '═'.repeat(60));

process.exit(failed > 0 ? 1 : 0);
