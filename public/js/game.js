
// Always block browser default behaviour for navigation keys site-wide
document.addEventListener('keydown', (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});

const socket = io();
let active = false;
let waitingForKey = false;
let gameStartTime = 0;
let currentMode = 'classic';
let localScore = 0;
let timerInterval;
let gameDuration = 5000;
let keyBuffer = [];
let tickInterval;

// Leaderboard State
let currentLeaderboardPage = 1;
let currentLeaderboardSearch = '';
let isLeaderboardLoading = false;
let hasMoreLeaderboard = false;
let leaderboardMode = window.location.pathname.includes('blitz') ? 'blitz' : 'classic';

// Ranks based on score thresholds
const ranks = [
    { threshold: 0, title: "NOVICE", color: "text-slate-300" },
    { threshold: 20, title: "BUTTON MASHER", color: "text-green-400" },
    { threshold: 40, title: "KEYBOARD THREAT", color: "text-blue-400" },
    { threshold: 60, title: "BERSERKER", color: "text-purple-500" },
    { threshold: 80, title: "CHAOS GOD", color: "text-rose-500" },
    { threshold: 100, title: "ELDRITCH ENTITY", color: "text-red-600" }
];

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message);

    const toast = document.createElement('div');
    toast.className = "bg-rose-600/90 text-white font-black px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.8)] border border-rose-400 backdrop-blur-md";
    toast.innerText = message;

    container.appendChild(toast);

    // Animate in
    anime({
        targets: toast,
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutExpo'
    });

    // Animate out
    setTimeout(() => {
        anime({
            targets: toast,
            translateY: -50,
            opacity: 0,
            duration: 400,
            easing: 'easeInExpo',
            complete: () => toast.remove()
        });
    }, 3000);
}

function startGame(mode) {
    currentMode = mode;
    gameDuration = mode === 'blitz' ? 2000 : 5000;
    localScore = 0;
    keyBuffer = [];
    const name = document.getElementById('username').value.trim();
    if (!name) return showToast("ENTER A CODENAME FIRST");

    document.getElementById('setup-panel').classList.add('hidden');
    document.getElementById('smash-zone').classList.remove('hidden');

    // Hide leaderboard during game
    const lbSection = document.getElementById('leaderboard-section');
    if (lbSection) lbSection.classList.add('hidden');

    document.getElementById('score-display').innerText = "0";
    document.getElementById('kps-display').innerText = "0.0";
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = (gameDuration / 1000).toFixed(1) + "s";

    document.getElementById('rank-display').innerText = ranks[0].title;
    document.getElementById('rank-display').className = `text-3xl font-black neon-glow ${ranks[0].color}`;
    document.getElementById('status-text').innerText = "PRESS ANY KEY TO BEGIN";
    document.getElementById('status-text').classList.add('animate-pulse');

    waitingForKey = true;
    document.addEventListener('keydown', handleFirstKey);
}

function handleFirstKey(e) {
    if (!waitingForKey || e.repeat) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    waitingForKey = false;
    document.removeEventListener('keydown', handleFirstKey);
    document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD";
    document.getElementById('status-text').classList.remove('animate-pulse');

    const name = document.getElementById('username').value.trim();
    socket.emit('startGame', { name: name, mode: currentMode });

    // OPTIMISTIC START
    // Start locally immediately instead of waiting for server gameStarted event
    active = true;
    gameStartTime = Date.now();
    document.addEventListener('keydown', handleKey);

    // Start visual timer
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!active) return clearInterval(timerInterval);
        const elapsed = Date.now() - gameStartTime;
        let remaining = Math.max(0, gameDuration - elapsed);
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.innerText = (remaining / 1000).toFixed(1) + "s";
        }
        if (remaining <= 0) {
            clearInterval(timerInterval);
            clearInterval(tickInterval);

            // Final Buffer Flush (Ensure we capture latency-delayed keys up to 0.0s)
            if (keyBuffer.length > 0) {
                socket.emit('keyPressBatch', keyBuffer);
                keyBuffer = [];
            }
            active = false;
            // Remove key listener immediately so Tab/Space/etc don't trigger browser defaults
            document.removeEventListener('keydown', handleKey);
        }
    }, 50);

    // Start Tick Loop (20Hz — 50ms for better key recording granularity)
    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
        if (!active) return clearInterval(tickInterval);
        if (keyBuffer.length > 0) {
            socket.emit('keyPressBatch', keyBuffer);
            keyBuffer = []; // Empty the buffer
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
    if (!active) return;
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
    keyBuffer.push(keyCode);

    // Process local score immediately for responsiveness
    localScore++;
    updateScoreParams(localScore);
    triggerVisuals();
}

