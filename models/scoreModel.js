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
                mode VARCHAR(20) DEFAULT 'classic',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Migration: add mode column if it doesn't exist
        await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'classic'`);
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

    static async getPaginatedLeaderboard(mode = 'classic', page = 1, limit = 10, search = '') {
        try {
            const offset = (page - 1) * limit;
            let query = `SELECT name, score, mode, created_at FROM scores WHERE mode = $1`;
            const queryParams = [mode];

            if (search) {
                query += ` AND name ILIKE $2`;
                queryParams.push(`%${search}%`);
            }

            query += ` ORDER BY score DESC, created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
            queryParams.push(limit, offset);

            const result = await pool.query(query, queryParams);

            // Also get total count for pagination info
            let countQuery = `SELECT COUNT(*) FROM scores WHERE mode = $1`;
            const countParams = [mode];
            if (search) {
                countQuery += ` AND name ILIKE $2`;
                countParams.push(`%${search}%`);
            }
            const countResult = await pool.query(countQuery, countParams);
            const totalCount = parseInt(countResult.rows[0].count, 10);
            const totalPages = Math.ceil(totalCount / limit);

            return {
                data: result.rows,
                pagination: {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalCount,
                    totalPages,
                    hasMore: page < totalPages
                }
            };
        } catch (err) {
            console.error("Error fetching paginated leaderboard from Postgres:", err);
            return { data: [], pagination: {} };
        }
    }

    static async save(name, score, mode = 'classic') {
        try {
            // Check if player already has a score for this mode
            const checkSql = `SELECT id, score FROM scores WHERE name = $1 AND mode = $2 LIMIT 1`;
            const { rows } = await pool.query(checkSql, [name, mode]);

            if (rows.length > 0) {
                // Record exists. Is this a new high score?
                const existingId = rows[0].id;
                const existingScore = rows[0].score;

                if (score > existingScore) {
                    // Update to the new higher score
                    const updateSql = `UPDATE scores SET score = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2`;
                    await pool.query(updateSql, [score, existingId]);
                    console.log(`[DB] Updated high score for ${name} (${mode}): ${existingScore} -> ${score}`);
                }
            } else {
                // Record doesn't exist. Insert new.
                const insertSql = `INSERT INTO scores (name, score, mode) VALUES ($1, $2, $3)`;
                await pool.query(insertSql, [name, score, mode]);
                console.log(`[DB] Inserted new score for ${name} (${mode}): ${score}`);
            }

            // 2. CACHE WRITE: Update the Redis Sorted Set ONLY IF greater
            // The { GT: true } flag ensures Redis only updates the score if the new score is Greater Than the existing score.
            await redisClient.zAdd(`leaderboard_${mode}`, { score: score, value: name }, { GT: true });

        } catch (err) {
            console.error("Error saving score:", err);
        }
    }
}

module.exports = ScoreModel;