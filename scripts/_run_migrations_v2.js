/**
 * Migration runner using Supabase Management API (REST)
 * Uses service_role JWT to run raw SQL via the pg endpoint
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'auxaajrjwbdsnxtvgmsb';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MjEzMywiZXhwIjoyMDkyODE4MTMzfQ.CX_0c-PgeTKZ9V6fVALULIA_KDidTec3TeEeiOf_jJY';

// Uses Supabase's internal pg endpoint for service_role
// POST https://<ref>.supabase.co/rest/v1/rpc/<func> -- not available for raw SQL
// We use the pg REST endpoint exposed by PostgREST + special header, OR
// use the Supabase Management API (api.supabase.com)

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Supabase Management API requires a personal access token (PAT), not service_role key.
// Alternative: use the pg_dump endpoint or the "execute SQL" management API.
// Best approach with service_role: use PostgREST's /rpc endpoint with a stored procedure,
// OR use the Supabase REST API to insert into a special execution path.
//
// Actually, Supabase does expose: POST /pg -- but only via MFA auth.
// The cleanest approach with just service_role: call the internal pg REST via the
// Authorization: Bearer <service_role> header to a Supabase Edge Function or
// use fetch to hit https://<ref>.supabase.co/rest/v1/ with Content-Profile: public
//
// But the MOST RELIABLE approach: use the Supabase Management API v1 POST
// https://api.supabase.com/v1/projects/{ref}/database/query
// which requires a PERSONAL ACCESS TOKEN from the dashboard.
//
// Since we only have service_role, let's try: POST to REST with raw SQL via pg_net wrapper.
// OR: try the undocumented internal endpoint that pgAdmin-style tools use.

// Let's use the Supabase REST + service_role to call a function that does SQL exec.
// First: check if exec_sql RPC exists.

async function callRPC(functionName, params) {
  const body = JSON.stringify(params);
  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    path: `/rest/v1/rpc/${functionName}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Length': Buffer.byteLength(body),
    },
  };
  return httpsRequest(options, body);
}

async function checkTables() {
  // Use PostgREST to query information_schema
  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    path: `/rest/v1/information_schema_tables?select=table_name&table_name=in.(audit_logs,geo_consents,user_consents)`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Accept': 'application/json',
    },
  };
  return httpsRequest(options, null);
}

const SQL_002_USER_CONSENTS = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '002_user_consents.sql'),
  'utf8'
);

const SQL_AUDIT_LOGS = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_email text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;
`;

async function run() {
  console.log('=== Verificando estado atual via REST API ===');

  // Check tables via information_schema through PostgREST
  const tablesCheck = await callRPC('exec_sql', { sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('audit_logs','geo_consents','user_consents')" });
  console.log('exec_sql RPC status:', tablesCheck.statusCode);
  console.log('exec_sql RPC body:', tablesCheck.body.substring(0, 200));

  if (tablesCheck.statusCode === 200) {
    console.log('\nexec_sql RPC available! Running migrations...');

    console.log('\n=== Executando 002_user_consents.sql ===');
    const r1 = await callRPC('exec_sql', { sql: SQL_002_USER_CONSENTS });
    console.log('Status:', r1.statusCode, 'Body:', r1.body.substring(0, 300));

    console.log('\n=== Executando audit_logs SQL ===');
    const r2 = await callRPC('exec_sql', { sql: SQL_AUDIT_LOGS });
    console.log('Status:', r2.statusCode, 'Body:', r2.body.substring(0, 300));

  } else {
    console.log('\nexec_sql RPC not available.');
    console.log('\nTrying query via PostgREST information_schema...');

    // Try to query via PostgREST views
    const opts = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: `/rest/v1/?apikey=${SERVICE_ROLE_KEY}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    };
    const schemaRes = await httpsRequest(opts, null);
    console.log('Schema discovery status:', schemaRes.statusCode);
    console.log('Body (first 500):', schemaRes.body.substring(0, 500));
  }

  // Final: query to verify
  console.log('\n=== VERIFICACAO FINAL ===');
  const finalCheck = await callRPC('exec_sql', {
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('audit_logs','geo_consents','user_consents') UNION ALL SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('deleted_at','deletion_scheduled_at')"
  });
  console.log('Final check status:', finalCheck.statusCode);
  console.log('Final check body:', finalCheck.body.substring(0, 500));
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
