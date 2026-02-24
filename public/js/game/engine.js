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

    // Lock codename to prevent name spamming in the same session
    localStorage.setItem('besosmash_codename', name);
    if (nameInput) {
        nameInput.disabled = true;
        nameInput.classList.add('opacity-50', 'cursor-not-allowed');
    }
    const changeBtn = document.getElementById('change-name-btn');
    if (changeBtn) changeBtn.classList.remove('hidden');

    document.getElementById('setup-panel').classList.add('hidden');
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
}

function handleFirstKey(e) {
    if (!state.waitingForKey || e.repeat) return;
    e.preventDefault(); // Block all defaults to ensure pure smash

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
    state.gameStartTime = performance.now();
    document.addEventListener('keydown', handleKey);

    // Start visual timer
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (!state.active) return clearInterval(state.timerInterval);
        const elapsed = performance.now() - state.gameStartTime;
        let remaining = Math.max(0, state.gameDuration - elapsed);
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.innerText = (remaining / 1000).toFixed(2) + "s";
        }
        if (remaining <= 0) {
            clearInterval(state.timerInterval);
            clearInterval(state.tickInterval);

            // Final Buffer Flush (Ensure we capture latency-delayed keys up to 0.0s)
            if (state.keyBuffer.length > 0) {
                socket.emit('keyPressBatch', state.keyBuffer);
                state.keyBuffer = [];
            }
            // Explicitly tell the server the game is finished and pass our local optimistic score
            socket.emit('clientGameEnd', state.localScore);

            state.active = false;
            // Remove key listener immediately so Tab/Space/etc don't trigger browser defaults
            document.removeEventListener('keydown', handleKey);
        }
    }, 10);

    // Start Tick Loop (20Hz — 50ms for maximum key recording granularity without socket choke)
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
    e.preventDefault(); // Block all defaults
    if (e.repeat) return;
    // Provide a normalized key that incorporates both code and literal key, just in case
    let keyString = e.code;
    if (!keyString && e.key) {
        // Build a synthetic e.code based on e.key
        if (/^[a-zA-Z]$/.test(e.key)) keyString = 'Key' + e.key.toUpperCase();
        else keyString = e.key;
    }

    processLocalKeyPress(keyString, e.isTrusted);
}

function processLocalKeyPress(keyCode, isTrusted = true) {
    if (!keyCode) keyCode = 'Unknown';
    if (isTrusted === false) keyCode = "Untrusted_" + keyCode;

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

    const smashStr = state.currentSession && state.currentSession.smash_score ? ` (Smash Score: ${state.currentSession.smash_score.toLocaleString()})` : '';
    const textToShare = `I just hit ${state.localScore} keys in BeSoSmash!${smashStr}\nRank: ${finalRank.title} (Global: ${state.finalAbsoluteRank})\nSpeed: ${(state.localScore / (state.gameDuration / 1000)).toFixed(1)} KPS\nChaos: ${state.finalEntropy}%\nDiagnosis: ${profileText}\n\nPlay now: ${window.location.origin}`;

    navigator.clipboard.writeText(textToShare).then(() => {
        showToast("COPIED TO CLIPBOARD");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast("Failed to copy score.");
    });
}

// Function to save the game over panel as an image
export function saveCardImage() {
    if (typeof html2canvas === 'undefined') {
        showToast("Image export library not loaded yet.");
        return;
    }

    const panel = document.getElementById('game-over-panel');
    if (!panel) return;

    // Add a slight padding/margin adjustment if needed for the pure image
    const oldMargin = panel.style.margin;
    const oldRadius = panel.style.borderRadius;
    panel.style.margin = '0';
    panel.style.borderRadius = '0'; // Sometimes helps with canvas rounding bugs

    showToast("GENERATING ID CARD...");

    html2canvas(panel, {
        backgroundColor: '#020617', // Match the slate-950 background
        scale: 2, // High resolution
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
            // 1. Hide the action buttons array explicitly
            const clonedPanel = clonedDoc.getElementById('game-over-panel');
            if (clonedPanel && clonedPanel.lastElementChild) {
                clonedPanel.lastElementChild.style.display = 'none';
            }

            // 2. Fix html2canvas crashing on `background-clip: text` by flattening the logo colors
            Array.from(clonedDoc.querySelectorAll('span')).forEach(span => {
                if (span.textContent === 'BeSo') {
                    span.className = "text-fuchsia-500 pr-4 -mr-4 relative z-10";
                } else if (span.textContent === 'Smash') {
                    span.className = "text-rose-500 relative z-0 pr-4";
                }
            });

            // 3. Purge CSS blurs which corrupt the html2canvas bounding box calculations
            clonedDoc.querySelectorAll('.blur-2xl, .blur-3xl').forEach(b => b.style.display = 'none');

            // 4. Strip complex drop-shadows just in case they clip the stats bounding box
            clonedDoc.querySelectorAll('*').forEach(el => {
                if (typeof el.className === 'string' && el.className.includes('drop-shadow')) {
                    el.className = el.className.replace(/drop-shadow-\[.*?\]/g, '').replace('drop-shadow-md', '').replace('drop-shadow-lg', '');
                }
            });
        }
    }).then(canvas => {
        // Restore styling
        panel.style.margin = oldMargin;
        panel.style.borderRadius = oldRadius;

        // Trigger download
        const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const link = document.createElement('a');
        link.download = `besosmash-${state.currentSession?.smash_score || state.localScore}.png`;
        link.href = image;
        link.click();

        showToast("CARD SAVED!");
    }).catch(err => {
        console.error("HTML2Canvas Error:", err);
        panel.style.margin = oldMargin;
        panel.style.borderRadius = oldRadius;
        showToast("FAILED TO GENERATE IMAGE");
    });
}

