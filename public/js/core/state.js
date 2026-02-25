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
    { threshold: 60, title: "KEYBOARD TOURIST", color: "text-emerald-700" },
    { threshold: 80, title: "AVERAGE ENJOYER", color: "text-emerald-600" },
    { threshold: 100, title: "TOUCH GRASS", color: "text-emerald-500" },
    { threshold: 120, title: "SWEATY PALMS", color: "text-green-400" },
    { threshold: 140, title: "CAFFEINE ADDICT", color: "text-teal-400" },
    { threshold: 160, title: "BUILT DIFFERENT", color: "text-cyan-400" },
    { threshold: 180, title: "KEYBOARD WARRIOR", color: "text-sky-400" },
    { threshold: 200, title: "SMASH MASTER", color: "text-blue-500" },
    { threshold: 220, title: "NO CHILL MODE", color: "text-indigo-400" },
    { threshold: 240, title: "ACTUAL MENACE", color: "text-indigo-500" },
    { threshold: 260, title: "ANGRY GORILLA", color: "text-orange-500" },
    { threshold: 280, title: "SILVERBACK STATUS", color: "text-orange-600" },
    { threshold: 310, title: "HARAMBE", color: "text-amber-500" },
    { threshold: 340, title: "FERAL BEAST", color: "text-amber-600" },
    { threshold: 370, title: "KEYCAP DESTROYER", color: "text-violet-500" },
    { threshold: 400, title: "WRIST BREAKER", color: "text-purple-500" },
    { threshold: 430, title: "SMASHER", color: "text-fuchsia-500" },
    { threshold: 460, title: "GIGACHAD SMASHER", color: "text-pink-500" },
    { threshold: 490, title: "ABSOLUTE CINEMA", color: "text-rose-500" },
    { threshold: 520, title: "UNSTOPPABLE FORCE", color: "text-red-500" },
    { threshold: 550, title: "BEYOND HUMAN", color: "text-red-600" },
    { threshold: 580, title: "OMEGA SMASHER", color: "text-red-600 animate-pulse" },
    { threshold: 600, title: "THE SINGULARITY", color: "text-yellow-300 animate-pulse" }
];
