// public/js/game/engine.js — Core game loop, timer, and initialization
import { state, ranks } from '../core/state.js';
import { socket } from '../core/socket.js';
import { showToast } from '../ui/toast.js';
import { fetchLeaderboard } from '../ui/leaderboard.js';
import { handleKey, handleTouch, processLocalKeyPress, flushKeyBuffer } from './input.js';
import { renderGameOverSummary } from './summary.js';

export function startGame(mode) {
    state.currentMode = mode;
    state.gameDuration = mode === 'blitz' ? 2000 : 5000;
    state.localScore = 0;
    state.keyBuffer = [];
    state.gameToken = null;

    const nameInput = document.getElementById('username');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return showToast("ENTER A CODENAME FIRST");

    // Lock codename to prevent name spamming in the same session, obfuscated via base64
    try {
        localStorage.setItem('besosmash_codename', btoa(encodeURIComponent(name)));
    } catch (e) {
        localStorage.setItem('besosmash_codename', name); // fallback
    }
    if (nameInput) {
        nameInput.disabled = true;
        nameInput.classList.add('opacity-50', 'cursor-not-allowed');
    }
    const changeBtn = document.getElementById('change-name-btn');
    if (changeBtn) changeBtn.classList.remove('hidden');

    document.getElementById('setup-panel').classList.add('hidden');
    const instructionsPanel = document.getElementById('instructions-panel');
    if (instructionsPanel) instructionsPanel.classList.add('hidden');
    document.getElementById('smash-zone').classList.remove('hidden');

    // Hide leaderboard during game
    const lbSection = document.getElementById('leaderboard-section');
    if (lbSection) lbSection.classList.add('hidden');

    document.getElementById('score-display').innerText = "0";
    document.getElementById('kps-display').innerText = "0.0";
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = (state.gameDuration / 1000).toFixed(2) + "s";

    document.getElementById('rank-display').innerText = ranks[0].title;
    document.getElementById('rank-display').className = `text-3xl font-black neon-glow ${ranks[0].color}`;
    document.getElementById('status-text').innerText = "PRESS ANY KEY TO BEGIN";
    document.getElementById('status-text').classList.add('animate-pulse');

    state.waitingForKey = true;
    document.addEventListener('keydown', handleFirstKey);
    document.addEventListener('touchstart', handleFirstTouch, { passive: false });
}

function handleFirstKey(e) {
    if (!state.waitingForKey || e.repeat) return;
    e.preventDefault(); // Block all defaults to ensure pure smash

    startActualGame(e.code);
}

function handleFirstTouch(e) {
    if (!state.waitingForKey) return;
    e.preventDefault();

    // Use the first touch as the seed
    startActualGame('Touch_' + (e.changedTouches[0].identifier || '0'));
}

function startActualGame(firstKeyCode) {
    state.waitingForKey = false;
    document.removeEventListener('keydown', handleFirstKey);
    document.removeEventListener('touchstart', handleFirstTouch);
    document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD";
    document.getElementById('status-text').classList.remove('animate-pulse');

    const nameInput = document.getElementById('username');
    let name = 'Player';
    if (nameInput) {
        name = nameInput.value.trim();
        // If the input is disabled, it means we pre-filled it from localStorage.
        // It's already the decoded value in the input field, so we just send it.
    }
    socket.emit('startGame', { name: name, mode: state.currentMode });

    // Listen for the server's gameStarted event to capture the anti-cheat token
    socket.once('gameStarted', (data) => {
        if (data && data.token) {
            state.gameToken = data.token;
        }
    });

    // OPTIMISTIC START
    // Start locally immediately instead of waiting for server gameStarted event
    state.active = true;
    state.gameStartTime = performance.now();
    document.addEventListener('keydown', handleKey);
    document.addEventListener('touchstart', handleTouch, { passive: false });

    // Start visual timer using requestAnimationFrame for buttery-smooth 60fps countdown
    if (state.timerRAF) cancelAnimationFrame(state.timerRAF);
    const timerDisplay = document.getElementById('timer-display');
    function timerLoop() {
        if (!state.active) return;
        const elapsed = performance.now() - state.gameStartTime;
        let remaining = Math.max(0, state.gameDuration - elapsed);
        if (timerDisplay) {
            timerDisplay.innerText = (remaining / 1000).toFixed(2) + "s";
        }
        if (remaining <= 0) {
            clearInterval(state.tickInterval);

            // Final Buffer Flush (Ensure we capture latency-delayed keys up to 0.0s)
            if (state.keyBuffer.length > 0) {
                socket.emit('keyPressBatch', { keys: state.keyBuffer, token: state.gameToken });
                state.keyBuffer = [];
            }
            // Explicitly tell the server the game is finished and pass our local optimistic score
            socket.emit('clientGameEnd', state.localScore);

            state.active = false;
            // Remove key listener immediately so Tab/Space/etc don't trigger browser defaults
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('touchstart', handleTouch);
            return; // Stop the rAF loop
        }
        state.timerRAF = requestAnimationFrame(timerLoop);
    }
    state.timerRAF = requestAnimationFrame(timerLoop);

    // Start Tick Loop (safety net flush every 50ms for slower typers)
    clearInterval(state.tickInterval);
    state.tickInterval = setInterval(() => {
        if (!state.active) return clearInterval(state.tickInterval);
        flushKeyBuffer();
    }, 50);

    processLocalKeyPress(firstKeyCode);
}

