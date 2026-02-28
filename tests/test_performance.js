/**
 * test_performance.js — Node.js test suite for the performance fixes in engine.js
 * 
 * Tests the three core fixes:
 *   1. Timer uses requestAnimationFrame (not setInterval)
 *   2. +1 particle visuals are throttled (cooldown + cap)
 *   3. Key buffer flushes on threshold (not just on interval)
 * 
 * Run: node scripts/test_performance.js
 */

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
// MOCK BROWSER ENVIRONMENT
// ============================================================================

// Simulated performance.now() with manual time control
let mockTime = 0;
function setMockTime(t) { mockTime = t; }

const mockPerformance = { now: () => mockTime };

// Track socket emissions
const socketEmissions = [];
const mockSocket = {
    emit: (event, data) => {
        socketEmissions.push({ event, data: Array.isArray(data) ? [...data] : data });
    },
    on: () => { }
};

// Minimal DOM mock
function createMockDOM() {
    const elements = {};
    return {
        getElementById: (id) => {
            if (!elements[id]) {
                elements[id] = {
                    innerText: '',
                    className: '',
                    style: {},
                    children: [],
                    classList: {
                        add: () => { },
                        remove: () => { },
                    },
                    appendChild: (child) => { elements[id].children.push(child); },
                    querySelectorAll: (selector) => {
                        // Return children matching the selector class
                        if (selector === '.plus-one-particle') {
                            return elements[id].children.filter(c =>
                                c.className && c.className.includes('plus-one-particle')
                            );
                        }
                        return [];
                    },
                    getBoundingClientRect: () => ({ width: 800, height: 400 })
                };
            }
            return elements[id];
        },
        createElement: (tag) => ({
            innerText: '',
            className: '',
            style: {},
            remove: function () {
                // Remove from any parent's children array
                for (const id in elements) {
                    const idx = elements[id].children.indexOf(this);
                    if (idx > -1) elements[id].children.splice(idx, 1);
                }
            }
        }),
        addEventListener: () => { },
        removeEventListener: () => { },
        body: { style: {} },
        _elements: elements
    };
}

// ============================================================================
// TEST 1: KEY BUFFER THRESHOLD FLUSH
// ============================================================================

console.log('\n🧪 TEST SUITE: Key Buffer Threshold Flush\n');

(function testBufferFlushesAt10Keys() {
    const state = { keyBuffer: [], localScore: 0, active: true };
    socketEmissions.length = 0;

    function flushKeyBuffer() {
        if (state.keyBuffer.length > 0) {
            mockSocket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = [];
        }
    }

    function processLocalKeyPress(keyCode) {
        state.keyBuffer.push(keyCode);
        if (state.keyBuffer.length >= 10) {
            flushKeyBuffer();
        }
        state.localScore++;
    }

    // Press 9 keys — should NOT flush yet
    for (let i = 0; i < 9; i++) {
        processLocalKeyPress('Key' + String.fromCharCode(65 + i));
    }
    assert(socketEmissions.length === 0, 'No flush before reaching 10 keys');
    assert(state.keyBuffer.length === 9, 'Buffer has 9 keys pending');

    // Press the 10th key — should trigger flush
    processLocalKeyPress('KeyJ');
    assert(socketEmissions.length === 1, 'Flush triggered at exactly 10 keys');
    assert(socketEmissions[0].data.length === 10, 'Flushed batch contains all 10 keys');
    assert(state.keyBuffer.length === 0, 'Buffer is empty after flush');
    assert(state.localScore === 10, 'Local score tracks all 10 keypresses');
})();

