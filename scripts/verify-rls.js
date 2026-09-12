require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    
    // Check if RLS is enabled on each table
    const tablesRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    // Get policies
    const policiesRes = await client.query(`
      SELECT tablename, policyname, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    console.log('RLS and Policy Report:');
    
    const tables = tablesRes.rows;
    const policies = policiesRes.rows;

    tables.forEach(t => {
      console.log(`\nTable: ${t.tablename}`);
      console.log(`RLS Enabled: ${t.rowsecurity ? 'Yes' : 'No'}`);
      
      const tPolicies = policies.filter(p => p.tablename === t.tablename);
      if (tPolicies.length > 0) {
        console.log('Policies:');
        tPolicies.forEach(p => {
          console.log(`  - [${p.cmd}] ${p.policyname}`);
        });
      } else {
        console.log('Policies: None');
      }
    });

  } catch (err) {
    console.error('Failed to verify RLS:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
