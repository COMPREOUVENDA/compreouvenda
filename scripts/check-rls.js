const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
    port: 5432,
    user: 'postgres',
    password: '122459pa01#01',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await c.connect();

  // Check RLS policies on users table
  const r1 = await c.query("SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'users'");
  console.log('RLS POLICIES on users:');
  console.table(r1.rows);

  // Check if RLS is enabled
  const r2 = await c.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users'");
  console.log('RLS enabled:');
  console.table(r2.rows);

  // Test: can anon key read the user?
  const r3 = await c.query("SELECT id, email, role FROM users WHERE id = '4ed2a5be-a68c-4789-bf71-ae04c7ac6abf'");
  console.log('Direct query result:');
  console.table(r3.rows);

  await c.end();
}

main().catch(console.error);