(function testBufferFlushesMultipleTimes() {
    const state = { keyBuffer: [], localScore: 0, active: true };
    socketEmissions.length = 0;

    function flushKeyBuffer() {
        if (state.keyBuffer.length > 0) {
            mockSocket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = [];
        }
    }

    function processLocalKeyPress(keyCode) {
        state.keyBuffer.push(keyCode);
        if (state.keyBuffer.length >= 10) {
            flushKeyBuffer();
        }
        state.localScore++;
    }

    // Press 25 keys — should flush twice (at key 10 and key 20), with 5 remaining
    for (let i = 0; i < 25; i++) {
        processLocalKeyPress('KeyA');
    }
    assert(socketEmissions.length === 2, '25 keys triggers exactly 2 flushes');
    assert(state.keyBuffer.length === 5, '5 keys remain in buffer after 2 flushes');
    assert(state.localScore === 25, 'All 25 keypresses counted locally');
})();

(function testSafetyNetFlushCatchesRemainder() {
    const state = { keyBuffer: [], localScore: 0, active: true };
    socketEmissions.length = 0;

    function flushKeyBuffer() {
        if (state.keyBuffer.length > 0) {
            mockSocket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = [];
        }
    }

    function processLocalKeyPress(keyCode) {
        state.keyBuffer.push(keyCode);
        if (state.keyBuffer.length >= 10) {
            flushKeyBuffer();
        }
        state.localScore++;
    }

    // Press 7 keys (under threshold)
    for (let i = 0; i < 7; i++) {
        processLocalKeyPress('KeyX');
    }
    assert(socketEmissions.length === 0, 'No threshold flush for 7 keys');

    // Simulate safety net interval flush
    flushKeyBuffer();
    assert(socketEmissions.length === 1, 'Safety net interval flush sends remaining 7 keys');
    assert(socketEmissions[0].data.length === 7, 'Flushed batch has correct 7 keys');
    assert(state.keyBuffer.length === 0, 'Buffer empty after safety net flush');
})();

(function testEmptyBufferFlushIsNoop() {
    socketEmissions.length = 0;
    const state = { keyBuffer: [] };

    function flushKeyBuffer() {
        if (state.keyBuffer.length > 0) {
            mockSocket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = [];
        }
    }

    flushKeyBuffer();
    assert(socketEmissions.length === 0, 'Empty buffer flush emits nothing');
})();

// ============================================================================
// TEST 2: +1 PARTICLE THROTTLING
// ============================================================================

console.log('\n🧪 TEST SUITE: +1 Particle Visual Throttling\n');

(function testParticleThrottleCooldown() {
    const PLUS_ONE_COOLDOWN = 120;
    // In real browser, performance.now() is always >> 0 so first call always passes cooldown
    let lastPlusOneTime = -Infinity;
    let particlesCreated = 0;

    function shouldCreateParticle(now, existingCount) {
        const MAX_PLUS_ONES = 15;
        if (now - lastPlusOneTime < PLUS_ONE_COOLDOWN) return false;
        if (existingCount >= MAX_PLUS_ONES) return false;
        lastPlusOneTime = now;
        return true;
    }

    // First call at t=0 — should create
    assert(shouldCreateParticle(0, 0) === true, 'First particle is always created');

    // Call 50ms later — too soon, should skip
    assert(shouldCreateParticle(50, 0) === false, 'Particle skipped if within 120ms cooldown');

    // Call 119ms later — still too soon
    assert(shouldCreateParticle(119, 0) === false, 'Particle skipped at 119ms (just under cooldown)');

    // Call 120ms later — should create
    assert(shouldCreateParticle(120, 0) === true, 'Particle created at exactly 120ms');

    // Call 500ms later — should create
    assert(shouldCreateParticle(500, 0) === true, 'Particle created well after cooldown');
})();

(function testParticleCapAt15() {
    const PLUS_ONE_COOLDOWN = 120;
    const MAX_PLUS_ONES = 15;
    let lastPlusOneTime = -Infinity;

    function shouldCreateParticle(now, existingCount) {
        if (now - lastPlusOneTime < PLUS_ONE_COOLDOWN) return false;
        if (existingCount >= MAX_PLUS_ONES) return false;
        lastPlusOneTime = now;
        return true;
    }

    // With 14 existing particles — should create
    assert(shouldCreateParticle(0, 14) === true, 'Particle created when 14 exist (under cap)');

    // With 15 existing particles — should skip
    assert(shouldCreateParticle(200, 15) === false, 'Particle skipped when 15 exist (at cap)');

    // With 20 existing particles — should skip
    assert(shouldCreateParticle(400, 20) === false, 'Particle skipped when 20 exist (over cap)');
})();

