
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
    if (!name) return showToast("ENTER A CODENAME!");

    document.getElementById('setup-panel').classList.add('hidden');
    document.getElementById('smash-zone').classList.remove('hidden');
    document.getElementById('score-display').innerText = "0";
    document.getElementById('kps-display').innerText = "0.0";
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = (gameDuration / 1000).toFixed(1) + "s";

    document.getElementById('rank-display').innerText = ranks[0].title;
    document.getElementById('rank-display').className = `text-3xl font-black neon-glow ${ranks[0].color}`;
    document.getElementById('status-text').innerText = "PRESS ANY KEY TO START!";
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
    document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD!";
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
        }
    }, 50);

    // Start Tick Loop (10Hz)
    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
        if (!active) return clearInterval(tickInterval);
        if (keyBuffer.length > 0) {
            socket.emit('keyPressBatch', keyBuffer);
            keyBuffer = []; // Empty the buffer
        }
    }, 100);

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

    processLocalKeyPress(e.code);
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
    let secondsElapsed = (Date.now() - gameStartTime) / 1000;
    if (secondsElapsed <= 0.1) secondsElapsed = 0.1; // Prevent Infinity
    const kps = (score / secondsElapsed).toFixed(1);
    document.getElementById('kps-display').innerText = kps;

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

socket.on('gameOver', (data) => {
    active = false;
    clearInterval(timerInterval);
    clearInterval(tickInterval);
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = "0.0s"; // Force end

    // Sync to final authoritative score from server
    localScore = data.finalScore;
    updateScoreParams(localScore);

    document.removeEventListener('keydown', handleKey);
    document.getElementById('status-text').innerText = "CALCULATING CHAOS...";
    document.body.style.backgroundColor = '#020617'; // Reset background

    setTimeout(() => {
        document.getElementById('setup-panel').classList.remove('hidden');
        document.getElementById('smash-zone').classList.add('hidden');
        document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD!";
        document.getElementById('status-text').classList.remove('animate-pulse');
    }, 3000);
});

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
function renderLeaderboard(data, append = false) {
    const list = document.getElementById('leaderboard-list');
    if (!append) list.innerHTML = '';

    if (data.length === 0 && !append) {
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
                <div class="text-right z-10">
                    <span class="font-mono font-black text-3xl md:text-4xl text-${themeColor}-500 group-hover:text-${themeColor}-400 group-hover:drop-shadow-[0_0_15px_rgba(var(--color-${themeColor}-500),0.8)] transition-all">${player.score}</span>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
}

// Fetch Leaderboard API
async function fetchLeaderboard(append = false) {
    if (isLeaderboardLoading) return;
    isLeaderboardLoading = true;

    // UI Loading state
    const loadBtn = document.getElementById('load-more-btn');
    if (loadBtn && append) loadBtn.classList.add('opacity-50', 'cursor-wait');

    try {
        const url = `/api/leaderboard?mode=${leaderboardMode}&page=${currentLeaderboardPage}&limit=10&search=${encodeURIComponent(currentLeaderboardSearch)}`;
        const res = await fetch(url);
        const json = await res.json();

        hasMoreLeaderboard = json.pagination.hasMore;
        renderLeaderboard(json.data, append);

        // Update load more button visibility
        if (loadBtn) {
            if (hasMoreLeaderboard) {
                loadBtn.classList.remove('hidden');
            } else {
                loadBtn.classList.add('hidden');
            }
            loadBtn.classList.remove('opacity-50', 'cursor-wait');
        }

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

    // Load More Button
    const loadBtn = document.getElementById('load-more-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (hasMoreLeaderboard && !isLeaderboardLoading) {
                currentLeaderboardPage++;
                fetchLeaderboard(true);
            }
        });
    }
});
