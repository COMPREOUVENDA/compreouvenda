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
  console.log('Connected.');

  // Fix: update users table ID to match auth.users ID
  const authId = '4ed2a5be-a68c-4789-bf71-ae04c7ac6abf';
  const email = 'teste@compreouvenda.com';

  await c.query('UPDATE users SET id = $1 WHERE email = $2', [authId, email]);
  
  const r = await c.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
  console.log('Fixed admin user:');
  console.table(r.rows);

  await c.end();
  console.log('Done.');
}

main().catch(console.error);
