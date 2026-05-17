/**
 * Script to create audit_logs table in Supabase
 * Run: node scripts/create-audit-logs.js
 *
 * Or run the SQL below directly in your Supabase SQL Editor.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auxaajrjwbdsnxtvgmsb.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SQL = `
-- Audit logs table
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

-- Add missing columns to users table (safe to run even if already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;
`;

async function run() {
  console.log('Running audit_logs migration...');
  const { error } = await supabase.rpc('exec_sql', { sql: SQL }).single();
  if (error) {
    // Try direct approach
    console.log('RPC exec_sql not available. Please run the SQL below in the Supabase SQL Editor:\n');
    console.log(SQL);
  } else {
    console.log('Migration completed successfully.');
  }
}

run().catch(console.error);
