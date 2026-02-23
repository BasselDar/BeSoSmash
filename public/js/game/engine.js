// public/js/game/engine.js
import { state, ranks } from '../core/state.js';
import { socket } from '../core/socket.js';
import { showToast } from '../ui/toast.js';
import { fetchLeaderboard } from '../ui/leaderboard.js';

export function startGame(mode) {
    state.currentMode = mode;
    state.gameDuration = mode === 'blitz' ? 2000 : 5000;
    state.localScore = 0;
    state.keyBuffer = [];

    const nameInput = document.getElementById('username');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return showToast("ENTER A CODENAME FIRST");

    document.getElementById('setup-panel').classList.add('hidden');
    document.getElementById('smash-zone').classList.remove('hidden');

    // Hide leaderboard during game
    const lbSection = document.getElementById('leaderboard-section');
    if (lbSection) lbSection.classList.add('hidden');

    document.getElementById('score-display').innerText = "0";
    document.getElementById('kps-display').innerText = "0.0";
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = (state.gameDuration / 1000).toFixed(1) + "s";

    document.getElementById('rank-display').innerText = ranks[0].title;
    document.getElementById('rank-display').className = `text-3xl font-black neon-glow ${ranks[0].color}`;
    document.getElementById('status-text').innerText = "PRESS ANY KEY TO BEGIN";
    document.getElementById('status-text').classList.add('animate-pulse');

    state.waitingForKey = true;
    document.addEventListener('keydown', handleFirstKey);
}

function handleFirstKey(e) {
    if (!state.waitingForKey || e.repeat) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    state.waitingForKey = false;
    document.removeEventListener('keydown', handleFirstKey);
    document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD";
    document.getElementById('status-text').classList.remove('animate-pulse');

    const nameInput = document.getElementById('username');
    const name = nameInput ? nameInput.value.trim() : 'Player';
    socket.emit('startGame', { name: name, mode: state.currentMode });

    // OPTIMISTIC START
    // Start locally immediately instead of waiting for server gameStarted event
    state.active = true;
    state.gameStartTime = Date.now();
    document.addEventListener('keydown', handleKey);

    // Start visual timer
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (!state.active) return clearInterval(state.timerInterval);
        const elapsed = Date.now() - state.gameStartTime;
        let remaining = Math.max(0, state.gameDuration - elapsed);
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.innerText = (remaining / 1000).toFixed(1) + "s";
        }
        if (remaining <= 0) {
            clearInterval(state.timerInterval);
            clearInterval(state.tickInterval);

            // Final Buffer Flush (Ensure we capture latency-delayed keys up to 0.0s)
            if (state.keyBuffer.length > 0) {
                socket.emit('keyPressBatch', state.keyBuffer);
                state.keyBuffer = [];
            }
            state.active = false;
            // Remove key listener immediately so Tab/Space/etc don't trigger browser defaults
            document.removeEventListener('keydown', handleKey);
        }
    }, 50);

    // Start Tick Loop (20Hz — 50ms for better key recording granularity)
    clearInterval(state.tickInterval);
    state.tickInterval = setInterval(() => {
        if (!state.active) return clearInterval(state.tickInterval);
        if (state.keyBuffer.length > 0) {
            socket.emit('keyPressBatch', state.keyBuffer);
            state.keyBuffer = []; // Empty the buffer
        }
    }, 50);

    processLocalKeyPress(e.code);
}

function triggerVisuals() {
    const intensity = Math.random() * 15 - 7.5;
    anime({
        targets: '#game-container',
        translateX: intensity,
        translateY: intensity,
        scale: 1.02,
        duration: 50,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });

    document.body.style.backgroundColor = '#450a0a';
    setTimeout(() => document.body.style.backgroundColor = '#020617', 50);

    const smashZone = document.getElementById('smash-zone');
    const plusOne = document.createElement('div');
    plusOne.innerText = "+1";
    plusOne.className = "absolute text-4xl font-black text-rose-500 pointer-events-none select-none z-50 neon-glow";

    const rect = smashZone.getBoundingClientRect();
    const startX = Math.random() * (rect.width - 60) + 30;
    const startY = Math.random() * (rect.height - 60) + 30;

    plusOne.style.left = `${startX}px`;
    plusOne.style.top = `${startY}px`;
    smashZone.appendChild(plusOne);

    anime({
        targets: plusOne,
        translateY: -100,
        opacity: [1, 0],
        scale: [1, 1.5],
        duration: 800,
        easing: 'easeOutExpo',
        complete: function () {
            plusOne.remove();
        }
    });
}

