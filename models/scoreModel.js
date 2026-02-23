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
        await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'classic'`);
        await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS kps NUMERIC(5,1) DEFAULT 0.0`);
        await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS entropy NUMERIC(5,1) DEFAULT 0.0`);
        await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS smash_score BIGINT DEFAULT 0`);

        // Setup initial values if retrofitting
        await pool.query(`UPDATE scores SET smash_score = (score * 1000) + ROUND(entropy * 10) + ROUND(kps * 10) WHERE smash_score = 0 OR smash_score IS NULL`);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_smash_score ON scores (smash_score DESC)`);
        console.log("✅ PostgreSQL Connected");

        // Init Redis
        await redisClient.connect();
        console.log("✅ Redis Connected");

        // 🔥 CACHE WARM-UP: Load Top 10 from PG into Redis on startup
        const topScores = await pool.query(`SELECT name, smash_score FROM scores ORDER BY smash_score DESC LIMIT 10`);

        for (const row of topScores.rows) {
            // ZADD adds to a Sorted Set. 
            // Note: Redis ZSETs require unique values. If someone uses an existing name, it updates their highest score!
            await redisClient.zAdd('leaderboard_classic', { score: row.smash_score, value: row.name });
        }
        console.log("🔥 Redis Cache Warmed Up");

    } catch (err) {
        console.error("❌ Init Error:", err);
    }
};

initDB();

class ScoreModel {

    static async getRank(smashScore, mode = 'classic') {
        try {
            // Use Postgres for accurate ranking — counts rows with a strictly higher score.
            // This is authoritative and immune to the Redis name-uniqueness collision problem.
            const result = await pool.query(
                `SELECT COUNT(*) FROM scores WHERE mode = $1 AND smash_score > $2`,
                [mode, smashScore]
            );
            return parseInt(result.rows[0].count, 10) + 1; // Convert to 1-based rank
        } catch (err) {
            console.error("Error fetching rank from Postgres:", err);
            return null;
        }
    }

    static async getPaginatedLeaderboard(mode = 'classic', page = 1, limit = 10, search = '') {
        try {
            const offset = (page - 1) * limit;

            // Generate absolute row ranking across the ENTIRE table before filtering by search/pagination!
            let query = `
                WITH RankedScores AS (
                    SELECT name, score, mode, kps, entropy, smash_score, created_at,
                           ROW_NUMBER() OVER(ORDER BY smash_score DESC, created_at DESC) as global_rank
                    FROM scores
                    WHERE mode = $1
                )
                SELECT * FROM RankedScores
            `;
            const queryParams = [mode];

            if (search) {
                query += ` WHERE name ILIKE $2`;
                queryParams.push(`%${search}%`);
            }

            query += ` ORDER BY global_rank ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
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

    static async save(name, score, mode = 'classic', kps = 0.0, entropy = 0.0) {
        try {
            const smashScore = (score * 1000) + Math.round(entropy * 10) + Math.round(kps * 10);

            // Check if player already has a score for this mode
            const checkSql = `SELECT id, score, smash_score FROM scores WHERE name = $1 AND mode = $2 LIMIT 1`;
            const { rows } = await pool.query(checkSql, [name, mode]);

            if (rows.length > 0) {
                // Record exists. Is this a new high score?
                const existingId = rows[0].id;
                const existingSmashScore = rows[0].smash_score || 0;

                if (smashScore > existingSmashScore) {
                    // Update to the new higher score
                    const updateSql = `UPDATE scores SET score = $1, kps = $2, entropy = $3, smash_score = $4, created_at = CURRENT_TIMESTAMP WHERE id = $5`;
                    await pool.query(updateSql, [score, kps, entropy, smashScore, existingId]);
                    console.log(`[DB] Updated high score for ${name} (${mode}): ${existingSmashScore} -> ${smashScore}`);
                }
            } else {
                // Record doesn't exist. Insert new.
                const insertSql = `INSERT INTO scores (name, score, mode, kps, entropy, smash_score) VALUES ($1, $2, $3, $4, $5, $6)`;
                await pool.query(insertSql, [name, score, mode, kps, entropy, smashScore]);
                console.log(`[DB] Inserted new score for ${name} (${mode}): ${smashScore} (Keys:${score} KPS:${kps} ENV:${entropy})`);
            }

            // 2. CACHE WRITE: Update the Redis Sorted Set ONLY IF greater
            // The { GT: true } flag ensures Redis only updates the score if the new score is Greater Than the existing score.
            await redisClient.zAdd(`leaderboard_${mode}`, { score: smashScore, value: name }, { GT: true });

            // Trim to top 1000 entries to prevent unbounded growth (remove rank 1001 and below)
            await redisClient.zRemRangeByRank(`leaderboard_${mode}`, 0, -1001);

        } catch (err) {
            console.error("Error saving score:", err);
        }
    }
}

module.exports = ScoreModel;