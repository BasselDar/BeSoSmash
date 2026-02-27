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
                                    CASE WHEN profiles::text LIKE '%"isCheater":true%' THEN 1 ELSE 0 END ASC,
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
                      AND profiles::text NOT LIKE '%"isCheater":true%'
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
                                   CASE WHEN profiles::text LIKE '%"isCheater":true%' THEN true ELSE false END as is_flagged
                            FROM scores
                            WHERE mode = $1 AND name = ANY($2)
                            ORDER BY smash_score ASC
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
                WITH BestScores AS (
                    SELECT name, score, mode, kps, entropy, smash_score, profiles, created_at,
                           CASE WHEN profiles::text LIKE '%"isCheater":true%' THEN true ELSE false END as is_flagged,
                           ROW_NUMBER() OVER(
                               PARTITION BY name
                               ORDER BY 
                                   CASE WHEN profiles::text LIKE '%"isCheater":true%' THEN 1 ELSE 0 END ASC,
                                   smash_score DESC, created_at DESC
                           ) as user_rank
                    FROM scores
                    WHERE mode = $1
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

            let countQuery = `SELECT COUNT(DISTINCT name) FROM scores WHERE mode = $1`;
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

    static _isCheater(profile) {
        const cheaterTitles = ["The Script Kiddie", "The Hardware Spoof", "The Overloader", "Suspected Cheater"];
        return profile.isCheater || cheaterTitles.includes(profile.title);
    }

    static _parseProfiles(profileData) {
        try {
            const parsed = typeof profileData === 'string' ? JSON.parse(profileData) : (profileData || []);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }

    static _mergeProfiles(oldProfiles, newProfiles) {
        const profileMap = new Map();
        oldProfiles.forEach(p => profileMap.set(p.title, p));
        newProfiles.forEach(p => profileMap.set(p.title, p));
        return Array.from(profileMap.values());
    }

    static async _updateGlobalStats(scoreIncrement) {
        const statsRes = await pool.query(
            `INSERT INTO global_stats (id, total_smashes) VALUES (1, $1)
             ON CONFLICT (id) DO UPDATE SET total_smashes = global_stats.total_smashes + $1
             RETURNING total_smashes`, [scoreIncrement]
        );
        const total = statsRes.rows.length > 0 ? parseInt(statsRes.rows[0].total_smashes, 10) : 0;
        try { await redisClient.set('global_smash_count', total.toString()); } catch (e) { }
        return total;
    }

    static async save(name, score, mode = 'classic', kps = 0.0, entropy = 0.0, profiles = [], forceSmashScore = null) {
        try {
            const checkSql = `SELECT id, score, kps, entropy, smash_score, profiles FROM scores WHERE name = $1 AND mode = $2 LIMIT 1`;
            const { rows } = await pool.query(checkSql, [name, mode]);

            const runIsFlagged = profiles.some(p => this._isCheater(p));
            let mergedProfiles = profiles;
            let highestSmashScore = 0;
            let isPersonalBest = true;
            let existingProfileTitles = [];
            let alreadyFlagged = false;

            if (rows.length > 0) {
                const existingData = rows[0];
                const existingId = existingData.id;
                const existingSmashScore = parseInt(existingData.smash_score, 10) || 0;

                let existingProfiles = this._parseProfiles(existingData.profiles);
                existingProfileTitles = existingProfiles.map(p => p.title);
                alreadyFlagged = existingProfiles.some(p => this._isCheater(p));

                if (runIsFlagged && !alreadyFlagged) {
                    // Prevent framing: An unflagged user's score shouldn't be overwritten by a hacked run
                    return { smashScore: existingSmashScore, mergedProfiles: existingProfiles, totalSmashes: 0, isPersonalBest: false, highestSmashScore: existingSmashScore, existingProfileTitles };
                }

                const isResetting = (!runIsFlagged && alreadyFlagged);

                if (isResetting) {
                    existingProfiles = existingProfiles.filter(p => !this._isCheater(p));
                }

                mergedProfiles = this._mergeProfiles(existingProfiles, profiles);
                const profileCount = mergedProfiles.length;
                const newSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(score, entropy, kps, profileCount);
                const profilesJson = JSON.stringify(mergedProfiles);

                const hasNewProfiles = profileCount > existingProfiles.length;
                const hasHigherScore = newSmashScore > existingSmashScore;

                if (hasHigherScore || isResetting) {
                    highestSmashScore = isResetting ? newSmashScore : newSmashScore;
                    const updateSql = `UPDATE scores SET score = $1, kps = $2, entropy = $3, smash_score = $4, profiles = $5, created_at = CURRENT_TIMESTAMP WHERE id = $6`;
                    await pool.query(updateSql, [score, kps, entropy, newSmashScore, profilesJson, existingId]);
                } else if (hasNewProfiles) {
                    isPersonalBest = false;
                    const boostedSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(existingData.score, existingData.entropy, existingData.kps, profileCount);
                    highestSmashScore = Math.max(existingSmashScore, boostedSmashScore);
                    const updateSql = `UPDATE scores SET smash_score = $1, profiles = $2 WHERE id = $3`;
                    await pool.query(updateSql, [boostedSmashScore, profilesJson, existingId]);
                    if (boostedSmashScore > existingSmashScore) {
                        await redisClient.zAdd(`leaderboard_${mode}`, { score: boostedSmashScore, value: name }, { GT: true });
                    }
                } else {
                    isPersonalBest = false;
                    highestSmashScore = existingSmashScore;
                }
            } else {
                mergedProfiles = profiles;
                const newSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(score, entropy, kps, profiles.length);
                highestSmashScore = newSmashScore;
                const profilesJson = JSON.stringify(mergedProfiles);
                const insertSql = `INSERT INTO scores (name, score, mode, kps, entropy, smash_score, profiles) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
                await pool.query(insertSql, [name, score, mode, kps, entropy, newSmashScore, profilesJson]);
            }

            const totalSmashes = await this._updateGlobalStats(score);
            const isFlagged = mergedProfiles.some(p => this._isCheater(p));
            const redisScore = isFlagged ? -(highestSmashScore > 0 ? highestSmashScore : 1) : highestSmashScore;

            try {
                if (isFlagged || (!runIsFlagged && alreadyFlagged)) {
                    await redisClient.zAdd(`leaderboard_${mode}`, { score: redisScore, value: name });
                } else {
                    await redisClient.zAdd(`leaderboard_${mode}`, { score: redisScore, value: name }, { GT: true });
                }
            } catch (e) { console.error("Error saving rank to redis:", e); }

            const finalSmashScore = forceSmashScore !== null ? forceSmashScore : calculateSmashScore(score, entropy, kps, mergedProfiles.length);

            return {
                smashScore: finalSmashScore,
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