function updateScoreParams(score) {
    document.getElementById('score-display').innerText = score;

    // Calculate Keys Per Second (KPS)
    if (active) {
        let secondsElapsed = (Date.now() - gameStartTime) / 1000;

        // Clamp the time to the actual game duration so KPS doesn't bleed during the end-game calculation lock
        const maxSeconds = gameDuration / 1000;
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

socket.on('scoreUpdate', (serverScore) => {
    // Rely mostly on local score for immediate feedback, but sync if server says we have more
    if (serverScore > localScore) {
        localScore = serverScore;
        updateScoreParams(localScore);
    }
});

let finalAbsoluteRank = "UNRANKED";
let finalProfiles = []; // Store the profiles for sharing
let finalEntropy = "0.0";

socket.on('gameOver', (data) => {
    active = false;
    clearInterval(timerInterval);
    clearInterval(tickInterval);
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = "0.0s"; // Force end

    // Store server's authoritative values WITHOUT touching the live score display.
    // Updating localScore here causes a visible drop during the "CALCULATING..." phase.
    // We sync inside the setTimeout, hidden behind the results panel appearing.
    const serverFinalScore = data.finalScore;
    if (data.rank) finalAbsoluteRank = `#${data.rank}`;
    if (data.profiles) finalProfiles = data.profiles;
    if (data.entropy) finalEntropy = data.entropy;

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
        localScore = serverFinalScore;

        // Unblock keys once the results panel is visible
        document.removeEventListener('keydown', blockKeys);

        document.getElementById('smash-zone').classList.add('hidden');
        document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD";
        document.getElementById('status-text').classList.remove('animate-pulse');

        // Show Post-Game Summary Panel
        document.getElementById('game-over-panel').classList.remove('hidden');
        document.getElementById('final-score-display').innerText = localScore;

        // Match Rank Display
        let finalRank = ranks[0];
        for (let r of ranks) {
            if (localScore >= r.threshold) finalRank = r;
        }
        const rankEl = document.getElementById('final-rank-display');
        rankEl.innerText = finalRank.title;
        rankEl.className = `text-2xl font-black mt-2 ${finalRank.color}`;

        // Populate new stats
        document.getElementById('absolute-rank-display').innerText = finalAbsoluteRank;
        document.getElementById('final-entropy-display').innerHTML = `${finalEntropy}<span class="text-sm">%</span>`;
        const seconds = gameDuration / 1000;
        const finalKPS = (localScore / seconds).toFixed(1);
        document.getElementById('final-kps-display').innerHTML = `${finalKPS} <span class="text-sm">KPS</span>`;

        // Show Profiles
        const profileContainer = document.getElementById('profile-container');
        if (profileContainer) {
            profileContainer.innerHTML = '<h3 class="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3">DIAGNOSIS</h3>';

            if (finalProfiles && finalProfiles.length > 0) {
                finalProfiles.forEach(prof => {
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

        currentLeaderboardPage = 1;
        fetchLeaderboard(false, {
            name: document.getElementById('username').value.trim() || 'You',
            score: localScore,
            rank: data.rank,
            kps: finalKPS,
            entropy: finalEntropy
        });
    }, 3000);
});

// Function to reset the game from summary screen back to setup
function resetGame() {
    document.getElementById('game-over-panel').classList.add('hidden');
    document.getElementById('setup-panel').classList.remove('hidden');
}

// Function to copy score to clipboard
function shareScore() {
    const name = document.getElementById('username').value.trim() || "Someone";
    const modeFriendly = currentMode === 'blitz' ? "Blitz Mode" : "Classic Sprint";
    let finalRank = ranks[0];
    for (let r of ranks) {
        if (localScore >= r.threshold) finalRank = r;
    }

    const seconds = gameDuration / 1000;
    const finalKPS = (localScore / seconds).toFixed(1);

    let profileText = finalProfiles.length > 0
        ? finalProfiles.map(p => p.title).join(" & ")
        : "The Unknown";

    const textToShare = `I just hit ${localScore} keys in BeSoSmash!\nRank: ${finalRank.title} (Global: ${finalAbsoluteRank})\nSpeed: ${(localScore / (gameDuration / 1000)).toFixed(1)} KPS\nChaos: ${finalEntropy}%\nDiagnosis: ${profileText}\n\nPlay now: ${window.location.origin}`;

    navigator.clipboard.writeText(textToShare).then(() => {
        showToast("COPIED TO CLIPBOARD");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast("Failed to copy score.");
    });
}

// Real-Time Leaderboard Update (Fallback if page 1 & no search)
socket.on('updateLeaderboard', () => {
    // Only auto-refresh if we are looking at the default view
    if (currentLeaderboardPage === 1 && currentLeaderboardSearch === '') {
        fetchLeaderboard(false);
    }
});

// Calculate relatively time
function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return "just now";
}

// Render Leaderboard Items
function renderLeaderboard(data, append = false, currentSession = null) {
    const list = document.getElementById('leaderboard-list');
    if (!append) list.innerHTML = '';

    // If we have a current session to highlight, inject it at the very top as a special "YOUR RUN" card
    if (currentSession && !append) {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-4 md:p-5 rounded-2xl bg-white/10 border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] group relative overflow-hidden mb-6 transform scale-[1.02] z-20";

        let medalHtml = `<span class="text-yellow-400 font-black font-mono text-xl w-10 text-center bg-black/50 py-1 rounded-lg">#${currentSession.rank}</span>`;
        if (currentSession.rank === 1) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🥇</span>`;
        if (currentSession.rank === 2) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]">🥈</span>`;
        if (currentSession.rank === 3) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">🥉</span>`;

        const themeColor = leaderboardMode === 'blitz' ? 'purple' : 'rose';
        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/10 pointer-events-none opacity-50 border-white"></div>
            <div class="absolute top-0 left-6 bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-b-md shadow-md z-20 uppercase">YOUR RUN</div>
            <div class="flex items-center gap-4 md:gap-6 z-10 w-full mt-5">
                <div class="flex items-center justify-center w-12">${medalHtml}</div>
                <div class="flex flex-col flex-grow">
                    <span class="font-black text-xl md:text-2xl tracking-wide text-yellow-300 drop-shadow-md uppercase">${currentSession.name} <span class="text-xs text-white/50">(Current)</span></span>
                    <span class="text-xs font-bold text-yellow-200/70 tracking-widest uppercase flex items-center gap-1 mt-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeAgo(new Date().toISOString())}
                    </span>
                </div>
                <div class="text-right z-10 flex flex-col items-end justify-center">
                    <span class="font-mono font-black text-4xl leading-none text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] transition-all" title="Total Keys Smashed">${currentSession.score}</span>
                    <div class="flex gap-2 mt-2">
                        <span class="text-xs font-bold text-sky-300 bg-sky-900/50 px-2 py-0.5 rounded-sm border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.3)] cursor-help" title="Keys Per Second (Speed)">⚡ ${currentSession.kps || '0.0'} KPS</span>
                        <span class="text-xs font-bold text-rose-300 bg-rose-900/50 px-2 py-0.5 rounded-sm border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)] cursor-help" title="Entropy (Input Chaos Level)">🌪️ ${currentSession.entropy || '0'}%</span>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(li);
    }

    if (data.length === 0 && !append && !currentSession) {
        list.innerHTML = `<li class="text-center p-8 text-slate-500 font-bold uppercase tracking-widest bg-black/30 rounded-2xl border border-white/5">No records found.</li>`;
        return;
    }

    data.forEach((player, index) => {
        // Absolute rank across pagination: (page - 1) * limit + index + 1
        const rank = (currentLeaderboardPage - 1) * 10 + index + 1;

        let medalHtml = `<span class="text-slate-500 font-mono text-xl w-10 text-center bg-slate-800/80 py-1 rounded-lg">#${rank}</span>`;
        if (rank === 1) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🥇</span>`;
        if (rank === 2) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]">🥈</span>`;
        if (rank === 3) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">🥉</span>`;

        const themeColor = leaderboardMode === 'blitz' ? 'purple' : 'rose';
        const nameColor = rank === 1 ? (leaderboardMode === 'blitz' ? 'text-purple-400' : 'text-yellow-400') :
            rank === 2 ? 'text-slate-200' :
                rank === 3 ? (leaderboardMode === 'blitz' ? 'text-fuchsia-400' : 'text-amber-500') : 'text-slate-300';

        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-4 md:p-5 rounded-2xl bg-black/40 hover:bg-black/60 transform hover:scale-[1.01] transition-all duration-300 border border-white/5 hover:border-white/10 shadow-lg group relative overflow-hidden";

        // Background hover effect
        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
            <div class="flex items-center gap-4 md:gap-6 z-10 w-full">
                <div class="flex items-center justify-center w-12">${medalHtml}</div>
                <div class="flex flex-col flex-grow">
                    <span class="font-black text-xl md:text-2xl tracking-wide ${nameColor} drop-shadow-md uppercase">${player.name}</span>
                    <span class="text-xs font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1 mt-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeAgo(player.created_at)}
                    </span>
                </div>
                <div class="text-right z-10 flex flex-col items-end justify-center">
                    <span class="font-mono font-black text-3xl md:text-4xl leading-none text-${themeColor}-500 group-hover:text-${themeColor}-400 group-hover:drop-shadow-[0_0_15px_rgba(var(--color-${themeColor}-500),0.8)] transition-all" title="Total Keys Smashed">${player.score}</span>
                    <div class="flex gap-2 mt-2">
                        <span class="text-xs font-bold text-sky-400 bg-black/40 px-2 py-0.5 rounded-sm border border-sky-500/50 cursor-help" title="Keys Per Second (Speed)">⚡ ${player.kps || '0.0'}</span>
                        <span class="text-xs font-bold text-rose-400 bg-black/40 px-2 py-0.5 rounded-sm border border-rose-500/50 cursor-help" title="Entropy (Input Chaos Level)">🌪️ ${player.entropy || '0'}%</span>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;

    container.innerHTML = '';

    if (pagination.totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.className = `px-4 py-2 rounded-xl text-lg font-bold transition-all border ${pagination.page > 1 ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600 hover:text-white cursor-pointer' : 'bg-slate-800/40 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'}`;
    prevBtn.disabled = pagination.page <= 1;
    prevBtn.onclick = () => {
        if (pagination.page > 1) {
            currentLeaderboardPage = pagination.page - 1;
            fetchLeaderboard(false);
            document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    container.appendChild(prevBtn);

    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        container.appendChild(createPageButton(1, pagination.page === 1));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 text-slate-500 font-bold';
            ellipsis.innerText = '...';
            container.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createPageButton(i, i === pagination.page));
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 text-slate-500 font-bold';
            ellipsis.innerText = '...';
            container.appendChild(ellipsis);
        }
        container.appendChild(createPageButton(pagination.totalPages, pagination.page === pagination.totalPages));
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.className = `px-4 py-2 rounded-xl text-lg font-bold transition-all border ${pagination.hasMore ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600 hover:text-white cursor-pointer' : 'bg-slate-800/40 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'}`;
    nextBtn.disabled = !pagination.hasMore;
    nextBtn.onclick = () => {
        if (pagination.hasMore) {
            currentLeaderboardPage = pagination.page + 1;
            fetchLeaderboard(false);
            document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    container.appendChild(nextBtn);
}

function createPageButton(pageNum, isActive) {
    const btn = document.createElement('button');
    btn.innerText = pageNum;

    if (isActive) {
        if (leaderboardMode === 'blitz') {
            btn.className = 'px-4 py-2 rounded-xl text-lg font-bold transition-all border bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-110';
        } else {
            btn.className = 'px-4 py-2 rounded-xl text-lg font-bold transition-all border bg-rose-600/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.3)] scale-110';
        }
    } else {
        btn.className = 'px-4 py-2 rounded-xl text-lg font-bold transition-all border bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-400 hover:text-white cursor-pointer';
        btn.onclick = () => {
            currentLeaderboardPage = pageNum;
            fetchLeaderboard(false);
            document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
    }
    return btn;
}

// Fetch Leaderboard API
async function fetchLeaderboard(append = false, currentSession = null) {
    if (isLeaderboardLoading) return;
    isLeaderboardLoading = true;

    try {
        const url = `/api/leaderboard?mode=${leaderboardMode}&page=${currentLeaderboardPage}&limit=10&search=${encodeURIComponent(currentLeaderboardSearch)}`;
        const res = await fetch(url);
        const json = await res.json();

        hasMoreLeaderboard = json.pagination.hasMore;
        renderLeaderboard(json.data, append, currentSession);
        renderPagination(json.pagination);


    } catch (err) {
        console.error("Error fetching leaderboard", err);
        showToast("Error loading leaderboard");
    } finally {
        isLeaderboardLoading = false;
    }
}

// Initialize Leaderboard Events
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    fetchLeaderboard(false);

    // Search Input with Debounce
    const searchInput = document.getElementById('leaderboard-search');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentLeaderboardSearch = e.target.value.trim();
                currentLeaderboardPage = 1; // Reset to page 1 on new search
                fetchLeaderboard(false);
            }, 300); // 300ms debounce
        });
    }

});
