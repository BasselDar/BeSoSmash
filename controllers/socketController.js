const ScoreModel = require('../models/scoreModel');
const ProfileEngine = require('../utils/ProfileEngine');
const { calculateSmashScore } = require('../utils/scoring');
const {
    getGame, setGame, deleteGame,
    getCooldown, setCooldown, deleteCooldown,
    getLastBroadcastTime, setLastBroadcastTime,
} = require('./gameManager');

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('startGame', (data) => {
            // Rate limit: 3-second cooldown between games
            const now = Date.now();
            if (getCooldown(socket.id) && now - getCooldown(socket.id) < 3000) {
                return; // Silently ignore spam
            }

            // DYNAMIC TIMER: 2 seconds for Blitz, 5 seconds for Classic
            const timerDuration = data.mode === 'blitz' ? 2000 : 5000;

            // Sanitize name: trim whitespace and strip HTML tags
            const rawName = typeof data.name === 'string' ? data.name : 'Anonymous';
            const safeName = (rawName.trim().replace(/<[^>]*>/g, '').slice(0, 12) || 'Anonymous').toUpperCase();

            setGame(socket.id, {
                name: safeName,
                score: 0,
                isActive: true,
                mode: data.mode,
                keyHistory: [],
                startTime: Date.now(),
                timerDuration: timerDuration
            });

            socket.emit('gameStarted');

            // SERVER SAFETY NET: hard cap at game duration + 3s
            // Fallback if client never sends clientGameEnd (disconnect, tab close, etc.)
            // The CLIENT is the authoritative timer — clientGameEnd triggers endGame immediately
            setTimeout(() => {
                endGame(socket, io);
            }, timerDuration + 3000);
        });

        socket.on('keyPressBatch', (keys) => {
            const game = getGame(socket.id);

            if (game && game.isActive) {
                // Reject batches that arrive after the game should have ended (client timer + 1s grace)
                const elapsed = Date.now() - game.startTime;
                if (elapsed > game.timerDuration + 1000) {
                    return; // Silently drop late keys
                }

                if (Array.isArray(keys) && keys.length > 0) {
                    // Cap at 50 keys per batch to prevent flood abuse
                    const capped = keys.slice(0, 50);
                    game.score += capped.length;
                    game.keyHistory.push(capped);
                    socket.emit('scoreUpdate', game.score);
                }
            }
        });

        socket.on('clientGameEnd', (clientScore) => {
            const game = getGame(socket.id);
            if (game && game.isActive) {
                // Trust the client's final score if it's within 300 keys (packet latency tolerance)
                if (typeof clientScore === 'number' && clientScore > game.score && (clientScore - game.score) <= 300) {
                    game.score = clientScore;
                }

                // CLIENT IS AUTHORITATIVE: end the game immediately
                endGame(socket, io);
            }
        });

        socket.on('disconnect', () => {
            deleteGame(socket.id);
            deleteCooldown(socket.id);
        });
    });
};

async function endGame(socket, io) {
    const game = getGame(socket.id);
    if (!game || !game.isActive) return;

    game.isActive = false;

    // Analyze personality profiles based on keystroke history (can be multiple!)
    const analysis = ProfileEngine.analyze(game.keyHistory, game.mode);

    let playerRank = null;
    let smashScore = null;
    let finalProfiles = analysis.profiles; // Start with current run's profiles

    // Only process rankings and database insertion if they are NOT a cheater
    if (!analysis.isCheater) {
        const timerDuration = game.mode === 'blitz' ? 2 : 5;
        const kps = parseFloat((game.score / timerDuration).toFixed(1));
        const entropyVal = parseFloat(analysis.entropy) || 0;
        const profileCount = analysis.profiles ? analysis.profiles.length : 0;

        // Save first so we get the merged cumulative profiles and best performance stats
        const savedData = await ScoreModel.save(game.name, game.score, game.mode, kps, entropyVal, analysis.profiles, analysis.forceSmashScore);

        if (savedData) {
            smashScore = savedData.smashScore;
            finalProfiles = savedData.mergedProfiles; // Update to the cumulative set
        } else {
            // Fallback if DB fails
            smashScore = analysis.forceSmashScore !== undefined ? analysis.forceSmashScore : calculateSmashScore(game.score, entropyVal, kps, profileCount);
        }

        // FETCH THE UPDATED ABSOLUTE GLOBAL RANK FOR THIS SPECIFIC SCORE RUN
        playerRank = await ScoreModel.getRank(smashScore, game.mode);

        // Emit the updated global smash count to everyone (for the home page counter)
        if (savedData && savedData.totalSmashes) {
            io.emit('globalSmashCount', savedData.totalSmashes);
        }

        // Throttle leaderboard broadcasts to max once every 2 seconds to prevent Broadcast Storms
        const now = Date.now();
        if (now - getLastBroadcastTime() > 2000) {
            io.emit('updateLeaderboard');
            setLastBroadcastTime(now);
        }
    }

    // Tell the player it's over (we still send the game over payload to them, just no DB/LB save if cheater)
    socket.emit('gameOver', {
        finalScore: game.score,
        smash_score: smashScore,
        kps: game.mode === 'blitz' ? parseFloat((game.score / 2).toFixed(1)) : parseFloat((game.score / 5).toFixed(1)),
        rank: playerRank,
        profiles: finalProfiles, // Cumulative mapping used for Leaderboard's "Current Session"
        runProfiles: analysis.profiles, // The profiles earned *in this specific match*
        entropy: analysis.entropy,
        totalProfiles: ProfileEngine.getTotalCount()
    });

    setCooldown(socket.id, Date.now()); // Start cooldown
    deleteGame(socket.id);
}