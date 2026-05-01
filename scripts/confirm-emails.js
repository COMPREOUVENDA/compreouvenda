const { Client } = require('pg');
const client = new Client({ host:'db.auxaajrjwbdsnxtvgmsb.supabase.co', port:5432, database:'postgres', user:'postgres', password:'122459pa01#01', ssl:{rejectUnauthorized:false} });
async function run() {
  await client.connect();
  await client.query("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL");
  console.log('Emails confirmed');
  
  // Test categories read with anon
  const { rows } = await client.query("SELECT id, name FROM categories LIMIT 3");
  console.log('Categories:', rows.map(r => r.name).join(', '));
  await client.end();
}
run().catch(e => console.error(e.message));
