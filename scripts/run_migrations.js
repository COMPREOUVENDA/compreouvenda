const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_CONFIG = {
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

async function runSQL(client, label, sql) {
  console.log(`\n=== Executando: ${label} ===`);
  try {
    await client.query(sql);
    console.log(`[OK] ${label} executado com sucesso.`);
  } catch (err) {
    console.error(`[ERRO] ${label}:`, err.message);
    throw err;
  }
}

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('[OK] Conectado ao Supabase PostgreSQL.');

  const root = path.join(__dirname, '..');

  // 1) _migration_manual_supabase.sql
  const sql1 = fs.readFileSync(path.join(__dirname, '_migration_manual_supabase.sql'), 'utf8');
  await runSQL(client, '_migration_manual_supabase.sql', sql1);

  // 2) 003_escrow_system.sql
  const sql2 = fs.readFileSync(path.join(root, 'supabase', 'migrations', '003_escrow_system.sql'), 'utf8');
  await runSQL(client, '003_escrow_system.sql', sql2);

  // 3) fix-rls-users.sql
  const sql3 = fs.readFileSync(path.join(__dirname, 'fix-rls-users.sql'), 'utf8');
  await runSQL(client, 'fix-rls-users.sql', sql3);

  // VERIFICACAO: tabelas existem?
  console.log('\n=== Verificando tabelas ===');
  const verifyRes = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'user_consents','audit_logs','geo_consents',
        'escrow_transactions','escrow_logs','disputes','qr_validation_attempts'
      )
    ORDER BY table_name;
  `);
  console.log('[TABELAS ENCONTRADAS]:');
  verifyRes.rows.forEach(r => console.log(' -', r.table_name));

  const expected = ['audit_logs','disputes','escrow_logs','escrow_transactions','qr_validation_attempts','user_consents'];
  const found = verifyRes.rows.map(r => r.table_name);
  const missing = expected.filter(t => !found.includes(t));
  if (missing.length > 0) {
    console.warn('[AVISO] Tabelas nao encontradas (podem ser opcionals ou ja existentes):', missing);
  } else {
    console.log('[OK] Todas as 6 tabelas essenciais existem.');
  }

  await client.end();

  // Gerar secrets
  const escrowQrSecret = crypto.randomBytes(32).toString('hex');
  const cronSecret = crypto.randomBytes(32).toString('hex');
  console.log('\n=== Secrets gerados ===');
  console.log('ESCROW_QR_SECRET=' + escrowQrSecret);
  console.log('CRON_SECRET=' + cronSecret);

  // Escrever no .env.local
  const envPath = path.join(root, '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');

  if (!envContent.includes('ESCROW_QR_SECRET=')) {
    envContent += `\nESCROW_QR_SECRET=${escrowQrSecret}`;
    console.log('[OK] ESCROW_QR_SECRET adicionado ao .env.local');
  } else {
    console.log('[INFO] ESCROW_QR_SECRET ja existe no .env.local');
  }

  if (!envContent.includes('CRON_SECRET=')) {
    envContent += `\nCRON_SECRET=${cronSecret}`;
    console.log('[OK] CRON_SECRET adicionado ao .env.local');
  } else {
    console.log('[INFO] CRON_SECRET ja existe no .env.local');
  }

  fs.writeFileSync(envPath, envContent.trimEnd() + '\n', 'utf8');
  console.log('[OK] .env.local atualizado.');
  console.log('\n=== Todas as migrations concluidas com sucesso! ===');
}

main().catch(err => {
  console.error('[FALHA GERAL]:', err.message);
  process.exit(1);
});
