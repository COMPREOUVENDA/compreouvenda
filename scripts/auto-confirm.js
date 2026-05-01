const { Client } = require('pg');
const client = new Client({ host:'db.auxaajrjwbdsnxtvgmsb.supabase.co', port:5432, database:'postgres', user:'postgres', password:'122459pa01#01', ssl:{rejectUnauthorized:false} });
async function run() {
  await client.connect();
  
  // Auto-confirm all emails on signup via a trigger
  await client.query(`
    CREATE OR REPLACE FUNCTION public.auto_confirm_email()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.email_confirmed_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  
  await client.query(`
    DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
    CREATE TRIGGER auto_confirm_email_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_email();
  `);
  
  // Confirm existing unconfirmed users
  await client.query("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL");
  
  console.log('Auto-confirm trigger created. All users confirmed.');
  await client.end();
}
run().catch(e => console.error(e.message));
