const { Client } = require('pg');
const c = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co', port: 5432,
  user: 'postgres', password: '122459pa01#01', database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
(async () => {
  await c.connect();
  for (const t of ['featured_products', 'subscriptions', 'payments']) {
    const r = await c.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    const n = await c.query(`SELECT COUNT(*)::int n FROM public."${t}"`);
    console.log(`--- ${t} (${n.rows[0].n} linhas) ---`);
    console.log(r.rows.map((x) => `  ${x.column_name}: ${x.data_type}`).join('\n'));
  }
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