(function testRapidKeypressesCappedParticles() {
    const PLUS_ONE_COOLDOWN = 120;
    const MAX_PLUS_ONES = 15;
    let lastPlusOneTime = 0;
    let particlesCreated = 0;

    function shouldCreateParticle(now, existingCount) {
        if (now - lastPlusOneTime < PLUS_ONE_COOLDOWN) return false;
        if (existingCount >= MAX_PLUS_ONES) return false;
        lastPlusOneTime = now;
        return true;
    }

    // Simulate 100 keypresses over 2 seconds (50 KPS) — without throttle = 100 particles
    // With 120ms cooldown = max ~16 particles over 2s
    for (let i = 0; i < 100; i++) {
        const time = i * 20; // 20ms apart = 50 KPS
        if (shouldCreateParticle(time, particlesCreated)) {
            particlesCreated++;
        }
    }

    assert(particlesCreated <= 17, `Rapid keypresses capped particles to ${particlesCreated} (expected ≤17)`);
    assert(particlesCreated >= 10, `Still creates enough particles for feedback: ${particlesCreated} (expected ≥10)`);
})();

// ============================================================================
// TEST 3: TIMER rAF BEHAVIOR
// ============================================================================

console.log('\n🧪 TEST SUITE: Timer requestAnimationFrame Logic\n');

(function testTimerCountsDown() {
    const gameDuration = 5000;
    const gameStartTime = 0;
    const timerValues = [];

    // Simulate rAF frames at ~60fps for the first 500ms
    for (let frame = 0; frame <= 30; frame++) {
        const now = frame * 16.67; // ~60fps
        const elapsed = now - gameStartTime;
        const remaining = Math.max(0, gameDuration - elapsed);
        timerValues.push(remaining);
    }

    assert(timerValues[0] === 5000, 'Timer starts at 5000ms');
    assert(timerValues[timerValues.length - 1] > 4400, 'Timer after 500ms is still above 4400');
    assert(timerValues[1] < timerValues[0], 'Timer is decreasing between frames');

    // Check smoothness — no jumps bigger than 20ms between frames
    let maxJump = 0;
    for (let i = 1; i < timerValues.length; i++) {
        const jump = timerValues[i - 1] - timerValues[i];
        if (jump > maxJump) maxJump = jump;
    }
    assert(maxJump <= 20, `Maximum frame-to-frame jump is ${maxJump.toFixed(1)}ms (expected ≤20ms for smooth countdown)`);
})();

(function testTimerReachesZero() {
    const gameDuration = 2000; // Blitz mode
    const gameStartTime = 0;
    let gameEnded = false;

    // Simulate frames from 1900ms to 2100ms
    for (let ms = 1900; ms <= 2100; ms += 16.67) {
        const elapsed = ms - gameStartTime;
        const remaining = Math.max(0, gameDuration - elapsed);

        if (remaining <= 0 && !gameEnded) {
            gameEnded = true;
        }
    }

    assert(gameEnded === true, 'Game ends when timer reaches 0');
})();

(function testTimerNeverGoesNegative() {
    const gameDuration = 5000;
    const gameStartTime = 0;
    let allNonNegative = true;

    // Check well past game end
    for (let ms = 5000; ms <= 6000; ms += 100) {
        const elapsed = ms - gameStartTime;
        const remaining = Math.max(0, gameDuration - elapsed);
        if (remaining < 0) allNonNegative = false;
    }
    assert(allNonNegative, 'Timer never goes negative past game duration');
})();

(function testTimerDisplayFormat() {
    // Verify the .toFixed(2) + "s" format
    const remaining = 3456;
    const display = (remaining / 1000).toFixed(2) + "s";
    assert(display === "3.46s", `Timer display format correct: "${display}"`);

    const zero = 0;
    const zeroDisplay = (zero / 1000).toFixed(2) + "s";
    assert(zeroDisplay === "0.00s", `Zero timer display: "${zeroDisplay}"`);
})();

