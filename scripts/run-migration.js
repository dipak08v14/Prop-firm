require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a migration file path.');
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    console.log(`Connected to database. Running ${filePath}...`);
    await client.query(sql);
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
