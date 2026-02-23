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
    { threshold: 20, title: "KEYBOARD SNIFFER", color: "text-emerald-500" },
    { threshold: 40, title: "BUTTON FUMBLER", color: "text-green-400" },
    { threshold: 60, title: "AVERAGE ENJOYER", color: "text-sky-400" },
    { threshold: 80, title: "SWEATY PALMS", color: "text-blue-500" },
    { threshold: 100, title: "CAFFEINE ADDICT", color: "text-indigo-400" },
    { threshold: 120, title: "MECHANICAL MENACE", color: "text-purple-500" },
    { threshold: 140, title: "CARPAL TUNNEL SPEEDRUNNER", color: "text-fuchsia-400" },
    { threshold: 160, title: "KEYCAP DESTROYER", color: "text-rose-500" },
    { threshold: 180, title: "ANGRY GORILLA", color: "text-red-500" },
    { threshold: 200, title: "FERAL BEAST", color: "text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" },
    { threshold: 250, title: "THE SINGULARITY", color: "text-red-600 animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" }
];
