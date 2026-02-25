const { pool, redisClient } = require('./db');
const { calculateSmashScore } = require('../utils/scoring');

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
                           CASE WHEN profiles::text LIKE '%Suspected Cheater%' THEN true ELSE false END as is_flagged,
                           ROW_NUMBER() OVER(
                               ORDER BY
                                   CASE WHEN profiles::text LIKE '%Suspected Cheater%' THEN 1 ELSE 0 END ASC,
                                   smash_score DESC, created_at DESC
                           ) as global_rank
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

    static async save(name, score, mode = 'classic', kps = 0.0, entropy = 0.0, profiles = [], forceSmashScore = null) {
        try {
            const checkSql = `SELECT id, score, kps, entropy, smash_score, profiles FROM scores WHERE name = $1 AND mode = $2 LIMIT 1`;
            const { rows } = await pool.query(checkSql, [name, mode]);

            let mergedProfiles = profiles;
            let existingId = null;
            let existingSmashScore = 0;
            let existingProfileCount = 0;

            if (rows.length > 0) {
                existingId = rows[0].id;
                existingSmashScore = rows[0].smash_score || 0;

                // Parse existing profiles safely
                let existingProfiles = [];
                try {
                    existingProfiles = typeof rows[0].profiles === 'string'
                        ? JSON.parse(rows[0].profiles)
                        : (rows[0].profiles || []);
                } catch (e) { }
                if (!Array.isArray(existingProfiles)) existingProfiles = [];
                existingProfileCount = existingProfiles.length;

                // Merge profiles — only profiles accumulate, not stats
                const profileMap = new Map();
                existingProfiles.forEach(p => profileMap.set(p.title, p));
                profiles.forEach(p => profileMap.set(p.title, p));
                mergedProfiles = Array.from(profileMap.values());
            }

            // Smash score uses THIS RUN's score/kps/entropy + cumulative profile count
            const profileCount = mergedProfiles.length;
            const newSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(score, entropy, kps, profileCount);
            const profilesJson = JSON.stringify(mergedProfiles);

            if (rows.length > 0) {
                const hasNewProfiles = profileCount > existingProfileCount;
                const hasHigherScore = newSmashScore > existingSmashScore;

                if (hasHigherScore) {
                    // New personal best — update everything (stats + profiles)
                    const updateSql = `UPDATE scores SET score = $1, kps = $2, entropy = $3, smash_score = $4, profiles = $5, created_at = CURRENT_TIMESTAMP WHERE id = $6`;
                    await pool.query(updateSql, [score, kps, entropy, newSmashScore, profilesJson, existingId]);
                    console.log(`[DB] New high score for ${name} (${mode}): ${existingSmashScore} -> ${newSmashScore} (Profiles: ${profileCount})`);
                } else if (hasNewProfiles) {
                    // Lower score run, but found new profiles — recalculate smash score using OLD stats + NEW profile count
                    const existingScore = rows[0].score;
                    const existingKps = rows[0].kps;
                    const existingEntropy = rows[0].entropy;
                    const boostedSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(existingScore, existingEntropy, existingKps, profileCount);
                    const updateSql = `UPDATE scores SET smash_score = $1, profiles = $2 WHERE id = $3`;
                    await pool.query(updateSql, [boostedSmashScore, profilesJson, existingId]);
                    await redisClient.zAdd(`leaderboard_${mode}`, { score: boostedSmashScore, value: name }, { GT: true });
                    console.log(`[DB] New profiles for ${name} (${mode}): ${existingProfileCount} -> ${profileCount} profiles, score boosted: ${existingSmashScore} -> ${boostedSmashScore}`);
                } else {
                    console.log(`[DB] No update for ${name} (${mode}): score ${newSmashScore} <= ${existingSmashScore}, no new profiles`);
                }
            } else {
                const insertSql = `INSERT INTO scores (name, score, mode, kps, entropy, smash_score, profiles) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
                await pool.query(insertSql, [name, score, mode, kps, entropy, newSmashScore, profilesJson]);
                console.log(`[DB] Inserted new score for ${name} (${mode}): ${newSmashScore} (Profiles: ${profileCount})`);
            }

            // Always increment global total smashes regardless of personal best (self-healing upsert)
            const statsRes = await pool.query(
                `INSERT INTO global_stats (id, total_smashes) VALUES (1, $1)
                 ON CONFLICT (id) DO UPDATE SET total_smashes = global_stats.total_smashes + $1
                 RETURNING total_smashes`, [score]
            );
            const totalSmashes = statsRes.rows.length > 0 ? parseInt(statsRes.rows[0].total_smashes, 10) : 0;

            await redisClient.zAdd(`leaderboard_${mode}`, { score: newSmashScore, value: name }, { GT: true });

            return {
                smashScore: newSmashScore,
                mergedProfiles,
                totalSmashes
            };
        } catch (err) {
            console.error("Error saving score:", err);
            return null;
        }
    }

    static async getGlobalSmashCount() {
        try {
            const res = await pool.query(`SELECT total_smashes FROM global_stats LIMIT 1`);
            return res.rows.length > 0 ? parseInt(res.rows[0].total_smashes, 10) : 0;
        } catch (err) {
            console.error("Error fetching global stats:", err);
            return 0;
        }
    }
}

module.exports = ScoreModel;