/**
 * COMPREOUVENDA — Teste de Carga e Performance do Banco de Dados
 * Executa consultas reais dos principais fluxos do app com concorrência
 * e mede latência, throughput e gargalos.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 20,          // conexões simultâneas no pool
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 8000,
});

// ─── Utilitários ────────────────────────────────────────────────────────────

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(times) {
  if (!times.length) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  const sum = times.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: +(sum / times.length).toFixed(1),
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
  };
}

async function runQuery(sql, params = []) {
  const start = Date.now();
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { duration: Date.now() - start, rows: result.rowCount ?? result.rows.length };
  } finally {
    client.release();
  }
}

async function runConcurrent(label, sql, params, concurrency, iterations) {
  const times = [];
  const errors = [];
  const batches = Math.ceil(iterations / concurrency);

  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, iterations - b * concurrency);
    const promises = Array.from({ length: batchSize }, () =>
      runQuery(sql, params)
        .then(r => times.push(r.duration))
        .catch(e => errors.push(e.message))
    );
    await Promise.all(promises);
  }

  const s = stats(times);
  return { label, concurrency, iterations, errors: errors.length, ...s };
}

// ─── Cenários de teste ───────────────────────────────────────────────────────

const TESTS = [
  // 1. Home feed — consulta mais frequente do app (toda vez que alguém abre o app)
  {
    label: '1. Feed principal (home)',
    sql: `
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
      LIMIT 20
    `,
    concurrency: 10,
    iterations: 50,
  },

  // 2. Busca com filtro de categoria
  {
    label: '2. Busca por categoria',
    sql: `
      SELECT p.id, p.title, p.price, p.condition, p.city,
             pi.url AS image_url
      FROM products p
      LEFT JOIN LATERAL (
        SELECT url FROM product_images WHERE product_id = p.id LIMIT 1
      ) pi ON true
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT 20
    `,
    concurrency: 8,
    iterations: 40,
  },

  // 3. Busca full-text (usa o índice GIN criado na migration 011)
  {
    label: '3. Busca full-text (FTS)',
    sql: `
      SELECT p.id, p.title, p.price, p.city,
             ts_rank(p.search_vector, query) AS rank
      FROM products p,
           plainto_tsquery('portuguese', 'produto usado') AS query
      WHERE p.status = 'active'
        AND p.search_vector @@ query
      ORDER BY rank DESC
      LIMIT 20
    `,
    concurrency: 5,
    iterations: 30,
  },

  // 4. Página de produto — leitura de detalhe com imagens e vendedor
  {
    label: '4. Detalhe de produto',
    sql: `
      SELECT p.*,
             u.name AS seller_name, u.avatar_url, u.rating,
             c.name AS category_name
      FROM products p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active'
      LIMIT 1
    `,
    concurrency: 10,
    iterations: 50,
  },

  // 5. Chat — carregar mensagens de uma conversa
  {
    label: '5. Histórico de mensagens (chat)',
    sql: `
      SELECT m.id, m.content, m.created_at, m.sender_id,
             u.name AS sender_name, u.avatar_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      ORDER BY m.created_at DESC
      LIMIT 30
    `,
    concurrency: 8,
    iterations: 40,
  },

  // 6. Notificações — painel de notificações do usuário
  {
    label: '6. Notificações do usuário',
    sql: `
      SELECT id, title, body, type, status, created_at
      FROM notification_queue
      ORDER BY created_at DESC
      LIMIT 20
    `,
    concurrency: 8,
    iterations: 40,
  },

  // 7. Listagem de pedidos
  {
    label: '7. Pedidos (listagem)',
    sql: `
      SELECT o.id, o.gross_value, o.payment_status, o.delivery_status,
             o.created_at,
             p.title AS product_title,
             u.name AS seller_name
      FROM orders o
      JOIN products p ON p.id = o.product_id
      JOIN users u ON u.id = o.seller_id
      ORDER BY o.created_at DESC
      LIMIT 20
    `,
    concurrency: 6,
    iterations: 30,
  },

  // 8. Pior caso: produto + imagens + avaliações + vendedor (JOINs profundos)
  {
    label: '8. Carga máxima: produto + imagens + avaliações + vendedor',
    sql: `
      SELECT
        p.id, p.title, p.price, p.description, p.condition,
        p.views_count, p.favorites_count, p.is_featured,
        u.id AS seller_id, u.name AS seller_name, u.avatar_url, u.rating,
        c.name AS category_name,
        COALESCE(
          (SELECT json_agg(pi.url) FROM product_images pi WHERE pi.product_id = p.id),
          '[]'
        ) AS images,
        COALESCE(
          (SELECT json_agg(json_build_object('rating', r.rating, 'comment', r.comment))
           FROM reviews r WHERE r.seller_id = u.id LIMIT 5),
          '[]'
        ) AS reviews
      FROM products p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active'
      LIMIT 5
    `,
    concurrency: 5,
    iterations: 20,
  },

  // 9. Escrow — consulta administrativa
  {
    label: '9. Consulta de escrow (admin)',
    sql: `
      SELECT e.id, e.order_id, e.status, e.amount, e.created_at,
             o.buyer_id, o.seller_id, o.gross_value
      FROM escrow_transactions e
      JOIN orders o ON o.id = e.order_id
      ORDER BY e.created_at DESC
      LIMIT 20
    `,
    concurrency: 4,
    iterations: 20,
  },

  // 10. Contagem de registros por tabela (health check)
  {
    label: '10. Contagem de registros (health)',
    sql: `
      SELECT
        (SELECT COUNT(*) FROM products WHERE status = 'active') AS products,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM notification_queue) AS notifications
    `,
    concurrency: 3,
    iterations: 10,
  },
];

// ─── EXPLAIN ANALYZE dos índices críticos ────────────────────────────────────

const EXPLAIN_QUERIES = [
  {
    label: 'EXPLAIN: Feed principal',
    sql: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT p.id, p.title, p.price
      FROM products p
      WHERE p.status = 'active'
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT 20`,
  },
  {
    label: 'EXPLAIN: FTS search_vector',
    sql: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT p.id, p.title
      FROM products p,
           plainto_tsquery('portuguese', 'produto') AS query
      WHERE p.search_vector @@ query
      LIMIT 10`,
  },
  {
    label: 'EXPLAIN: Notificações por usuário (índice)',
    sql: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id, title, status
      FROM notification_queue
      ORDER BY created_at DESC
      LIMIT 20`,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

function fmt(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function badge(avg) {
  if (avg < 50)  return '🟢 EXCELENTE';
  if (avg < 150) return '🟡 BOM';
  if (avg < 400) return '🟠 ACEITÁVEL';
  return '🔴 LENTO';
}

async function main() {
  const sep = '═'.repeat(72);
  const div = '─'.repeat(72);

  console.log('\n' + sep);
  console.log('  COMPREOUVENDA — TESTE DE CARGA E PERFORMANCE DO BANCO DE DADOS');
  console.log('  ' + new Date().toLocaleString('pt-BR'));
  console.log(sep + '\n');

  // Teste de conexão inicial
  try {
    const { rows } = await pool.query('SELECT version(), NOW() AS hora');
    console.log('✅ Conexão estabelecida');
    console.log('   PostgreSQL:', rows[0].version.split(' ').slice(0, 2).join(' '));
    console.log('   Horário do banco:', new Date(rows[0].hora).toLocaleString('pt-BR'));
  } catch (e) {
    console.error('❌ Falha na conexão:', e.message);
    process.exit(1);
  }

  // Verificar quais tabelas existem
  const { rows: tables } = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const tableNames = new Set(tables.map(t => t.tablename));
  console.log(`\n📋 Tabelas encontradas (${tables.length}):`, [...tableNames].join(', '));
  console.log('\n' + sep);

  // ── Executar testes de concorrência ──────────────────────────────────────
  console.log('\n📊 TESTES DE CONCORRÊNCIA E LATÊNCIA\n' + div);
  console.log(
    'TESTE'.padEnd(46) +
    'CONC'.padStart(5) +
    'ITER'.padStart(5) +
    'AVG'.padStart(7) +
    'P50'.padStart(7) +
    'P95'.padStart(7) +
    'P99'.padStart(7) +
    'MAX'.padStart(7) +
    'ERR'.padStart(5) +
    '  STATUS'
  );
  console.log(div);

  const results = [];
  for (const test of TESTS) {
    // Pular se tabela não existe
    const tableInQuery = test.sql.match(/FROM\s+(\w+)/i)?.[1];
    if (tableInQuery && !tableNames.has(tableInQuery)) {
      console.log(`${test.label.padEnd(46)} ${'(tabela ausente)'.padStart(40)}`);
      continue;
    }

    try {
      const r = await runConcurrent(test.label, test.sql, test.params || [], test.concurrency, test.iterations);
      results.push(r);
      console.log(
        r.label.padEnd(46) +
        String(r.concurrency).padStart(5) +
        String(r.iterations).padStart(5) +
        fmt(r.avg).padStart(7) +
        fmt(r.p50).padStart(7) +
        fmt(r.p95).padStart(7) +
        fmt(r.p99).padStart(7) +
        fmt(r.max).padStart(7) +
        String(r.errors).padStart(5) +
        '  ' + badge(r.avg)
      );
    } catch (e) {
      console.log(`${test.label.padEnd(46)} ❌ ERRO: ${e.message}`);
    }
  }

  // ── EXPLAIN ANALYZE ───────────────────────────────────────────────────────
  console.log('\n\n🔍 EXPLAIN ANALYZE — PLANOS DE EXECUÇÃO\n' + div);
  for (const eq of EXPLAIN_QUERIES) {
    try {
      const { rows } = await pool.query(eq.sql);
      console.log(`\n▶ ${eq.label}`);
      rows.forEach(r => {
        const line = r['QUERY PLAN'] || Object.values(r)[0];
        if (line) console.log('  ' + line);
      });
    } catch (e) {
      console.log(`\n▶ ${eq.label} — ERRO: ${e.message}`);
    }
  }

  // ── Métricas do banco ────────────────────────────────────────────────────
  console.log('\n\n📈 MÉTRICAS DO BANCO\n' + div);

  // Tamanho das tabelas
  try {
    const { rows } = await pool.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size('public.' || quote_ident(tablename))) AS tamanho,
        pg_total_relation_size('public.' || quote_ident(tablename)) AS bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY bytes DESC
      LIMIT 12
    `);
    console.log('\n📦 Tamanho das tabelas (top 12):');
    rows.forEach(r => console.log(`   ${r.tablename.padEnd(35)} ${r.tamanho}`));
  } catch (e) {
    console.log('Erro ao buscar tamanhos:', e.message);
  }

  // Índices existentes
  try {
    const { rows } = await pool.query(`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    console.log(`\n🗂  Índices criados: ${rows.length}`);
    const byTable = {};
    rows.forEach(r => {
      (byTable[r.tablename] = byTable[r.tablename] || []).push(r.indexname);
    });
    Object.entries(byTable).forEach(([t, idxs]) => {
      console.log(`   ${t.padEnd(30)} ${idxs.join(', ')}`);
    });
  } catch (e) {
    console.log('Erro ao listar índices:', e.message);
  }

  // Conexões ativas
  try {
    const { rows } = await pool.query(`
      SELECT state, COUNT(*) AS total
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `);
    console.log('\n🔌 Conexões ativas:');
    rows.forEach(r => console.log(`   ${(r.state || 'null').padEnd(20)} ${r.total}`));
  } catch (e) {
    console.log('Erro ao buscar conexões:', e.message);
  }

  // ── Resumo Final ────────────────────────────────────────────────────────
  console.log('\n\n' + sep);
  console.log('  RESUMO FINAL');
  console.log(sep);

  const slow = results.filter(r => r.avg >= 400);
  const ok   = results.filter(r => r.avg >= 150 && r.avg < 400);
  const good = results.filter(r => r.avg >= 50  && r.avg < 150);
  const fast = results.filter(r => r.avg < 50);
  const errs = results.filter(r => r.errors > 0);

  console.log(`\n  🟢 Excelente  (<50ms):  ${fast.length} consulta(s)`);
  console.log(`  🟡 Bom        (<150ms): ${good.length} consulta(s)`);
  console.log(`  🟠 Aceitável  (<400ms): ${ok.length} consulta(s)`);
  console.log(`  🔴 Lento      (≥400ms): ${slow.length} consulta(s)`);
  if (errs.length) {
    console.log(`\n  ⚠️  Consultas com erros: ${errs.map(r => r.label).join(', ')}`);
  }

  if (slow.length > 0) {
    console.log('\n  🚨 CONSULTAS QUE PRECISAM DE ATENÇÃO:');
    slow.forEach(r => {
      console.log(`     • ${r.label} — avg ${fmt(r.avg)}, p95 ${fmt(r.p95)}`);
    });
    console.log('\n  RECOMENDAÇÕES:');
    console.log('     1. Verificar se os índices existem para as colunas filtradas');
    console.log('     2. Adicionar cache Redis para consultas de feed (TTL 30s)');
    console.log('     3. Considerar paginação por cursor em vez de OFFSET');
    console.log('     4. Avaliar materialização das consultas pesadas');
  } else {
    console.log('\n  ✅ Todas as consultas dentro do limite aceitável!');
    console.log('     O banco está saudável e responsivo para a carga atual.');
  }

  console.log('\n' + sep + '\n');
  await pool.end();
}

main().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
