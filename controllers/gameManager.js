// controllers/gameManager.js — Active game state management

const activeGames = {};
const cooldowns = {}; // Per-socket cooldown tracker
let lastLeaderboardBroadcast = 0;

function getGame(socketId) {
    return activeGames[socketId];
}

function setGame(socketId, game) {
    activeGames[socketId] = game;
}

function deleteGame(socketId) {
    delete activeGames[socketId];
}

function getCooldown(socketId) {
    return cooldowns[socketId] || 0;
}

function setCooldown(socketId, time) {
    cooldowns[socketId] = time;
}

function deleteCooldown(socketId) {
    delete cooldowns[socketId];
}

function getLastBroadcastTime() {
    return lastLeaderboardBroadcast;
}

function setLastBroadcastTime(time) {
    lastLeaderboardBroadcast = time;
}

module.exports = {
    getGame,
    setGame,
    deleteGame,
    getCooldown,
    setCooldown,
    deleteCooldown,
    getLastBroadcastTime,
    setLastBroadcastTime,
};
