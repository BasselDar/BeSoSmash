const { Pool } = require('pg');
const { createClient } = require('redis');

const pool = new Pool(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
} : {});

let redisConnectionString = process.env.REDIS_URL;
let redisConfig = {
    pingInterval: 120000
};

if (redisConnectionString) {
    if (redisConnectionString.startsWith('redis://') && redisConnectionString.includes('upstash')) {
        redisConnectionString = redisConnectionString.replace('redis://', 'rediss://');
        console.log("Auto-upgraded Upstash URL to rediss:// for TLS");
    }

    redisConfig.url = redisConnectionString;

    if (redisConnectionString.startsWith('rediss://')) {
        redisConfig.socket = {
            tls: true,
            rejectUnauthorized: false
        };
    }
}

const redisClient = createClient(redisConfig);

redisClient.on('error', (err) => console.log('Redis Client Error:', err.message));

const initDB = async () => {
    try {
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
        await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS profiles TEXT DEFAULT '[]'`);

        // Recalculate all smash_scores: keys × 1337 + entropy² × 1.7 + KPS × 69 + profiles × 420
        await pool.query(`UPDATE scores SET smash_score = ROUND((score * 1337) + (entropy * entropy * 1.7) + (kps * 69) + (COALESCE(json_array_length(profiles::json), 0) * 420)) WHERE score > 0`);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_smash_score ON scores (smash_score DESC)`);
        console.log("PostgreSQL Connected");

        await redisClient.connect();
        console.log("Redis Connected");

        const topScores = await pool.query(`SELECT name, smash_score FROM scores ORDER BY smash_score DESC LIMIT 10`);

        for (const row of topScores.rows) {
            await redisClient.zAdd('leaderboard_classic', { score: row.smash_score, value: row.name });
        }
        console.log("Redis Cache Warmed Up");

    } catch (err) {
        console.error("Init Error:", err);
    }
};

initDB();

class ScoreModel {

    static async getRank(smashScore, mode = 'classic') {
        try {
            const higherRankCount = await redisClient.zCount(`leaderboard_${mode}`, `(${smashScore}`, '+inf');
            return higherRankCount + 1;
        } catch (err) {
            console.error("Error fetching rank from Redis:", err);

            try {
                const result = await pool.query(
                    `SELECT COUNT(*) FROM scores WHERE mode = $1 AND smash_score > $2`,
                    [mode, smashScore]
                );
                return parseInt(result.rows[0].count, 10) + 1;
            } catch (pgErr) {
                console.error("Error fetching rank from Postgres Fallback:", pgErr.message);
                return null;
            }
        }
    }

    static async getPaginatedLeaderboard(mode = 'classic', page = 1, limit = 10, search = '') {
        try {
            const offset = (page - 1) * limit;

            let query = `
                WITH RankedScores AS (
                    SELECT name, score, mode, kps, entropy, smash_score, profiles, created_at,
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

    static async save(name, score, mode = 'classic', kps = 0.0, entropy = 0.0, profiles = []) {
        try {
            let profileCount = 0;
            try { profileCount = Array.isArray(profiles) ? profiles.length : JSON.parse(profiles).length; } catch (e) { }
            const smashScore = Math.round((score * 1337) + (entropy * entropy * 1.7) + (kps * 69) + (profileCount * 420));
            const profilesJson = JSON.stringify(profiles);

            const checkSql = `SELECT id, score, smash_score FROM scores WHERE name = $1 AND mode = $2 LIMIT 1`;
            const { rows } = await pool.query(checkSql, [name, mode]);

            if (rows.length > 0) {
                const existingId = rows[0].id;
                const existingSmashScore = rows[0].smash_score || 0;

                if (smashScore > existingSmashScore) {
                    const updateSql = `UPDATE scores SET score = $1, kps = $2, entropy = $3, smash_score = $4, profiles = $5, created_at = CURRENT_TIMESTAMP WHERE id = $6`;
                    await pool.query(updateSql, [score, kps, entropy, smashScore, profilesJson, existingId]);
                    console.log(`[DB] Updated high score for ${name} (${mode}): ${existingSmashScore} -> ${smashScore}`);
                }
            } else {
                const insertSql = `INSERT INTO scores (name, score, mode, kps, entropy, smash_score, profiles) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
                await pool.query(insertSql, [name, score, mode, kps, entropy, smashScore, profilesJson]);
                console.log(`[DB] Inserted new score for ${name} (${mode}): ${smashScore} (Keys:${score} KPS:${kps} ENV:${entropy})`);
            }

            await redisClient.zAdd(`leaderboard_${mode}`, { score: smashScore, value: name }, { GT: true });

        } catch (err) {
            console.error("Error saving score:", err);
        }
    }
}

module.exports = ScoreModel;