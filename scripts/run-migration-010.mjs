import https from 'https';
import fs from 'fs';

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MjEzMywiZXhwIjoyMDkyODE4MTMzfQ.CX_0c-PgeTKZ9V6fVALULIA_KDidTec3TeEeiOf_jJY';

function rpc(fnName, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const opts = {
      hostname: 'auxaajrjwbdsnxtvgmsb.supabase.co',
      path: `/rest/v1/rpc/${fnName}`,
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b })); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Step 1: Create a helper function via a trick - use supabase-js
// Actually, we can't create functions via PostgREST. 
// Let's try using the pg connection string directly with a simple TCP postgres client
// Better: use the `postgres` npm package

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function main() {
  // Try using fetch to Supabase Management API
  // Actually let's just use the built-in pg via npx
  const { execSync } = await import('child_process');
  const sql = fs.readFileSync('supabase/migrations/010_p1_wallet_reviews_2fa.sql', 'utf8');
  
  // Write SQL to temp file and use node-postgres
  try {
    execSync('npm list pg', { stdio: 'pipe' });
  } catch {
    console.log('Installing pg...');
    execSync('npm install pg --no-save', { stdio: 'inherit' });
  }
  
  const { default: pg } = await import('pg');
  const client = new pg.Client({
    host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
    port: 5432,
    user: 'postgres',
    password: '122459pa01#01',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Connected to database');
  
  try {
    await client.query(sql);
    console.log('Migration 010 executed successfully!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

main();