function handleKey(e) {
    if (!state.active) return;
    // Allow scrolling outside the game by NOT preventing default if game is mostly visual 
    // Wait, let's keep preventDefault for now, spacebar scrolling during action is awful
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    if (e.repeat) return;
    // Provide a normalized key that incorporates both code and literal key, just in case
    let keyString = e.code;
    if (!keyString && e.key) {
        // Build a synthetic e.code based on e.key
        if (/^[a-zA-Z]$/.test(e.key)) keyString = 'Key' + e.key.toUpperCase();
        else keyString = e.key;
    }

    processLocalKeyPress(keyString);
}

function processLocalKeyPress(keyCode) {
    if (!keyCode) keyCode = 'Unknown';

    // Add physical key to batch buffer
    state.keyBuffer.push(keyCode);

    // Process local score immediately for responsiveness
    state.localScore++;
    updateScoreParams(state.localScore);
    triggerVisuals();
}

function updateScoreParams(score) {
    document.getElementById('score-display').innerText = score;

    // Calculate Keys Per Second (KPS)
    if (state.active) {
        let secondsElapsed = (Date.now() - state.gameStartTime) / 1000;

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
    document.getElementById('game-over-panel').classList.add('hidden');
    document.getElementById('setup-panel').classList.remove('hidden');
}

// Function to copy score to clipboard
export function shareScore() {
    const nameInput = document.getElementById('username');
    const name = nameInput ? nameInput.value.trim() : "Someone";
    const modeFriendly = state.currentMode === 'blitz' ? "Blitz Mode" : "Classic Sprint";
    let finalRank = ranks[0];
    for (let r of ranks) {
        if (state.localScore >= r.threshold) finalRank = r;
    }

    const seconds = state.gameDuration / 1000;
    const finalKPS = (state.localScore / seconds).toFixed(1);

    let profileText = state.finalProfiles && state.finalProfiles.length > 0
        ? state.finalProfiles.map(p => p.title).join(" & ")
        : "The Unknown";

    const textToShare = `I just hit ${state.localScore} keys in BeSoSmash!\nRank: ${finalRank.title} (Global: ${state.finalAbsoluteRank})\nSpeed: ${(state.localScore / (state.gameDuration / 1000)).toFixed(1)} KPS\nChaos: ${state.finalEntropy}%\nDiagnosis: ${profileText}\n\nPlay now: ${window.location.origin}`;

    navigator.clipboard.writeText(textToShare).then(() => {
        showToast("COPIED TO CLIPBOARD");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast("Failed to copy score.");
    });
}

// Initialize the game engine
export function initGameEngine() {
    // Always block browser default behaviour for navigation keys site-wide
    document.addEventListener('keydown', (e) => {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
    });

    socket.on('scoreUpdate', (serverScore) => {
        // Rely mostly on local score for immediate feedback, but sync if server says we have more
        if (serverScore > state.localScore) {
            state.localScore = serverScore;
            updateScoreParams(state.localScore);
        }
    });

    socket.on('gameOver', (data) => {
        state.active = false;
        clearInterval(state.timerInterval);
        clearInterval(state.tickInterval);
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) timerDisplay.innerText = "0.0s"; // Force end

        // Store server's authoritative values WITHOUT touching the live score display.
        // Updating localScore here causes a visible drop during the "CALCULATING..." phase.
        // We sync inside the setTimeout, hidden behind the results panel appearing.
        const serverFinalScore = data.finalScore;
        if (data.rank) state.finalAbsoluteRank = `#${data.rank}`;
        if (data.profiles) state.finalProfiles = data.profiles;
        if (data.entropy) state.finalEntropy = data.entropy;

        document.removeEventListener('keydown', handleKey);

        // Block all default key behaviour during the "CALCULATING" phase
        function blockKeys(e) {
            e.preventDefault();
        }
        document.addEventListener('keydown', blockKeys);

        document.getElementById('status-text').innerText = "CALCULATING...";
        document.body.style.backgroundColor = '#020617'; // Reset background

        setTimeout(() => {
            // Sync to authoritative server score NOW — smash-zone is about to be hidden
            // so there's no visible drop in the live score display
            state.localScore = serverFinalScore;

            // Unblock keys once the results panel is visible
            document.removeEventListener('keydown', blockKeys);

            document.getElementById('smash-zone').classList.add('hidden');
            document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD";
            document.getElementById('status-text').classList.remove('animate-pulse');

            // Show Post-Game Summary Panel
            document.getElementById('game-over-panel').classList.remove('hidden');
            document.getElementById('final-score-display').innerText = state.localScore;

            // Match Rank Display
            let finalRank = ranks[0];
            for (let r of ranks) {
                if (state.localScore >= r.threshold) finalRank = r;
            }
            const rankEl = document.getElementById('final-rank-display');
            rankEl.innerText = finalRank.title;
            rankEl.className = `text-2xl font-black mt-2 ${finalRank.color}`;

            // Populate new stats
            document.getElementById('absolute-rank-display').innerText = state.finalAbsoluteRank;
            document.getElementById('final-entropy-display').innerHTML = `${state.finalEntropy}<span class="text-sm">%</span>`;
            const seconds = state.gameDuration / 1000;
            const finalKPS = (state.localScore / seconds).toFixed(1);
            document.getElementById('final-kps-display').innerHTML = `${finalKPS} <span class="text-sm">KPS</span>`;

            // Show Profiles
            const profileContainer = document.getElementById('profile-container');
            if (profileContainer) {
                profileContainer.innerHTML = '<h3 class="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3">DIAGNOSIS</h3>';

                if (state.finalProfiles && state.finalProfiles.length > 0) {
                    state.finalProfiles.forEach(prof => {
                        let colorClass = "text-purple-400"; // default
                        if (prof.title === "The Gorilla" || prof.title === "The Silverback") colorClass = "text-amber-500";
                        else if (prof.title === "The Sweaty Tryhard") colorClass = "text-blue-500";
                        else if (prof.title === "The Angry Accountant") colorClass = "text-emerald-500";
                        else if (prof.title === "The Script Kiddie") colorClass = "text-red-600 animate-pulse";

                        profileContainer.innerHTML += `
                            <div class="mb-4 last:mb-0 bg-black/30 p-3 rounded-lg border border-white/5">
                                <p class="text-lg font-black ${colorClass} uppercase drop-shadow-md leading-none">${prof.title}</p>
                                <p class="text-sm font-bold text-slate-400 mt-2 italic px-2">"${prof.flavor}"</p>
                            </div>
                        `;
                    });
                } else {
                    profileContainer.innerHTML += `
                        <p class="text-xl font-black text-rose-400 uppercase drop-shadow-md">THE UNKNOWN</p>
                        <p class="text-sm font-bold text-slate-400 mt-2 italic px-2">"Waiting for analysis..."</p>
                    `;
                }
            }

            // Unhide leaderboard and fetch specifically with current run pinned
            const lbSection = document.getElementById('leaderboard-section');
            if (lbSection) lbSection.classList.remove('hidden');

            state.currentLeaderboardPage = 1;
            const nameInput = document.getElementById('username');
            fetchLeaderboard(false, {
                name: (nameInput ? nameInput.value.trim() : '') || 'You',
                score: state.localScore,
                rank: data.rank,
                kps: finalKPS,
                entropy: state.finalEntropy
            });
        }, 3000);
    });
}
