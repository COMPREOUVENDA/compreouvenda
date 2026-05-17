const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'geo-consents-migration.sql'), 'utf8');

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('Conectado ao banco Supabase.');

    await client.query(sql);
    console.log('Migration geo_consents executada com sucesso.');

    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geo_consents'"
    );

    if (result.rows.length > 0) {
      console.log('VERIFICACAO OK: tabela geo_consents existe no banco.');
    } else {
      console.error('ERRO: tabela geo_consents NAO encontrada apos migration.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Erro ao executar migration:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Conexao encerrada.');
  }
}

run();
