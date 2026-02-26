require('dotenv').config();
const { pool } = require('./models/db');
async function run() {
    const q = `
        WITH BestScores AS (
            SELECT name, score, mode, kps, entropy, smash_score, profiles, created_at,
                   CASE WHEN profiles::text LIKE '%Suspected Cheater%' THEN true ELSE false END as is_flagged,
                   ROW_NUMBER() OVER(
                       PARTITION BY name
                       ORDER BY 
                           CASE WHEN profiles::text LIKE '%Suspected Cheater%' THEN 1 ELSE 0 END ASC,
                           smash_score DESC, created_at DESC
                   ) as user_rank
            FROM scores
            WHERE mode = 'classic'
        ),
        RankedScores AS (
            SELECT *,
                   ROW_NUMBER() OVER(
                       ORDER BY 
                           is_flagged ASC,
                           smash_score DESC, created_at DESC
                   ) as global_rank
            FROM BestScores
            WHERE user_rank = 1
        )
        SELECT * FROM RankedScores LIMIT 10 OFFSET 0
    `;
    const res = await pool.query(q);
    console.log('Postgres results:', res.rows.length);
    pool.end();
}
run();
