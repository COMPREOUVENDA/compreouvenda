/**
 * Temporary migration runner using pg (node-postgres)
 * Runs: 002_user_consents.sql + audit_logs SQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct host not resolvable; using Supabase pooler (port 5432, transaction mode)
// Pooler requires user in format postgres.PROJECT_REF
const client = new Client({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.auxaajrjwbdsnxtvgmsb',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const SQL_AUDIT_LOGS = `
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
  try {
    console.log('Conectando ao Supabase...');
    await client.connect();
    console.log('Conectado com sucesso.\n');

    // Step 1: Check current state
    console.log('=== ESTADO ATUAL DO BANCO ===');
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('audit_logs', 'geo_consents', 'user_consents')
      ORDER BY table_name;
    `);
    console.log('Tabelas existentes:', tablesResult.rows.map(r => r.table_name));

    const colsResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('deleted_at', 'deletion_scheduled_at');
    `);
    console.log('Colunas em users:', colsResult.rows.map(r => r.column_name));
    console.log('');

    const existingTables = tablesResult.rows.map(r => r.table_name);
    const existingCols = colsResult.rows.map(r => r.column_name);

    // Step 2: Run 002_user_consents.sql if needed
    if (!existingTables.includes('user_consents')) {
      console.log('=== EXECUTANDO 002_user_consents.sql ===');
      const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '002_user_consents.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      await client.query(sql);
      console.log('002_user_consents.sql executado com sucesso.\n');
    } else {
      console.log('Tabela user_consents ja existe, pulando 002_user_consents.sql.\n');
    }

    // Step 3: Run audit_logs + user columns if needed
    const needsAuditLogs = !existingTables.includes('audit_logs');
    const needsCols = !existingCols.includes('deleted_at') || !existingCols.includes('deletion_scheduled_at');

    if (needsAuditLogs || needsCols) {
      console.log('=== EXECUTANDO SQL de audit_logs / colunas users ===');
      await client.query(SQL_AUDIT_LOGS);
      console.log('SQL de audit_logs executado com sucesso.\n');
    } else {
      console.log('audit_logs e colunas de users ja existem, pulando.\n');
    }

    // Step 4: Verify
    console.log('=== VERIFICACAO FINAL ===');
    const finalTables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('audit_logs', 'geo_consents', 'user_consents')
      ORDER BY table_name;
    `);
    const finalCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('deleted_at', 'deletion_scheduled_at');
    `);

    console.log('Tabelas encontradas:', finalTables.rows.map(r => r.table_name));
    console.log('Colunas em users:', finalCols.rows.map(r => r.column_name));

    const requiredTables = ['audit_logs', 'geo_consents', 'user_consents'];
    const requiredCols = ['deleted_at', 'deletion_scheduled_at'];
    const foundTables = finalTables.rows.map(r => r.table_name);
    const foundCols = finalCols.rows.map(r => r.column_name);

    const missingTables = requiredTables.filter(t => !foundTables.includes(t));
    const missingCols = requiredCols.filter(c => !foundCols.includes(c));

    if (missingTables.length === 0 && missingCols.length === 0) {
      console.log('\n[OK] Todas as tabelas e colunas estao presentes. Criterio atendido.');
    } else {
      if (missingTables.length > 0) console.log('\n[AVISO] Tabelas faltando:', missingTables);
      if (missingCols.length > 0) console.log('[AVISO] Colunas faltando em users:', missingCols);
    }

  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
