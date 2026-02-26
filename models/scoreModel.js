const { pool, redisClient } = require('./db');
const { calculateSmashScore } = require('../utils/scoring');

class ScoreModel {

    static async getRank(smashScore, mode = 'classic', name = null) {
        try {
            if (name) {
                // Instantly fetch exact rank from Redis (0-indexed, so add 1)
                const redisRank = await redisClient.zRevRank(`leaderboard_${mode}`, name);
                if (redisRank !== null) {
                    return redisRank + 1;
                }
            }

            // If name isn't in Redis (or wasn't provided for transient non-PB runs),
            // calculate where the score *would* land by asking Redis how many scores are strictly higher
            const higherRankedCount = await redisClient.zCount(`leaderboard_${mode}`, `(${smashScore}`, '+inf');
            return higherRankedCount + 1;

        } catch (err) {
            console.error("Error fetching rank from Redis:", err.message);

            // --- Fallback to Postgres if Redis is down ---
            if (name) {
                try {
                    const query = `
                        WITH RankedScores AS (
                            SELECT name, ROW_NUMBER() OVER(
                                ORDER BY
                                    CASE WHEN profiles::text LIKE '%Suspected Cheater%' THEN 1 ELSE 0 END ASC,
                                    smash_score DESC, created_at DESC
                            ) as global_rank
                            FROM scores
                            WHERE mode = $1
                        )
                        SELECT global_rank FROM RankedScores WHERE name = $2 LIMIT 1
                    `;
                    const result = await pool.query(query, [mode, name]);
                    if (result.rows.length > 0) return parseInt(result.rows[0].global_rank, 10);
                } catch (dbErr) {
                    console.error("Fallback error fetching exact postgres rank:", dbErr.message);
                }
            }

            try {
                const query = `
                    SELECT COUNT(*) as higher_ranked 
                    FROM scores 
                    WHERE mode = $1 
                      AND smash_score > $2 
                      AND profiles::text NOT LIKE '%Suspected Cheater%'
                `;
                const result = await pool.query(query, [mode, smashScore]);
                return parseInt(result.rows[0].higher_ranked, 10) + 1;
            } catch (dbErr) {
                console.error("Fallback error fetching transient rank from Postgres:", dbErr.message);
                return null;
            }
        }
    }

