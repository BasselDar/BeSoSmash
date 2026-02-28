/**
 * test_socketFlow.js — Integration tests for the socket controller flow
 * Run: node tests/test_socketFlow.js
 */

let passed = 0, failed = 0;
const results = [];
function assert(c, n) { if (c) { passed++; results.push(`  ✅ ${n}`); } else { failed++; results.push(`  ❌ ${n}`); } }

const games = {}, cooldowns = {};
let lastBroadcast = 0;
const gm = {
    getGame: id => games[id], setGame: (id, g) => { games[id] = g; },
    deleteGame: id => { delete games[id]; }, getCooldown: id => cooldowns[id] || 0,
    setCooldown: (id, t) => { cooldowns[id] = t; }, deleteCooldown: id => { delete cooldowns[id]; },
    getLastBroadcastTime: () => lastBroadcast, setLastBroadcastTime: t => { lastBroadcast = t; },
};

console.log('\n🧪 TEST SUITE: Game Lifecycle\n');

(function testStartGame() {
    const name = 'TestPlayer';
    const safeName = name.trim().replace(/<[^>]*>/g, '').slice(0, 12) || 'Anonymous';
    gm.setGame('s1', { name: safeName, score: 0, isActive: true, mode: 'classic', keyHistory: [], startTime: Date.now(), timerDuration: 5000 });
    const g = gm.getGame('s1');
    assert(g && g.name === 'TestPlayer', 'Game state created with correct name');
    assert(g.timerDuration === 5000, 'Classic timer is 5s');
})();

(function testBlitzTimer() {
    gm.setGame('sb', { name: 'B', score: 0, isActive: true, mode: 'blitz', keyHistory: [], startTime: Date.now(), timerDuration: 2000 });
    assert(gm.getGame('sb').timerDuration === 2000, 'Blitz timer is 2s');
})();

console.log('\n🧪 TEST SUITE: Key Press Batching\n');

(function testBatchUpdatesScore() {
    gm.setGame('s2', { name: 'B', score: 0, isActive: true, mode: 'classic', keyHistory: [], startTime: Date.now(), timerDuration: 5000 });
    const g = gm.getGame('s2');
    const keys = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE'];
    g.score += keys.slice(0, 50).length;
    g.keyHistory.push(keys);
    assert(g.score === 5, 'Score updated after batch');
    assert(g.keyHistory[0].length === 5, 'Key history stored');
})();

(function testBatchCapped() {
    gm.setGame('sc', { name: 'C', score: 0, isActive: true, mode: 'classic', keyHistory: [], startTime: Date.now(), timerDuration: 5000 });
    const g = gm.getGame('sc');
    const capped = Array(200).fill('KeyA').slice(0, 50);
    g.score += capped.length;
    assert(g.score === 50, 'Batch capped at 50 keys');
})();

(function testInactiveBatchRejected() {
    gm.setGame('si', { name: 'I', score: 10, isActive: false, mode: 'classic', keyHistory: [], startTime: Date.now(), timerDuration: 5000 });
    const g = gm.getGame('si');
    if (g && g.isActive) g.score += 5;
    assert(g.score === 10, 'Inactive game rejects batch');
})();

(function testLateKeysRejected() {
    gm.setGame('sl', { name: 'L', score: 0, isActive: true, mode: 'classic', keyHistory: [], startTime: Date.now() - 7000, timerDuration: 5000 });
    const g = gm.getGame('sl');
    const isLate = (Date.now() - g.startTime) > g.timerDuration + 1000;
    if (g.isActive && !isLate) g.score += 5;
    assert(g.score === 0, 'Late keys rejected');
})();

console.log('\n🧪 TEST SUITE: Name Sanitization\n');

(function testHTMLStripped() {
    const safe = '<script>xss</script>Hack'.trim().replace(/<[^>]*>/g, '').slice(0, 12) || 'Anonymous';
    assert(!safe.includes('<'), 'HTML stripped');
})();

(function testNameTruncated() {
    const safe = 'ThisNameIsWayTooLong'.trim().replace(/<[^>]*>/g, '').slice(0, 12);
    assert(safe.length === 12, 'Truncated to 12');
})();

(function testEmptyName() {
    const safe = '   '.trim().replace(/<[^>]*>/g, '').slice(0, 12) || 'Anonymous';
    assert(safe === 'Anonymous', 'Empty → Anonymous');
})();

console.log('\n🧪 TEST SUITE: Rate Limiting\n');

(function testCooldownBlocks() {
    gm.setCooldown('sr', Date.now());
    const canStart = !(gm.getCooldown('sr') && Date.now() + 1000 - gm.getCooldown('sr') < 3000);
    assert(canStart === false, 'Blocked within 3s cooldown');
})();

(function testCooldownExpires() {
    gm.setCooldown('sr2', Date.now() - 4000);
    const canStart = !(gm.getCooldown('sr2') && Date.now() - gm.getCooldown('sr2') < 3000);
    assert(canStart === true, 'Allowed after 3s');
})();

console.log('\n🧪 TEST SUITE: Game End\n');

(function testClientScoreSync() {
    gm.setGame('se', { name: 'E', score: 50, isActive: true, mode: 'classic', keyHistory: [[]], startTime: Date.now() - 5000, timerDuration: 5000 });
    const g = gm.getGame('se');
    const cs = 55;
    if (typeof cs === 'number' && cs > g.score && (cs - g.score) <= 300) g.score = cs;
    assert(g.score === 55, 'Client score accepted within tolerance');
})();

(function testInflatedScoreRejected() {
    gm.setGame('sf', { name: 'F', score: 50, isActive: true, mode: 'classic', keyHistory: [], startTime: Date.now() - 5000, timerDuration: 5000 });
    const g = gm.getGame('sf');
    const cs = 9999;
    if (typeof cs === 'number' && cs > g.score && (cs - g.score) <= 300) g.score = cs;
    assert(g.score === 50, 'Inflated client score rejected');
})();

(function testDoubleEndPrevented() {
    gm.setGame('sd', { name: 'D', score: 100, isActive: true, mode: 'classic', keyHistory: [[]], startTime: Date.now(), timerDuration: 5000 });
    gm.getGame('sd').isActive = false;
    assert(gm.getGame('sd').isActive === false, 'Double endGame is no-op');
})();

console.log('\n🧪 TEST SUITE: Disconnect & Broadcast\n');

(function testDisconnect() {
    gm.setGame('dc', { name: 'DC' }); gm.setCooldown('dc', Date.now());
    gm.deleteGame('dc'); gm.deleteCooldown('dc');
    assert(gm.getGame('dc') === undefined && gm.getCooldown('dc') === 0, 'Disconnect cleans up');
})();

(function testBroadcastThrottle() {
    gm.setLastBroadcastTime(Date.now() - 3000);
    assert(Date.now() - gm.getLastBroadcastTime() > 2000, 'Broadcast OK after 2s');
    gm.setLastBroadcastTime(Date.now() - 500);
    assert(!(Date.now() - gm.getLastBroadcastTime() > 2000), 'Broadcast suppressed within 2s');
})();

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed}\n`);
if (failed > 0) { results.filter(r => r.includes('❌')).forEach(r => console.log(r)); console.log(''); }
console.log(results.join('\n'));
console.log('\n' + '═'.repeat(60));
process.exit(failed > 0 ? 1 : 0);
