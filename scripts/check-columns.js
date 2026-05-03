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

  // Check all columns of users table
  const r1 = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' ORDER BY ordinal_position");
  console.log('USERS TABLE COLUMNS:');
  console.table(r1.rows);

  // Check full row for teste user
  const r2 = await c.query("SELECT * FROM users WHERE email = 'teste@compreouvenda.com'");
  console.log('FULL ROW:');
  console.log(JSON.stringify(r2.rows[0], null, 2));

  await c.end();
}

main().catch(console.error);
