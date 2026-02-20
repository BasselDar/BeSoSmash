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
                lastPressTime: 0,
                mode: data.mode // Store the mode!
            };

            socket.emit('gameStarted');

            // Use our dynamic timer
            setTimeout(() => {
                endGame(socket, io);
            }, timerDuration);
        });

        socket.on('keyPress', () => {
            const game = activeGames[socket.id];
            const now = Date.now();

            // RATE LIMIT: Block macros faster than 50ms
            if (game && game.isActive && (now - game.lastPressTime > 50)) {
                game.score++;
                game.lastPressTime = now;
                socket.emit('scoreUpdate', game.score);
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