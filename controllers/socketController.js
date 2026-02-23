const ScoreModel = require('../models/scoreModel');
const ProfileEngine = require('../utils/ProfileEngine');

const activeGames = {};

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('startGame', (data) => {
            // DYNAMIC TIMER: 2 seconds for Blitz, 5 seconds for Classic
            const timerDuration = data.mode === 'blitz' ? 2000 : 5000;

            // Sanitize name: trim whitespace and strip HTML tags
            const rawName = typeof data.name === 'string' ? data.name : 'Anonymous';
            const safeName = rawName.trim().replace(/<[^>]*>/g, '').slice(0, 12) || 'Anonymous';

            activeGames[socket.id] = {
                name: safeName,
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
                    // Cap to 8 keys per 100ms tick — human physical limit, prevents spoofing
                    const safeBatch = keys.slice(0, 8);
                    game.score += safeBatch.length;
                    game.keyHistory.push(safeBatch); // Save the physical batch of keys pressed in this 100ms tick
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

    // PASS THE MODE TO THE DATABASE MODEL!
    const timerDuration = game.mode === 'blitz' ? 2 : 5;
    const kps = parseFloat((game.score / timerDuration).toFixed(1));
    const entropyVal = parseFloat(analysis.entropy) || 0;
    await ScoreModel.save(game.name, game.score, game.mode, kps, entropyVal);

    // Signal all clients to re-fetch the leaderboard (client ignores the payload and hits REST API anyway)
    io.emit('updateLeaderboard');

    delete activeGames[socket.id];
}