// public/js/core/state.js

export const state = {
    active: false,
    waitingForKey: false,
    gameStartTime: 0,
    currentMode: 'classic',
    localScore: 0,
    timerRAF: null,
    gameDuration: 5000,
    keyBuffer: [],
    tickInterval: null,
    gameToken: null,        // Anti-cheat session token from server

    // Leaderboard State
    currentLeaderboardPage: 1,
    currentLeaderboardSearch: '',
    isLeaderboardLoading: false,
    hasMoreLeaderboard: false,
    leaderboardMode: window.location.pathname.includes('blitz') ? 'blitz' : 'classic',

    // Game End State
    currentSession: null,
    finalAbsoluteRank: "UNRANKED",
    finalProfiles: [],
    finalEntropy: "0.0"
};

export const ranks = [
    { threshold: 0, title: "SLOTH", color: "text-slate-500" },
    { threshold: 40, title: "NPC ENERGY", color: "text-slate-400" },
    { threshold: 60, title: "KEYBOARD TOURIST", color: "text-slate-300" },
    { threshold: 80, title: "AVERAGE ENJOYER", color: "text-emerald-600" },
    { threshold: 100, title: "TOUCH GRASS", color: "text-emerald-500" },
    { threshold: 120, title: "SWEATY PALMS", color: "text-emerald-400" },
    { threshold: 140, title: "CAFFEINE ADDICT", color: "text-cyan-600" },
    { threshold: 160, title: "BUILT DIFFERENT", color: "text-cyan-500" },
    { threshold: 180, title: "KEYBOARD WARRIOR", color: "text-cyan-400" },
    { threshold: 200, title: "SMASH MASTER", color: "text-blue-600" },
    { threshold: 220, title: "NO CHILL MODE", color: "text-blue-500" },
    { threshold: 240, title: "ACTUAL MENACE", color: "text-blue-400" },
    { threshold: 260, title: "ANGRY GORILLA", color: "text-violet-600" },
    { threshold: 280, title: "SILVERBACK STATUS", color: "text-violet-500" },
    { threshold: 310, title: "HARAMBE", color: "text-violet-400" },
    { threshold: 340, title: "FERAL BEAST", color: "text-fuchsia-600" },
    { threshold: 370, title: "KEYCAP DESTROYER", color: "text-fuchsia-500" },
    { threshold: 400, title: "WRIST BREAKER", color: "text-fuchsia-400" },
    { threshold: 430, title: "SMASHER", color: "text-pink-600" },
    { threshold: 460, title: "GIGACHAD SMASHER", color: "text-pink-500" },
    { threshold: 490, title: "ABSOLUTE CINEMA", color: "text-pink-400" },
    { threshold: 520, title: "UNSTOPPABLE FORCE", color: "text-rose-500" },
    { threshold: 550, title: "SMASH LEGEND", color: "text-rose-400" },
    { threshold: 580, title: "OMEGA SMASHER", color: "text-red-500 animate-pulse" },
    { threshold: 600, title: "THE SINGULARITY", color: "text-red-400 animate-pulse" },
    { threshold: 650, title: "COSMIC THREAT", color: "text-orange-600 animate-pulse" },
    { threshold: 700, title: "SONIC BOOM", color: "text-orange-500 animate-pulse" },
    { threshold: 750, title: "LIGHTSPEED", color: "text-orange-400 animate-pulse" },
    { threshold: 800, title: "WARP ENGINE", color: "text-amber-500 animate-pulse" },
    { threshold: 850, title: "TIME BENDER", color: "text-amber-400 animate-pulse" },
    { threshold: 900, title: "QUANTUM ANOMALY", color: "text-yellow-500 animate-pulse" },
    { threshold: 950, title: "REALITY BREAKER", color: "text-yellow-400 animate-pulse" },
    { threshold: 1000, title: "BEYOND HUMAN", color: "text-yellow-300 animate-pulse drop-shadow-sm" },
    { threshold: 1050, title: "ASCENDED", color: "text-lime-400 animate-pulse drop-shadow-sm" },
    { threshold: 1100, title: "MYTHICAL ENTITY", color: "text-green-400 animate-pulse drop-shadow-md" },
    { threshold: 1150, title: "SPEED DEMON", color: "text-teal-300 animate-pulse drop-shadow-md" },
    { threshold: 1200, title: "GALAXY DESTROYER", color: "text-cyan-300 animate-pulse drop-shadow-md" },
    { threshold: 1250, title: "MULTIVERSE LORD", color: "text-indigo-300 animate-pulse drop-shadow-lg" },
    { threshold: 1300, title: "OMNIPOTENT SMASHER", color: "text-purple-300 animate-pulse drop-shadow-lg" },
    { threshold: 1350, title: "THE SIMULATION", color: "text-fuchsia-300 font-bold animate-pulse drop-shadow-xl" },
    { threshold: 1400, title: "ARCHITECT OF CHAOS", color: "text-white font-black animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" }
];
