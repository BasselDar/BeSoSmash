// public/js/main.js
import { startGame, resetGame, shareScore, saveCardImage, initGameEngine, clearCodename } from './game/engine.js';
import { initLeaderboard } from './ui/leaderboard.js';
import { showToast } from './ui/toast.js';

// Bind functions to the global window object
// so that inline HTML handlers (e.g. onclick="startGame('classic')") still work.
window.startGame = startGame;
window.resetGame = resetGame;
window.shareScore = shareScore;
window.saveCardImage = saveCardImage;
window.showToast = showToast;
window.clearCodename = clearCodename;

// Initialize components once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initLeaderboard();
    initGameEngine();
});
