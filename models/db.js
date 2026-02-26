// models/db.js — Database & Redis connection initialization
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

        // Track global stats (like total popcat count)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS global_stats (
                id SERIAL PRIMARY KEY,
                total_smashes BIGINT DEFAULT 0
            )
        `);
        // Ensure at least one row exists
        const statsObj = await pool.query('SELECT COUNT(*) FROM global_stats');
        if (parseInt(statsObj.rows[0].count, 10) === 0) {
            // Seed it with the sum of all current highest scores as a baseline
            await pool.query(`INSERT INTO global_stats (total_smashes) SELECT COALESCE(SUM(score), 0) FROM scores`);
        }

        console.log("PostgreSQL Connected");

        await redisClient.connect();
        console.log("Redis Connected");

        const allScores = await pool.query(`SELECT name, mode, smash_score, profiles FROM scores`);

        for (const row of allScores.rows) {
            let profs = [];
            try { profs = typeof row.profiles === 'string' ? JSON.parse(row.profiles) : (row.profiles || []); } catch (e) { }

            const isFlagged = profs.some(p => p.title === 'Suspected Cheater');
            const redisScore = isFlagged ? -parseInt(row.smash_score, 10) : parseInt(row.smash_score, 10);
            const mode = row.mode || 'classic';

            await redisClient.zAdd(`leaderboard_${mode}`, { score: redisScore, value: row.name });
        }
        console.log(`Redis Cache Automatically Resynced with ${allScores.rows.length} records.`);

    } catch (err) {
        console.error("Init Error:", err);
    }
};

initDB();

module.exports = { pool, redisClient };
