/**
 * insert_completionist.js — Insert a dummy user who has collected ALL 94 profiles
 * Extracts real flavor text from ProfileEngine source code
 */
require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const pool = new Pool(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
} : {});

// Extract real profile titles + flavors from ProfileEngine source
function extractProfiles() {
    const src = fs.readFileSync(path.join(__dirname, '../utils/ProfileEngine.js'), 'utf8');
    const profiles = [];
    const seen = new Set();

    // Match both exclusive (return { profiles: [{ title: "...", flavor: "..." }] })
    // and accumulative (add("...", "...")) patterns
    const patterns = [
        /title:\s*"([^"]+)",\s*flavor:\s*"([^"]+)"/g,
        /add\("([^"]+)",\s*"([^"]+)"\)/g,
    ];

    for (const re of patterns) {
        let m;
        while ((m = re.exec(src)) !== null) {
            const title = m[1];
            const flavor = m[2];
            if (!seen.has(title)) {
                seen.add(title);
                profiles.push({ title, flavor });
            }
        }
    }

    return profiles;
}

async function run() {
    const allProfiles = extractProfiles();
    console.log(`Extracted ${allProfiles.length} unique profiles from ProfileEngine.js`);

    const name = 'THE_COLLECTOR';
    const mode = 'classic';
    const score = 999;
    const kps = 199.8;
    const entropy = 98.5;
    const profileCount = allProfiles.length;
    const smashScore = Math.round((score * 1337) + (entropy * entropy * 1.7) + (kps * 69) + (profileCount * 420));
    const profilesJson = JSON.stringify(allProfiles);

    console.log(`Inserting ${name} with ${profileCount} profiles...`);
    console.log(`Smash Score: ${smashScore.toLocaleString()}`);
    console.log('\nFirst 5 profiles:');
    allProfiles.slice(0, 5).forEach(p => console.log(`  - ${p.title}: "${p.flavor.substring(0, 60)}..."`));

    try {
        await pool.query('DELETE FROM scores WHERE name = $1 AND mode = $2', [name, mode]);

        const insertSql = `INSERT INTO scores (name, score, mode, kps, entropy, smash_score, profiles) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        await pool.query(insertSql, [name, score, mode, kps, entropy, smashScore, profilesJson]);
        console.log(`\n[DB] Inserted ${name} with ALL ${profileCount} profiles!`);

        // Also update Redis leaderboard
        let redisUrl = process.env.REDIS_URL;
        let redisConfig = { pingInterval: 120000 };
        if (redisUrl) {
            if (redisUrl.startsWith('redis://') && redisUrl.includes('upstash')) {
                redisUrl = redisUrl.replace('redis://', 'rediss://');
            }
            redisConfig.url = redisUrl;
        }
        const redisClient = createClient(redisConfig);
        await redisClient.connect();
        await redisClient.zAdd(`leaderboard_${mode}`, { score: smashScore, value: name }, { GT: true });
        console.log(`[Redis] Added ${name} to leaderboard_${mode} with score ${smashScore}`);
        await redisClient.quit();
    } catch (err) {
        console.error('Error:', err);
    }

    await pool.end();
    console.log('Done!');
}

run();