    static async getPaginatedLeaderboard(mode = 'classic', page = 1, limit = 10, search = '') {
        try {
            const offset = (page - 1) * limit;
            const end = offset + limit - 1;

            // If no search term, try to fetch standard pagination instantly from Redis
            if (!search) {
                try {
                    // Fetch top N usernames from Redis sorted set
                    const topNames = await redisClient.zRange(`leaderboard_${mode}`, offset, end, { REV: true });

                    if (topNames && topNames.length > 0) {
                        // Fetch their detailed stats from Postgres
                        const query = `
                            SELECT name, score, mode, kps, entropy, smash_score, profiles, created_at,
                                   CASE WHEN profiles::text LIKE '%Suspected Cheater%' THEN true ELSE false END as is_flagged
                            FROM scores
                            WHERE mode = $1 AND name = ANY($2)
                        `;
                        const result = await pool.query(query, [mode, topNames]);

                        // Postgres IN/ANY doesn't maintain array order, so sort in memory to match Redis exact rank
                        const rowMap = new Map();
                        result.rows.forEach(row => rowMap.set(row.name, row));

                        const orderedData = topNames.map((name, idx) => {
                            const row = rowMap.get(name);
                            if (row) {
                                row.global_rank = offset + idx + 1;
                                return row;
                            }
                            return null;
                        }).filter(Boolean);

                        const totalCount = await redisClient.zCard(`leaderboard_${mode}`);
                        const totalPages = Math.ceil(totalCount / limit);

                        return {
                            data: orderedData,
                            pagination: {
                                page: parseInt(page, 10),
                                limit: parseInt(limit, 10),
                                totalCount,
                                totalPages,
                                hasMore: page < totalPages
                            }
                        };
                    }
                } catch (redisErr) {
                    console.error("Error fetching leaderboard from Redis, falling back to Postgres:", redisErr);
                }
            }

            // --- Fallback to heavy Postgres query if Redis fails or user is searching ---
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
            let existingProfileTitles = [];

            if (rows.length > 0) {
                existingId = rows[0].id;
                existingSmashScore = parseInt(rows[0].smash_score, 10) || 0;

                // Parse existing profiles safely
                let existingProfiles = [];
                try {
                    existingProfiles = typeof rows[0].profiles === 'string'
                        ? JSON.parse(rows[0].profiles)
                        : (rows[0].profiles || []);
                } catch (e) { }
                if (!Array.isArray(existingProfiles)) existingProfiles = [];
                existingProfileCount = existingProfiles.length;
                existingProfileTitles = existingProfiles.map(p => p.title);

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

            let isPersonalBest = false;
            let highestSmashScore = newSmashScore;

            if (rows.length > 0) {
                const hasNewProfiles = profileCount > existingProfileCount;
                const hasHigherScore = newSmashScore > existingSmashScore;

                if (hasHigherScore) {
                    isPersonalBest = true;
                    // New personal best — update everything (stats + profiles)
                    const updateSql = `UPDATE scores SET score = $1, kps = $2, entropy = $3, smash_score = $4, profiles = $5, created_at = CURRENT_TIMESTAMP WHERE id = $6`;
                    await pool.query(updateSql, [score, kps, entropy, newSmashScore, profilesJson, existingId]);
                } else if (hasNewProfiles) {
                    highestSmashScore = existingSmashScore; // They didn't beat their score
                    // Lower score run, but found new profiles — recalculate smash score using OLD stats + NEW profile count
                    const existingScore = rows[0].score;
                    const existingKps = rows[0].kps;
                    const existingEntropy = rows[0].entropy;
                    const boostedSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(existingScore, existingEntropy, existingKps, profileCount);

                    if (boostedSmashScore > existingSmashScore) {
                        highestSmashScore = boostedSmashScore;
                    }

                    const updateSql = `UPDATE scores SET smash_score = $1, profiles = $2 WHERE id = $3`;
                    await pool.query(updateSql, [boostedSmashScore, profilesJson, existingId]);
                    await redisClient.zAdd(`leaderboard_${mode}`, { score: boostedSmashScore, value: name }, { GT: true });
                } else {
                    highestSmashScore = existingSmashScore;
                    // No high score and no new profiles, do nothing
                }
            } else {
                isPersonalBest = true;
                const insertSql = `INSERT INTO scores (name, score, mode, kps, entropy, smash_score, profiles) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
                await pool.query(insertSql, [name, score, mode, kps, entropy, newSmashScore, profilesJson]);
            }

            // Always increment global total smashes regardless of personal best (self-healing upsert)
            const statsRes = await pool.query(
                `INSERT INTO global_stats (id, total_smashes) VALUES (1, $1)
                 ON CONFLICT (id) DO UPDATE SET total_smashes = global_stats.total_smashes + $1
                 RETURNING total_smashes`, [score]
            );
            const totalSmashes = statsRes.rows.length > 0 ? parseInt(statsRes.rows[0].total_smashes, 10) : 0;

            // Cache total smashes in Redis for instant homepage loads
            try {
                await redisClient.set('global_smash_count', totalSmashes.toString());
            } catch (e) { console.error("Error saving global count to redis:", e); }

            // Apply negative score penalty to cheaters so they naturally sink to the bottom of the Redis ZSET
            try {
                const isFlagged = mergedProfiles.some(p => p.title === 'Suspected Cheater');
                const redisScore = isFlagged ? -highestSmashScore : highestSmashScore;
                await redisClient.zAdd(`leaderboard_${mode}`, { score: redisScore, value: name }, { GT: true });
            } catch (e) { console.error("Error saving rank to redis:", e); }

            return {
                smashScore: newSmashScore,
                mergedProfiles,
                totalSmashes,
                isPersonalBest,
                highestSmashScore,
                existingProfileTitles
            };
        } catch (err) {
            console.error("Error saving score:", err);
            return null;
        }
    }

    static async getGlobalSmashCount() {
        try {
            // First try instant fetch from Redis
            const cached = await redisClient.get('global_smash_count');
            if (cached) return parseInt(cached, 10);

            // Fallback to Postgres
            const res = await pool.query(`SELECT total_smashes FROM global_stats LIMIT 1`);
            const total = res.rows.length > 0 ? parseInt(res.rows[0].total_smashes, 10) : 0;

            // Try pushing it into the cache for next time
            try { await redisClient.set('global_smash_count', total.toString()); } catch (e) { }

            return total;
        } catch (err) {
            console.error("Error fetching global stats:", err);
            return 0;
        }
    }
}

module.exports = ScoreModel;