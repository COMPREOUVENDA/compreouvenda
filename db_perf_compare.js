/**
 * Teste rápido de performance pós-otimização
 * Compara a consulta de feed com thumbnail_url vs LATERAL JOIN
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 20,
});

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] || 0;
}

async function runBatch(sql, concurrency, iterations) {
  const times = [];
  const batches = Math.ceil(iterations / concurrency);
  for (let b = 0; b < batches; b++) {
    const batch = Math.min(concurrency, iterations - b * concurrency);
    await Promise.all(Array.from({ length: batch }, async () => {
      const c = await pool.connect();
      const t = Date.now();
      try { await c.query(sql); } finally { c.release(); }
      times.push(Date.now() - t);
    }));
  }
  const avg = +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
  return { avg, p50: percentile(times, 50), p95: percentile(times, 95), min: Math.min(...times), max: Math.max(...times) };
}

const ANTES = `
  SELECT p.id, p.title, p.price, p.views_count, p.is_featured,
         p.condition, p.city, p.state,
         c.name AS category_name,
         pi.url AS image_url
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT url FROM product_images WHERE product_id = p.id LIMIT 1
  ) pi ON true
  WHERE p.status = 'active'
  ORDER BY p.is_featured DESC, p.created_at DESC
  LIMIT 20`;

const DEPOIS = `
  SELECT p.id, p.title, p.price, p.views_count, p.is_featured,
         p.condition, p.city, p.state, p.thumbnail_url,
         c.name AS category_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.status = 'active'
  ORDER BY p.is_featured DESC, p.created_at DESC
  LIMIT 20`;

async function main() {
  const sep = '═'.repeat(65);
  console.log('\n' + sep);
  console.log('  COMPARAÇÃO ANTES vs DEPOIS — OTIMIZAÇÃO DE PERFORMANCE');
  console.log(sep);
  console.log('\nExecutando 50 requisições com 10 conexões simultâneas...\n');

  const [antes, depois] = await Promise.all([
    runBatch(ANTES,  10, 50),
    runBatch(DEPOIS, 10, 50),
  ]);

  const melhora = (((antes.avg - depois.avg) / antes.avg) * 100).toFixed(1);

  console.log('                        ANTES          DEPOIS       MELHORA');
  console.log('─'.repeat(65));
  const r = (v, a) => `${v}ms`.padStart(a);
  console.log(`Média (avg):          ${r(antes.avg,10)}    ${r(depois.avg,10)}    ${melhora > 0 ? '↓' : '↑'} ${Math.abs(melhora)}%`);
  console.log(`Mediana (p50):        ${r(antes.p50,10)}    ${r(depois.p50,10)}`);
  console.log(`Percentil 95 (p95):   ${r(antes.p95,10)}    ${r(depois.p95,10)}`);
  console.log(`Mínimo:               ${r(antes.min,10)}    ${r(depois.min,10)}`);
  console.log(`Máximo:               ${r(antes.max,10)}    ${r(depois.max,10)}`);
  console.log('─'.repeat(65));

  if (melhora > 0) {
    console.log(`\n✅ Redução de ${melhora}% na latência média do feed principal!`);
  } else {
    console.log(`\n⚠️  Sem melhora mensurável (latência dominada por RTT de rede)`);
  }

  // EXPLAIN ANALYZE comparativo
  console.log('\n\n🔍 EXPLAIN — ANTES (com LATERAL JOIN):');
  const c1 = await pool.connect();
  try {
    const { rows } = await c1.query('EXPLAIN (ANALYZE, FORMAT TEXT) ' + ANTES);
    rows.slice(0, 8).forEach(r => console.log('  ' + Object.values(r)[0]));
  } finally { c1.release(); }

  console.log('\n🔍 EXPLAIN — DEPOIS (com thumbnail_url):');
  const c2 = await pool.connect();
  try {
    const { rows } = await c2.query('EXPLAIN (ANALYZE, FORMAT TEXT) ' + DEPOIS);
    rows.slice(0, 8).forEach(r => console.log('  ' + Object.values(r)[0]));
  } finally { c2.release(); }

  // Latência de rede (baseline RTT)
  console.log('\n\n📡 LATÊNCIA DE REDE (RTT):');
  const pings = [];
  for (let i = 0; i < 10; i++) {
    const c = await pool.connect();
    const t = Date.now();
    await c.query('SELECT 1');
    pings.push(Date.now() - t);
    c.release();
  }
  const rtt = +(pings.reduce((a, b) => a + b, 0) / pings.length).toFixed(1);
  console.log(`  RTT médio Brasil → Supabase: ${rtt}ms`);
  console.log(`  (${rtt > 100 ? '⚠️  Alta latência — servidor fora do Brasil. Migrar para região sa-east-1 (São Paulo) reduziria para ~20-40ms' : '✅ Latência OK'})`);

  console.log('\n' + sep + '\n');
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
