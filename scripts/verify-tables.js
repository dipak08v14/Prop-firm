require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name, count(column_name) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name;
    `);
    
    console.log('Tables in public schema:');
    res.rows.forEach(row => {
      console.log(`- ${row.table_name}: ${row.column_count} columns`);
    });
  } catch (err) {
    console.error('Failed to list tables:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
