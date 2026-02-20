
const socket = io();
let active = false;
let gameStartTime = 0;
let currentMode = 'classic';

// Ranks based on score thresholds
const ranks = [
    { threshold: 0, title: "NOVICE", color: "text-slate-300" },
    { threshold: 20, title: "BUTTON MASHER", color: "text-green-400" },
    { threshold: 40, title: "KEYBOARD THREAT", color: "text-blue-400" },
    { threshold: 60, title: "BERSERKER", color: "text-purple-500" },
    { threshold: 80, title: "CHAOS GOD", color: "text-rose-500" },
    { threshold: 100, title: "ELDRITCH ENTITY", color: "text-red-600" }
];

function startGame(mode) {
    currentMode = mode;
    const name = document.getElementById('username').value.trim();
    if (!name) return alert("ENTER A CODENAME!");

    document.getElementById('setup-panel').classList.add('hidden');
    document.getElementById('smash-zone').classList.remove('hidden');
    document.getElementById('score-display').innerText = "0";
    document.getElementById('kps-display').innerText = "0.0";
    document.getElementById('rank-display').innerText = ranks[0].title;
    document.getElementById('rank-display').className = `text-2xl font-black neon-glow ${ranks[0].color}`;

    socket.emit('startGame', { name: name, mode: currentMode });
}

socket.on('gameStarted', () => {
    active = true;
    gameStartTime = Date.now();
    document.addEventListener('keydown', handleKey);
});

function handleKey(e) {
    // FIX: Only block scrolling IF the game is currently active!
    if (active && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (active) {
        socket.emit('keyPress');

        // Aggressive Visual Feedback
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

        // Flash background red briefly
        document.body.style.backgroundColor = '#450a0a';
        setTimeout(() => document.body.style.backgroundColor = '#020617', 50);
    }
}

socket.on('scoreUpdate', (score) => {
    document.getElementById('score-display').innerText = score;

    // Calculate Keys Per Second (KPS)
    const secondsElapsed = (Date.now() - gameStartTime) / 1000;
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
        rankEl.className = `text-2xl font-black neon-glow ${currentRank.color}`;
        // Animate rank change
        anime({ targets: rankEl, scale: [1.5, 1], duration: 300 });
    }
});

socket.on('gameOver', (data) => {
    active = false;
    document.removeEventListener('keydown', handleKey);
    document.getElementById('status-text').innerText = "CALCULATING CHAOS...";
    document.body.style.backgroundColor = '#020617'; // Reset background

    setTimeout(() => {
        document.getElementById('setup-panel').classList.remove('hidden');
        document.getElementById('smash-zone').classList.add('hidden');
        document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD!";
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
