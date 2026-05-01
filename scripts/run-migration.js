const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '122459pa01#01',
  ssl: { rejectUnauthorized: false },
});

const fullSql = fs.readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
const sql = fullSql.replace('CREATE EXTENSION IF NOT EXISTS "postgis";', '-- postgis skipped');

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  
  try {
    await client.connect();
    console.log('Connected! Running migration...\n');
    
    await client.query(sql);
    console.log('Migration executed successfully!');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nTables created:');
    result.rows.forEach(r => console.log('  +', r.table_name));
    console.log('\nTotal:', result.rows.length, 'tables');
    
  } catch(e) {
    console.error('Error:', e.message);
    
    if (e.message.includes('already exists')) {
      console.log('\nSome tables already exist, checking...');
      try {
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        console.log('Existing tables:', result.rows.map(r => r.table_name).join(', '));
      } catch(e2) { console.error(e2.message); }
    }
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

run();
