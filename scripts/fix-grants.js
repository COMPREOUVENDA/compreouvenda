const { Client } = require('pg');

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '122459pa01#01',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected.\n');

  // 1. Grant anon/authenticated SELECT on public tables
  const grantSql = [
    'GRANT USAGE ON SCHEMA public TO anon, authenticated;',
    'GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;',
    'GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;',
    'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;',
  ];

  for (const sql of grantSql) {
    await client.query(sql);
    console.log('OK:', sql.substring(0, 60));
  }

  // 2. Disable email confirmation requirement
  // Confirm the test user's email manually
  await client.query(`
    UPDATE auth.users SET 
      email_confirmed_at = NOW(),
      confirmed_at = NOW()
    WHERE email_confirmed_at IS NULL;
  `);
  console.log('\nAll unconfirmed emails now confirmed.');

  // 3. Disable email confirmation for new signups
  // This is done via Supabase dashboard (Auth > Settings > Disable email confirmations)
  // But we can also update the auth config
  console.log('\nNOTE: To disable email confirmation for future signups,');
  console.log('go to Supabase Dashboard > Authentication > Providers > Email > disable "Confirm email"');

  // Verify
  const { rows: cats } = await client.query('SELECT id, name FROM categories LIMIT 3');
  console.log('\nCategories accessible:', cats.map(c => c.name).join(', '));

  const { rows: users } = await client.query('SELECT email, email_confirmed_at FROM auth.users');
  console.log('Users confirmed:', users.map(u => u.email + ' -> ' + (u.email_confirmed_at ? 'YES' : 'NO')).join(', '));

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
