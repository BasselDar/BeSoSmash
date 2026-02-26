const { pool, redisClient } = require('../models/db');
const ScoreModel = require('../models/scoreModel');

async function resyncRedis() {
    console.log("Starting Redis Re-sync...");

    try {
        await redisClient.connect();
        // Clear out the old leaderboard in Redis to prevent orphaned entries
        await redisClient.del('leaderboard_classic');
        console.log("Cleared old leaderboard_classic from Redis.");

        // Fetch all scores from PostgreSQL
        const result = await pool.query('SELECT name, smash_score, profiles FROM scores');

        let legitCount = 0;
        let cheaterCount = 0;

        for (const row of result.rows) {
            let profiles = [];
            try {
                profiles = typeof row.profiles === 'string' ? JSON.parse(row.profiles) : (row.profiles || []);
            } catch (e) { }

            const isFlagged = profiles.some(p => p.title === 'Suspected Cheater');
            // Cheaters get a negative score to sink to the bottom of the ZSET
            const redisScore = isFlagged ? -parseInt(row.smash_score, 10) : parseInt(row.smash_score, 10);

            await redisClient.zAdd('leaderboard_classic', { score: redisScore, value: row.name });

            if (isFlagged) cheaterCount++;
            else legitCount++;
        }

        console.log(`✅ Redis Re-sync Complete!`);
        console.log(`Pushed ${legitCount} legitimate scores.`);
        console.log(`Pushed ${cheaterCount} flagged cheater scores (with negative weights).`);

    } catch (err) {
        console.error("Error during Redis resync:", err);
    } finally {
        // Close connections so the script exits
        await pool.end();
        await redisClient.quit();
        process.exit(0);
    }
}

resyncRedis();
