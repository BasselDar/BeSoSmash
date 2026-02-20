const { Pool } = require('pg');
const { createClient } = require('redis');

// 1. Setup Connections
const pool = new Pool();
const redisClient = createClient(); // Connects to localhost:6379 by default

redisClient.on('error', (err) => console.log('❌ Redis Client Error', err));

const initDB = async () => {
    try {
        // Init Postgres
        await pool.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                score INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_score ON scores (score DESC)`);
        console.log("✅ PostgreSQL Connected");

        // Init Redis
        await redisClient.connect();
        console.log("✅ Redis Connected");

        // 🔥 CACHE WARM-UP: Load Top 10 from PG into Redis on startup
        const topScores = await pool.query(`SELECT name, score FROM scores ORDER BY score DESC LIMIT 10`);

        for (const row of topScores.rows) {
            // ZADD adds to a Sorted Set. 
            // Note: Redis ZSETs require unique values. If someone uses an existing name, it updates their highest score!
            await redisClient.zAdd('leaderboard_classic', { score: row.score, value: row.name });
        }
        console.log("🔥 Redis Cache Warmed Up");

    } catch (err) {
        console.error("❌ Init Error:", err);
    }
};

initDB();

class ScoreModel {
    static async getLeaderboard(mode = 'classic') {
        try {
            // 🚀 FAST READ: We only read from Redis now! O(log N) speed.
            // zRangeWithScores gets the top 10 (0 to 9) in REVerse order (highest first)
            const results = await redisClient.zRangeWithScores(`leaderboard_${mode}`, 0, 9, { REV: true });

            // Redis returns data like: [{ value: 'Admin', score: 100 }, ...]
            // We map it to match our frontend's expected format: [{ name: 'Admin', score: 100 }]
            return results.map(item => ({
                name: item.value,
                score: item.score
            }));

        } catch (err) {
            console.error("Error fetching from Redis:", err);
            return [];
        }
    }

    static async save(name, score, mode = 'classic') {
        try {
            // 1. BACKUP WRITE: Save to PostgreSQL permanently
            const sql = `INSERT INTO scores (name, score) VALUES ($1, $2)`;
            await pool.query(sql, [name, score]);

            // 2. CACHE WRITE: Update the Redis Sorted Set
            await redisClient.zAdd(`leaderboard_${mode}`, { score: score, value: name });

        } catch (err) {
            console.error("Error saving score:", err);
        }
    }
}

module.exports = ScoreModel;