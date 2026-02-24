// public/js/core/state.js

export const state = {
    active: false,
    waitingForKey: false,
    gameStartTime: 0,
    currentMode: 'classic',
    localScore: 0,
    timerInterval: null,
    gameDuration: 5000,
    keyBuffer: [],
    tickInterval: null,

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
    { threshold: 10, title: "KEYBOARD SNIFFER", color: "text-slate-400" },
    { threshold: 25, title: "BUTTON FUMBLER", color: "text-emerald-600" },
    { threshold: 40, title: "POKE TYPER", color: "text-emerald-500" },
    { threshold: 60, title: "CASUAL CLICKER", color: "text-green-400" },
    { threshold: 80, title: "AVERAGE ENJOYER", color: "text-teal-400" },
    { threshold: 100, title: "SWEATY PALMS", color: "text-sky-400" },
    { threshold: 120, title: "CAFFEINE ADDICT", color: "text-blue-500" },
    { threshold: 140, title: "MECHANICAL MENACE", color: "text-indigo-400" },
    { threshold: 165, title: "KEYBOARD WARRIOR", color: "text-indigo-500" },
    { threshold: 190, title: "CARPAL TUNNEL SPEEDRUNNER", color: "text-violet-500" },
    { threshold: 220, title: "KEYCAP DESTROYER", color: "text-purple-500" },
    { threshold: 250, title: "FINGER DEMON", color: "text-fuchsia-500" },
    { threshold: 280, title: "ANGRY GORILLA", color: "text-pink-500" },
    { threshold: 310, title: "FERAL BEAST", color: "text-rose-500" },
    { threshold: 350, title: "WRIST BREAKER", color: "text-red-500" },
    { threshold: 400, title: "KEYBOARD GENOCIDE", color: "text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" },
    { threshold: 450, title: "BEYOND HUMAN", color: "text-red-600 drop-shadow-[0_0_12px_rgba(220,38,38,0.7)]" },
    { threshold: 500, title: "THE SINGULARITY", color: "text-red-600 animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" },
    { threshold: 600, title: "GOD OF SMASH", color: "text-yellow-300 animate-pulse drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]" }
];