// Initialize the game engine
export function initGameEngine() {
    // Restore and lock Codename if previously set
    const savedName = localStorage.getItem('besosmash_codename');
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
        const serverSmashScore = data.smash_score;
        const serverKPS = data.kps;
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

            if (serverSmashScore) {
                // If they have a smash score, display it as the primary result
                document.getElementById('final-score-display').innerText = serverSmashScore.toLocaleString();
            } else {
                // For Ghost/Cheater profiles that don't generate a smash score
                document.getElementById('final-score-display').innerText = state.localScore;
            }

            // Populate new 4-column sub-stats
            const keysDisplay = document.getElementById('final-keys-display');
            if (keysDisplay) keysDisplay.innerText = state.localScore;

            // Set Player Name
            const nameInput = document.getElementById('username');
            const playerName = (nameInput ? nameInput.value.trim() : '') || 'PLAYER';
            document.getElementById('final-name-display').innerText = playerName;

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
            document.getElementById('final-kps-display').innerHTML = `${serverKPS} <span class="text-sm">KPS</span>`;

            // Show Profiles
            const profileContainer = document.getElementById('profile-container');
            if (profileContainer) {
                profileContainer.innerHTML = '';

                if (state.finalProfiles && state.finalProfiles.length > 0) {
                    const palettes = [
                        { text: "text-purple-400", border: "border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-900/20" },
                        { text: "text-amber-400", border: "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-900/20" },
                        { text: "text-sky-400", border: "border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.3)] bg-sky-900/20" },
                        { text: "text-emerald-400", border: "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-900/20" },
                        { text: "text-rose-400", border: "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-900/20" },
                        { text: "text-fuchsia-400", border: "border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] bg-fuchsia-900/20" },
                        { text: "text-yellow-400", border: "border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-yellow-900/20" },
                        { text: "text-indigo-400", border: "border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] bg-indigo-900/20" },
                        { text: "text-orange-400", border: "border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] bg-orange-900/20" },
                        { text: "text-pink-400", border: "border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-pink-900/20" },
                        { text: "text-cyan-400", border: "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-cyan-900/20" }
                    ];

                    state.finalProfiles.forEach(prof => {
                        // Dynamic consistent hash assignment
                        let hash = 0;
                        for (let i = 0; i < prof.title.length; i++) hash = prof.title.charCodeAt(i) + ((hash << 5) - hash);
                        hash = Math.abs(hash);
                        let palette = palettes[hash % palettes.length];

                        // Specific overrides
                        if (prof.title === "The Script Kiddie" || prof.title === "The Hexadecimal") {
                            palette = { text: "text-red-600 animate-pulse", border: "border-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.4)] bg-red-900/20" };
                        }
                        else if (prof.title === "The Sweaty Tryhard" || prof.title === "The MOBA Toxic") {
                            palette = { text: "text-blue-500", border: "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-900/20" };
                        }
                        else if (prof.title === "The Gorilla" || prof.title === "The Silverback") {
                            palette = { text: "text-amber-500", border: "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-900/20" };
                        }

                        profileContainer.innerHTML += `
                            <div class="${palette.border} p-4 rounded-xl border border-t-2 relative overflow-hidden transform hover:scale-[1.02] transition-transform flex flex-col justify-center h-full text-center">
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
                                <p class="text-xl md:text-2xl font-black ${palette.text} uppercase drop-shadow-md leading-none z-10 relative">${prof.title}</p>
                                <p class="text-sm font-bold text-slate-300 mt-2 italic px-2 z-10 relative">"${prof.flavor}"</p>
                            </div>
                        `;
                    });
                } else {
                    profileContainer.innerHTML = `
                        <div class="col-span-full border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-900/20 p-4 rounded-xl border border-t-2 relative flex flex-col justify-center items-center">
                            <p class="text-2xl md:text-3xl font-black text-rose-400 uppercase drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]">THE UNKNOWN</p>
                            <p class="text-sm font-bold text-slate-400 mt-2 italic px-2">"Entity unclassifiable."</p>
                        </div>
                    `;
                }
            }

            // Unhide leaderboard and fetch specifically with current run pinned
            const lbSection = document.getElementById('leaderboard-section');
            if (lbSection) lbSection.classList.remove('hidden');

            state.currentLeaderboardPage = 1;
            state.currentSession = {
                name: playerName,
                score: state.localScore,
                smash_score: serverSmashScore,
                rank: data.rank,
                kps: data.kps || finalKPS,
                entropy: state.finalEntropy
            };

            fetchLeaderboard(false);
        }, 3000);
    });
}
