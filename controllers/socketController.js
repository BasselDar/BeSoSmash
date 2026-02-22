const ScoreModel = require('../models/scoreModel');

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
                mode: data.mode // Store the mode!
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

    // PASS THE MODE TO THE DATABASE MODEL!
    await ScoreModel.save(game.name, game.score, game.mode);

    // Tell the player it's over
    socket.emit('gameOver', { finalScore: game.score });

    // Fetch the updated leaderboard FOR THIS SPECIFIC MODE
    const newLeaderboard = await ScoreModel.getLeaderboard(game.mode);
    io.emit('updateLeaderboard', newLeaderboard);

    delete activeGames[socket.id];
}