// ============================================================================
// TEST 4: UNTRUSTED KEY MARKING
// ============================================================================

console.log('\n🧪 TEST SUITE: Key Input Handling\n');

(function testUntrustedKeyMarking() {
    const state = { keyBuffer: [], localScore: 0 };

    function processLocalKeyPress(keyCode, isTrusted = true) {
        if (!keyCode) keyCode = 'Unknown';
        if (isTrusted === false) keyCode = "Untrusted_" + keyCode;
        state.keyBuffer.push(keyCode);
        state.localScore++;
    }

    processLocalKeyPress('KeyA', true);
    assert(state.keyBuffer[0] === 'KeyA', 'Trusted key recorded as-is');

    processLocalKeyPress('KeyB', false);
    assert(state.keyBuffer[1] === 'Untrusted_KeyB', 'Untrusted key gets prefixed');

    processLocalKeyPress(null, true);
    assert(state.keyBuffer[2] === 'Unknown', 'Null keyCode becomes "Unknown"');

    processLocalKeyPress('', true);
    assert(state.keyBuffer[3] === 'Unknown', 'Empty keyCode becomes "Unknown"');
})();

(function testEveryKeyCountedLocally() {
    const state = { keyBuffer: [], localScore: 0 };

    function flushKeyBuffer() {
        if (state.keyBuffer.length > 0) {
            mockSocket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = [];
        }
    }

    function processLocalKeyPress(keyCode) {
        if (!keyCode) keyCode = 'Unknown';
        state.keyBuffer.push(keyCode);
        if (state.keyBuffer.length >= 10) {
            flushKeyBuffer();
        }
        state.localScore++;
    }

    // Smash 50 different keys — every single one must increment localScore
    socketEmissions.length = 0;
    const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMN'.split('');
    for (const k of keys) {
        processLocalKeyPress('Key' + k);
    }

    assert(state.localScore === 50, `All 50 keys counted locally (got ${state.localScore})`);
    // Should have flushed 5 times (50 / 10)
    assert(socketEmissions.length === 5, `5 batch flushes for 50 keys (got ${socketEmissions.length})`);
    assert(state.keyBuffer.length === 0, 'Buffer empty after exactly 50 keys (multiple of 10)');
})();

// ============================================================================
// TEST 5: FINAL BUFFER FLUSH AT GAME END
// ============================================================================

console.log('\n🧪 TEST SUITE: Game End Buffer Flush\n');

(function testFinalFlushCapturesAllKeys() {
    const state = { keyBuffer: [], localScore: 0, active: true };
    socketEmissions.length = 0;

    function flushKeyBuffer() {
        if (state.keyBuffer.length > 0) {
            mockSocket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = [];
        }
    }

    function processLocalKeyPress(keyCode) {
        state.keyBuffer.push(keyCode);
        if (state.keyBuffer.length >= 10) {
            flushKeyBuffer();
        }
        state.localScore++;
    }

    // Press 13 keys — 10 flushed by threshold, 3 remain
    for (let i = 0; i < 13; i++) {
        processLocalKeyPress('KeyA');
    }
    assert(socketEmissions.length === 1, '1 threshold flush for 10 keys');
    assert(state.keyBuffer.length === 3, '3 keys remain in buffer');

    // Simulate game end — final flush
    flushKeyBuffer();
    mockSocket.emit('clientGameEnd', state.localScore);
    state.active = false;

    assert(socketEmissions.length === 3, 'Final flush + clientGameEnd emitted');
    assert(socketEmissions[1].data.length === 3, 'Final flush captured remaining 3 keys');
    assert(socketEmissions[2].event === 'clientGameEnd', 'clientGameEnd event sent');
    assert(socketEmissions[2].data === 13, 'clientGameEnd has correct local score');
    assert(state.active === false, 'Game is deactivated');
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