function updateScoreParams(score) {
    document.getElementById('score-display').innerText = score;

    // Calculate Keys Per Second (KPS)
    if (state.active) {
        let secondsElapsed = (performance.now() - state.gameStartTime) / 1000;

        // Clamp the time to the actual game duration so KPS doesn't bleed during the end-game calculation lock
        const maxSeconds = state.gameDuration / 1000;
        if (secondsElapsed > maxSeconds) secondsElapsed = maxSeconds;
        if (secondsElapsed <= 0.1) secondsElapsed = 0.1; // Prevent Infinity

        const kps = (score / secondsElapsed).toFixed(1);
        document.getElementById('kps-display').innerText = kps;
    }

    // Update Rank
    let currentRank = ranks[0];
    for (let r of ranks) {
        if (score >= r.threshold) currentRank = r;
    }
    const rankEl = document.getElementById('rank-display');
    if (rankEl.innerText !== currentRank.title) {
        rankEl.innerText = currentRank.title;
        rankEl.className = `text-3xl font-black neon-glow ${currentRank.color}`;
        // Animate rank change
        anime({ targets: rankEl, scale: [1.5, 1], duration: 300 });
    }
}

// Function to reset the game from summary screen back to setup
export function resetGame() {
    state.currentSession = null;
    document.getElementById('game-over-panel').classList.add('hidden');
    document.getElementById('setup-panel').classList.remove('hidden');
    const instructionsPanel = document.getElementById('instructions-panel');
    if (instructionsPanel) instructionsPanel.classList.remove('hidden');

    // Refresh leaderboard to remove the pinned session
    fetchLeaderboard(false);
}

// Function to clear a saved codename
export function clearCodename() {
    localStorage.removeItem('besosmash_codename');
    const nameInput = document.getElementById('username');
    if (nameInput) {
        nameInput.disabled = false;
        nameInput.classList.remove('opacity-50', 'cursor-not-allowed');
        nameInput.value = '';
        nameInput.focus();
    }
    const btn = document.getElementById('change-name-btn');
    if (btn) btn.classList.add('hidden');
}

// Initialize the game engine
export function initGameEngine() {
    // Restore and lock Codename if previously set
    let savedName = localStorage.getItem('besosmash_codename');
    if (savedName) {
        try {
            // Decode obfuscated name
            savedName = decodeURIComponent(atob(savedName));
        } catch (e) {
            // Fallback for unencrypted legacy names
        }
    }
    const nameInput = document.getElementById('username');
    const changeBtn = document.getElementById('change-name-btn');
    if (savedName && nameInput) {
        nameInput.value = savedName;
        nameInput.disabled = true;
        nameInput.classList.add('opacity-50', 'cursor-not-allowed');
        if (changeBtn) changeBtn.classList.remove('hidden');
    }

    // Always block browser default behaviour for navigation keys site-wide
    document.addEventListener('keydown', (e) => {
        // If actively playing or waiting to start, block EVERYTHING
        if (state.active || state.waitingForKey) {
            e.preventDefault();
        } else if (document.activeElement.tagName !== 'INPUT') {
            // Prevent scrolling/refreshing when just hanging out in menus
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter", "F5"].indexOf(e.code) > -1 || e.altKey) {
                e.preventDefault();
            }
        }
    });

    socket.on('scoreUpdate', (serverScore) => {
        // Rely mostly on local score for immediate feedback, but sync if server says we have more
        if (serverScore > state.localScore) {
            state.localScore = serverScore;
            updateScoreParams(state.localScore);
        }
    });

    // Delegate gameOver handling to the summary module
    socket.on('gameOver', (data) => {
        document.removeEventListener('keydown', handleKey);
        renderGameOverSummary(data);
    });
}
