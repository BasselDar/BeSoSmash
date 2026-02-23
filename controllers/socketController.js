const ScoreModel = require('../models/scoreModel');
const ProfileEngine = require('../utils/ProfileEngine');

const activeGames = {};

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('startGame', (data) => {
            // DYNAMIC TIMER: 2 seconds for Blitz, 5 seconds for Classic
            const timerDuration = data.mode === 'blitz' ? 2000 : 5000;

            activeGames[socket.id] = {
                name: data.name,
                score: 0,
                isActive: true,
                mode: data.mode, // Store the mode!
                keyHistory: [] // Store the batches of keys for personality profiling
            };

            socket.emit('gameStarted');

            // Use dynamic timer but add 1500ms grace period for final network batch to arrive
            // The client strictly controls its own UI timer limit anyway.
            setTimeout(() => {
                endGame(socket, io);
            }, timerDuration + 1500);
        });

        socket.on('keyPressBatch', (keys) => {
            const game = activeGames[socket.id];

            if (game && game.isActive) {
                if (Array.isArray(keys) && keys.length > 0) {
                    game.score += keys.length;
                    game.keyHistory.push(keys); // Save the physical batch of keys pressed in this 100ms tick
                    socket.emit('scoreUpdate', game.score);
                }
            }
        });

        socket.on('disconnect', () => {
            delete activeGames[socket.id];
        });
    });
};

async function endGame(socket, io) {
    const game = activeGames[socket.id];
    if (!game || !game.isActive) return;

    game.isActive = false;

    // FETCH THE UPDATED ABSOLUTE GLOBAL RANK FOR THIS SPECIFIC SCORE RUN
    // We want to know how many players have a score strictly STRONGER than this current run.
    const playerRank = await ScoreModel.getRank(game.score, game.mode);

    // Analyze personality profiles based on keystroke history (can be multiple!)
    const analysis = ProfileEngine.analyze(game.keyHistory, game.mode);

    // Tell the player it's over
    socket.emit('gameOver', {
        finalScore: game.score,
        rank: playerRank,
        profiles: analysis.profiles,
        entropy: analysis.entropy
    });

    // Calculate KPS
    const gameDurationSeconds = game.mode === 'blitz' ? 2 : 5;
    const kps = (game.score / gameDurationSeconds).toFixed(1);

    // PASS THE MODE AND NEW METRICS TO THE DATABASE MODEL!
    await ScoreModel.save(game.name, game.score, game.mode, analysis.entropy, kps);

    // Fetch the updated leaderboard FOR THIS SPECIFIC MODE
    const newLeaderboard = await ScoreModel.getLeaderboard(game.mode);
    io.emit('updateLeaderboard', newLeaderboard);

    delete activeGames[socket.id];
}