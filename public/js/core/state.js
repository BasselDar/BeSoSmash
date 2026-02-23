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
    finalAbsoluteRank: "UNRANKED",
    finalProfiles: [],
    finalEntropy: "0.0"
};

export const ranks = [
    { threshold: 0, title: "NOVICE", color: "text-slate-300" },
    { threshold: 20, title: "BUTTON MASHER", color: "text-green-400" },
    { threshold: 40, title: "KEYBOARD THREAT", color: "text-blue-400" },
    { threshold: 60, title: "BERSERKER", color: "text-purple-500" },
    { threshold: 80, title: "CHAOS GOD", color: "text-rose-500" },
    { threshold: 100, title: "ELDRITCH ENTITY", color: "text-red-600" }
];
