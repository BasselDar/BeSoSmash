const { pool } = require('../models/db.js');

async function fixProfilesData() {
    try {
        console.log("Fetching all scores to clean up profile data...");
        // Get all rows
        const result = await pool.query('SELECT id, profiles FROM scores WHERE profiles IS NOT NULL AND profiles != \'[]\'');

        let updatedCount = 0;
        console.log(`Found ${result.rows.length} rows with profiles to process.`);

        for (const row of result.rows) {
            try {
                // Determine if it actually has flavor
                if (row.profiles.includes('"flavor":')) {
                    const profilesArr = typeof row.profiles === 'string' ? JSON.parse(row.profiles) : row.profiles;

                    // Strip the flavor property
                    const cleanedProfiles = profilesArr.map(p => {
                        return { title: p.title };
                    });

                    // Update the database with the cleaned profiles
                    await pool.query('UPDATE scores SET profiles = $1 WHERE id = $2', [JSON.stringify(cleanedProfiles), row.id]);
                    updatedCount++;
                }
            } catch (err) {
                console.error(`Error processing row ID ${row.id}:`, err);
            }
        }

        console.log(`\nSuccess! Cleaned up the 'flavor' text from ${updatedCount} records.`);
        console.log("Your data has been optimized without losing any profile titles!");
    } catch (err) {
        console.error("Database error:", err);
    } finally {
        process.exit(0);
    }
}

fixProfilesData();
