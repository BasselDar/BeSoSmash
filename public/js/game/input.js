// public/js/game/input.js — Keyboard/touch input handling and key buffer management

import { state, ranks } from '../core/state.js';
import { socket } from '../core/socket.js';
import { triggerVisuals } from './visuals.js';

// Media/system keys that should NOT count as keypresses
const BLOCKED_KEYS = new Set([
    'AudioVolumeUp', 'AudioVolumeDown', 'AudioVolumeMute',
    'VolumeUp', 'VolumeDown', 'VolumeMute',                // older browsers
    'MediaTrackNext', 'MediaTrackPrevious', 'MediaPlayPause', 'MediaStop',
    'LaunchMail', 'LaunchApp1', 'LaunchApp2',
    'BrowserBack', 'BrowserForward', 'BrowserRefresh', 'BrowserStop',
    'BrowserSearch', 'BrowserFavorites', 'BrowserHome',
    'BrightnessUp', 'BrightnessDown',
    'Power', 'Sleep', 'WakeUp',
    'PrintScreen', 'ScrollLock', 'Pause',
]);

// Flush key buffer to server immediately (called on threshold and by interval)
export function flushKeyBuffer() {
    if (state.keyBuffer.length > 0 && state.gameToken) {
        socket.emit('keyPressBatch', { keys: state.keyBuffer, token: state.gameToken });
        state.keyBuffer = [];
    }
}

export function handleKey(e) {
    if (!state.active) return;
    e.preventDefault(); // Block all defaults
    if (e.repeat) return;
    // Block media/system keys (volume wheels, media controls, etc.)
    if (BLOCKED_KEYS.has(e.code) || BLOCKED_KEYS.has(e.key)) return;
    // Provide a normalized key that incorporates both code and literal key, just in case
    let keyString = e.code;
    if (!keyString && e.key) {
        // Build a synthetic e.code based on e.key
        if (/^[a-zA-Z]$/.test(e.key)) keyString = 'Key' + e.key.toUpperCase();
        else keyString = e.key;
    }

    processLocalKeyPress(keyString, e.isTrusted);
}

export function handleTouch(e) {
    if (!state.active) return;
    e.preventDefault(); // Block scrolling/zooming while playing

    // Process every finger that just touched the screen
    for (let i = 0; i < e.changedTouches.length; i++) {
        processLocalKeyPress('Touch_' + e.changedTouches[i].identifier, e.isTrusted);
    }
}

export function processLocalKeyPress(keyCode, isTrusted = true) {
    if (!keyCode) keyCode = 'Unknown';
    if (isTrusted === false) keyCode = "Untrusted_" + keyCode;

    // Add physical key to batch buffer
    state.keyBuffer.push(keyCode);

    // Process local score immediately for responsiveness
    state.localScore++;

    // Import updateScoreParams lazily to avoid circular deps
    // (engine imports input, input could import engine — we use the event-driven approach instead)
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.innerText = state.localScore;

    // Live KPS update
    if (state.active && state.gameStartTime) {
        let elapsed = (performance.now() - state.gameStartTime) / 1000;
        const maxSec = state.gameDuration / 1000;
        if (elapsed > maxSec) elapsed = maxSec;
        if (elapsed <= 0.1) elapsed = 0.1;
        const kps = (state.localScore / elapsed).toFixed(1);
        const kpsEl = document.getElementById('kps-display');
        if (kpsEl) kpsEl.innerText = kps;
    }

    // Live rank update
    let currentRank = ranks[0];
    for (const r of ranks) {
        if (state.localScore >= r.threshold) currentRank = r;
    }
    const rankEl = document.getElementById('rank-display');
    if (rankEl && rankEl.innerText !== currentRank.title) {
        rankEl.innerText = currentRank.title;
        rankEl.className = `text-3xl font-black neon-glow ${currentRank.color}`;
        anime({ targets: rankEl, scale: [1.5, 1], duration: 300 });
    }

    triggerVisuals();
}

// Re-export for engine to call updateScoreParams separately after importing
