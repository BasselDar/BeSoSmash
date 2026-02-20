
const socket = io();
let active = false;
let waitingForKey = false;
let gameStartTime = 0;
let currentMode = 'classic';
let localScore = 0;
let lastLocalPressTime = 0;
let timerInterval;
let gameDuration = 5000;

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
    lastLocalPressTime = 0;
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

socket.on('gameStarted', () => {
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
        }
    }, 50);
});

function handleFirstKey(e) {
    if (!waitingForKey || e.repeat) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    waitingForKey = false;
    document.removeEventListener('keydown', handleFirstKey);
    document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD!";
    document.getElementById('status-text').classList.remove('animate-pulse');

    const name = document.getElementById('username').value.trim();
    socket.emit('startGame', { name: name, mode: currentMode });

    processLocalKeyPress();
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
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    if (e.repeat) return;

    processLocalKeyPress();
}

function processLocalKeyPress() {
    const now = Date.now();
    // Simulate server 50ms rate limit to prevent rubberbanding
    if (localScore === 0 || (now - lastLocalPressTime > 50)) {
        localScore++;
        lastLocalPressTime = now;
        updateScoreParams(localScore);
        triggerVisuals();
        socket.emit('keyPress'); // Async emit
    }
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

// Real-Time Leaderboard Update (with medals)
socket.on('updateLeaderboard', (leaders) => {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    leaders.forEach((player, index) => {
        let medalHtml = `<span class="text-slate-500 w-8 text-center">#${index + 1}</span> <span class="text-slate-400">${player.name}</span>`;
        if (index === 0) medalHtml = `<span class="text-2xl">🥇</span> <span class="text-yellow-400">${player.name}</span>`;
        if (index === 1) medalHtml = `<span class="text-2xl">🥈</span> <span class="text-slate-300">${player.name}</span>`;
        if (index === 2) medalHtml = `<span class="text-2xl">🥉</span> <span class="text-amber-600">${player.name}</span>`;

        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors border border-slate-700/50";
        li.innerHTML = `
            <span class="font-bold text-lg flex items-center gap-3">${medalHtml}</span>
            <span class="font-black text-xl text-rose-400">${player.score}</span>
        `;
        list.appendChild(li);
    });
});
