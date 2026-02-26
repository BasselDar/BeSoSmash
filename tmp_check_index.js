require('dotenv').config();
const { pool } = require('./models/db');
async function check() {
    const result = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'scores';
  `);
    console.log(result.rows);
    process.exit(0);
}
check();
