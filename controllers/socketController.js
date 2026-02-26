const crypto = require('crypto');
const ScoreModel = require('../models/scoreModel');
const ProfileEngine = require('../utils/ProfileEngine');
const { calculateSmashScore } = require('../utils/scoring');
const {
    getGame, setGame, deleteGame,
    getCooldown, setCooldown, deleteCooldown,
    getLastBroadcastTime, setLastBroadcastTime,
} = require('./gameManager');

// ──────────────────────────────────────────────────────────
// ANTI-CHEAT CONFIG
// ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://besosmash.onrender.com',
    'https://www.besosmash.onrender.com'
];
const MAX_KEYS_PER_SECOND = 300;    // Hard ceiling: max accepted keys per second (human max ~240 KPS forearm smash)
const MIN_BATCH_INTERVAL_MS = 15;  // Minimum ms between batches (browser flushes every 50ms)
const MAX_VIOLATIONS = 3;          // 3 rate limit strikes = game killed as cheater

module.exports = (io) => {

    // ── LAYER 1: Origin Validation ──────────────────────────
    // Reject connections that don't come from the actual website.
    // This kills raw Python/curl scripts dead on arrival.
    io.use((socket, next) => {
        const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || '';
        const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));

        if (!isAllowed && process.env.NODE_ENV === 'production') {
            console.warn(`🚫 Blocked socket from unauthorized origin: ${origin}`);
            return next(new Error('Unauthorized origin'));
        }
        next();
    });

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

            // ── LAYER 2: Challenge Token ────────────────────────
            // Generate a lightweight random hex token tied to this game session.
            // The client must echo it back with every keyPressBatch.
            const gameToken = crypto.randomBytes(8).toString('hex');

            setGame(socket.id, {
                name: safeName,
                score: 0,
                isActive: true,
                mode: data.mode,
                keyHistory: [],
                startTime: Date.now(),
                timerDuration: timerDuration,
                gameToken: gameToken,              // Anti-cheat token
                rateWindow: { count: 0, windowStart: Date.now() }, // Rate limiter state
                lastBatchTime: 0,                  // Batch frequency tracking
                violations: 0                      // Rate limit violation counter
            });

            // Send token to the legitimate browser client
            socket.emit('gameStarted', { token: gameToken });

            // SERVER SAFETY NET: hard cap at game duration + 3s
            setTimeout(() => {
                endGame(socket, io);
            }, timerDuration + 3000);
        });

        socket.on('keyPressBatch', (payload) => {
            const game = getGame(socket.id);

            if (game && game.isActive) {
                // ── LAYER 2: Token Validation ───────────────────
                // Reject batches that don't include the correct session token.
                let keys, token;
                if (typeof payload === 'object' && !Array.isArray(payload) && payload !== null) {
                    keys = payload.keys;
                    token = payload.token;
                } else if (Array.isArray(payload)) {
                    // Legacy/unpatched client fallback — still accept arrays but flag them
                    keys = payload;
                    token = null;
                } else {
                    return; // Invalid payload shape
                }

                if (token !== game.gameToken) {
                    // Token mismatch — either forged or from a script that doesn't know the token
                    return; // Silently drop
                }

                // Reject batches that arrive after the game should have ended
                const elapsed = Date.now() - game.startTime;
                if (elapsed > game.timerDuration + 1000) {
                    return; // Silently drop late keys
                }

                if (Array.isArray(keys) && keys.length > 0) {
                    // Cap at 300 keys per batch — covers forearm slams with full N-key rollover
                    const capped = keys.slice(0, 300);

                    // ── LAYER 3: Elapsed-Time Rate Limiter ──────────
                    // Hard ceiling: you can never have more keys than
                    // (elapsed seconds × MAX_KPS) + an initial burst allowance. 
                    // This is bulletproof because it compares total keys vs real wallclock time.
                    const now = Date.now();
                    const elapsedSec = Math.max(0.1, (now - game.startTime) / 1000);
                    // 300 burst buffer covers N-key rollover forearm slams on large mechanical keyboards
                    const maxAllowedTotal = 300 + Math.floor(elapsedSec * MAX_KEYS_PER_SECOND);
                    const headroom = maxAllowedTotal - game.score;

                    if (headroom <= 0) {
                        // Already at the ceiling — drop everything
                        game.violations++;
                        if (game.violations >= MAX_VIOLATIONS) {
                            game.keyHistory.push(['SCRIPT_DETECTED']);
                            endGame(socket, io);
                        }
                        return;
                    }

                    // ── LAYER 4: Batch Frequency Check ──────────────
                    // Prevent clients from sending batches too frequently.
                    // Browser typically flushes every 50ms, so anything faster is suspicious.
                    const timeSinceLastBatch = now - game.lastBatchTime;
                    if (game.lastBatchTime > 0 && timeSinceLastBatch < MIN_BATCH_INTERVAL_MS) {
                        game.violations++;
                        if (game.violations >= MAX_VIOLATIONS) {
                            // Force-flag as cheater and end game immediately
                            game.keyHistory.push(['SCRIPT_DETECTED']);
                            endGame(socket, io);
                            return; // Drop this batch if we just banned them
                        }
                        // We DO NOT return here, so legitimate "final flush" batches 
                        // that happen to arrive <15ms after the interval aren't dropped.
                    }
                    game.lastBatchTime = now; // Update last batch time for the next check

                    // Accept only as many keys as the ceiling allows
                    const accepted = capped.slice(0, headroom);
                    game.score += accepted.length;
                    game.keyHistory.push(accepted);
                    socket.emit('scoreUpdate', game.score);
                }
            }
        });

        // ── LAYER 4: Remove Client Score Trust ──────────────────
        // The server's count is the ONLY authoritative score.
        // No more +300 tolerance for the client's "final score".
        socket.on('clientGameEnd', () => {
            const game = getGame(socket.id);
            if (game && game.isActive) {
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

    let isPersonalBest = true;
    let highestSmashScore = smashScore;
    let currentRunRank = null;
    let existingProfileTitles = [];

    // Only process rankings and database insertion if they are NOT a cheater
    if (!analysis.isCheater) {
        const timerDuration = game.mode === 'blitz' ? 2 : 5;
        const kps = parseFloat((game.score / timerDuration).toFixed(1));
        const entropyVal = parseFloat(analysis.entropy) || 0;
        const profileCount = analysis.profiles ? analysis.profiles.length : 0;

        // Save first so we get the merged cumulative profiles and best performance stats
        const savedData = await ScoreModel.save(game.name, game.score, game.mode, kps, entropyVal, analysis.profiles, analysis.forceSmashScore);

        if (savedData) {
            smashScore = savedData.smashScore; // Score for THIS EXACT run
            finalProfiles = savedData.mergedProfiles; // Update to the cumulative set
            isPersonalBest = savedData.isPersonalBest;
            highestSmashScore = savedData.highestSmashScore; // Their all-time best
            existingProfileTitles = savedData.existingProfileTitles || [];
        } else {
            // Fallback if DB fails
            smashScore = analysis.forceSmashScore !== undefined ? analysis.forceSmashScore : calculateSmashScore(game.score, entropyVal, kps, profileCount);
            highestSmashScore = smashScore;
        }

        // FETCH RANKS
        // 1. Where does this EXACT run rank? (For the post-game UI)
        currentRunRank = await ScoreModel.getRank(smashScore, game.mode);
        // 2. Where does their permanent PB rank? (For DB pagination)
        playerRank = await ScoreModel.getRank(highestSmashScore, game.mode, game.name);

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
        highestSmashScore: highestSmashScore,
        isPersonalBest: isPersonalBest,
        kps: game.mode === 'blitz' ? parseFloat((game.score / 2).toFixed(1)) : parseFloat((game.score / 5).toFixed(1)),
        rank: !analysis.isCheater ? currentRunRank : null,
        pbRank: playerRank,
        profiles: finalProfiles, // Cumulative mapping used for Leaderboard's "Current Session"
        runProfiles: analysis.profiles, // The profiles earned *in this specific match*
        existingProfileTitles: existingProfileTitles, // Profile titles that were in the DB BEFORE this run
        entropy: analysis.entropy,
        totalProfiles: ProfileEngine.getTotalCount()
    });

    setCooldown(socket.id, Date.now()); // Start cooldown
    deleteGame(socket.id);
}