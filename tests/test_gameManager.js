/**
 * test_gameManager.js — Tests for game state management
 * 
 * Tests the gameManager module's CRUD operations for active games,
 * cooldowns, and broadcast throttling.
 * 
 * Run: node tests/test_gameManager.js
 */

const gm = require('../controllers/gameManager');

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
// TEST 1: GAME STATE CRUD
// ============================================================================

console.log('\n🧪 TEST SUITE: Game State Management\n');

(function testSetAndGetGame() {
    const game = { name: 'TestPlayer', score: 0, isActive: true, mode: 'classic' };
    gm.setGame('socket-1', game);
    const retrieved = gm.getGame('socket-1');
    assert(retrieved !== null, 'Game is retrievable after setting');
    assert(retrieved.name === 'TestPlayer', 'Game name matches');
    assert(retrieved.mode === 'classic', 'Game mode matches');
    assert(retrieved.isActive === true, 'Game is active');
})();

(function testGetNonexistentGame() {
    const game = gm.getGame('nonexistent-socket');
    assert(game === undefined, 'Returns undefined for nonexistent socket');
})();

(function testDeleteGame() {
    gm.setGame('socket-delete', { name: 'Deleteme', score: 0 });
    assert(gm.getGame('socket-delete') !== undefined, 'Game exists before delete');
    gm.deleteGame('socket-delete');
    assert(gm.getGame('socket-delete') === undefined, 'Game undefined after delete');
})();

(function testMultipleGames() {
    gm.setGame('player-a', { name: 'Alice', score: 50 });
    gm.setGame('player-b', { name: 'Bob', score: 100 });
    gm.setGame('player-c', { name: 'Charlie', score: 75 });

    assert(gm.getGame('player-a').name === 'Alice', 'Player A is Alice');
    assert(gm.getGame('player-b').name === 'Bob', 'Player B is Bob');
    assert(gm.getGame('player-c').name === 'Charlie', 'Player C is Charlie');

    // Delete one, others should remain
    gm.deleteGame('player-b');
    assert(gm.getGame('player-b') === undefined, 'Player B deleted');
    assert(gm.getGame('player-a').name === 'Alice', 'Player A still exists');
    assert(gm.getGame('player-c').name === 'Charlie', 'Player C still exists');
})();

(function testOverwriteGame() {
    gm.setGame('overwrite-test', { name: 'First', score: 10 });
    gm.setGame('overwrite-test', { name: 'Second', score: 20 });
    const game = gm.getGame('overwrite-test');
    assert(game.name === 'Second', 'Game overwritten with new data');
    assert(game.score === 20, 'Score updated on overwrite');
})();

(function testMutateRetrievedGame() {
    gm.setGame('mutable', { name: 'Mutable', score: 0, isActive: true });
    const game = gm.getGame('mutable');
    game.score = 999;
    game.isActive = false;
    const updated = gm.getGame('mutable');
    assert(updated.score === 999, 'Mutations persist (shared reference)');
    assert(updated.isActive === false, 'isActive mutation persists');
})();

// ============================================================================
// TEST 2: COOLDOWN MANAGEMENT
// ============================================================================

console.log('\n🧪 TEST SUITE: Cooldown Management\n');

(function testSetAndGetCooldown() {
    gm.setCooldown('cd-1', 1000);
    assert(gm.getCooldown('cd-1') === 1000, 'Cooldown set and retrieved');
})();

(function testGetNonexistentCooldown() {
    assert(gm.getCooldown('no-cd') === 0, 'Nonexistent cooldown returns 0');
})();

(function testDeleteCooldown() {
    gm.setCooldown('cd-del', 5000);
    assert(gm.getCooldown('cd-del') === 5000, 'Cooldown exists before delete');
    gm.deleteCooldown('cd-del');
    assert(gm.getCooldown('cd-del') === 0, 'Cooldown returns 0 after delete');
})();

(function testCooldownEnforcement() {
    // Simulate: game ends, cooldown set, 2 seconds pass, new game started
    const now = Date.now();
    gm.setCooldown('rate-test', now);

    // Immediately after: within 3s cooldown
    const tooSoon = Date.now();
    const elapsed = tooSoon - gm.getCooldown('rate-test');
    assert(elapsed < 3000, `Immediate check is within cooldown (${elapsed}ms < 3000ms)`);

    // Simulate time passing
    gm.setCooldown('rate-test', now - 4000);
    const laterElapsed = Date.now() - gm.getCooldown('rate-test');
    assert(laterElapsed >= 3000, `After cooldown expires (${laterElapsed}ms >= 3000ms)`);
})();

// ============================================================================
// TEST 3: BROADCAST THROTTLING
// ============================================================================

console.log('\n🧪 TEST SUITE: Broadcast Throttling\n');

(function testBroadcastTimeTracking() {
    assert(gm.getLastBroadcastTime() === 0, 'Initial broadcast time is 0');
    gm.setLastBroadcastTime(1000);
    assert(gm.getLastBroadcastTime() === 1000, 'Broadcast time updated');
})();

(function testBroadcastThrottle() {
    gm.setLastBroadcastTime(Date.now() - 1000);
    const timeSince = Date.now() - gm.getLastBroadcastTime();
    assert(timeSince < 2000, 'Within 2s throttle window: should NOT broadcast');

    gm.setLastBroadcastTime(Date.now() - 3000);
    const timeSince2 = Date.now() - gm.getLastBroadcastTime();
    assert(timeSince2 > 2000, 'Past 2s throttle window: should broadcast');
})();

// ============================================================================
// TEST 4: CLEANUP ON DISCONNECT
// ============================================================================

console.log('\n🧪 TEST SUITE: Cleanup on Disconnect\n');

(function testFullDisconnectCleanup() {
    gm.setGame('disc-1', { name: 'Disconnecter', score: 100 });
    gm.setCooldown('disc-1', Date.now());

    // Simulate disconnect
    gm.deleteGame('disc-1');
    gm.deleteCooldown('disc-1');

    assert(gm.getGame('disc-1') === undefined, 'Game cleaned up on disconnect');
    assert(gm.getCooldown('disc-1') === 0, 'Cooldown cleaned up on disconnect');
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
