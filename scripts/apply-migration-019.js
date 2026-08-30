#!/usr/bin/env node
/**
 * Aplica a migration 019 (Clube de Benefícios no app do usuário) no banco.
 *
 * A migration é idempotente: pode ser executada mais de uma vez sem efeito
 * colateral. Ao final, confere se cada objeto criado realmente existe.
 *
 *   node scripts/apply-migration-019.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '122459pa01#01',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const arquivo = path.join(__dirname, '..', 'supabase', 'migrations', '019_club_app.sql');
  const sql = fs.readFileSync(arquivo, 'utf8');

  await client.connect();
  console.log('Aplicando 019_club_app.sql ...');
  await client.query(sql);
  console.log('  aplicada.');

  console.log('\n=== CONFERÊNCIA ===');

  const colunas = await client.query(
    `SELECT column_name, data_type, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'benefits'
        AND column_name = ANY($1::text[])`,
    [['audience', 'per_user_limit']]
  );
  for (const c of colunas.rows) {
    console.log(`  coluna benefits.${c.column_name} (${c.data_type}) default=${c.column_default ?? 'null'}`);
  }
  if (colunas.rows.length !== 2) throw new Error('colunas de benefits não foram criadas');

  const indices = await client.query(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ANY($1::text[])
      ORDER BY indexname`,
    [['idx_benefits_showcase', 'idx_redem_one_pending', 'idx_redem_user_recent', 'idx_camp_active_period']]
  );
  for (const i of indices.rows) console.log(`  índice ${i.indexname}`);
  if (indices.rows.length !== 4) throw new Error('nem todos os índices foram criados');

  const check = await client.query(
    `SELECT conname FROM pg_constraint WHERE conname = 'benefits_audience_check'`
  );
  console.log(`  constraint ${check.rows[0]?.conname ?? 'AUSENTE'}`);
  if (!check.rows.length) throw new Error('constraint de audience não foi criada');

  // A trava só vale se realmente impedir dois pendentes — teste direto.
  console.log('\n=== TESTE DA TRAVA DE CÓDIGO PENDENTE ===');
  const alvo = await client.query(
    `SELECT b.id AS benefit_id, b.partner_id, u.id AS user_id
       FROM public.benefits b CROSS JOIN LATERAL (SELECT id FROM public.users LIMIT 1) u
      LIMIT 1`
  );
  if (!alvo.rows.length) {
    console.log('  (sem benefício/usuário no banco para testar — pulado)');
  } else {
    const { benefit_id, partner_id, user_id } = alvo.rows[0];
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, user_id, code, status)
         VALUES ($1,$2,$3,$4,'pending')`,
        [benefit_id, partner_id, user_id, 'TRAVA001']
      );
      await client.query(
        `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, user_id, code, status)
         VALUES ($1,$2,$3,$4,'pending')`,
        [benefit_id, partner_id, user_id, 'TRAVA002']
      );
      console.log('  FALHA: o banco aceitou dois códigos pendentes');
      await client.query('ROLLBACK');
      process.exit(1);
    } catch (e) {
      await client.query('ROLLBACK');
      if (/idx_redem_one_pending|duplicate key/i.test(e.message)) {
        console.log('  OK: o segundo código pendente foi recusado pelo banco');
      } else {
        throw e;
      }
    }
  }

  await client.end();
  console.log('\nMigration 019 aplicada e conferida.');
})().catch(async (e) => {
  console.error('ERRO:', e.message);
  try { await client.end(); } catch { /* já encerrado */ }
  process.exit(1);
});
