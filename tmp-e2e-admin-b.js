/**
 * Verificação das telas administrativas que exibiam números fictícios.
 *
 * Não basta o build passar: o ponto do Bloco B é que cada tela agora lê o
 * banco real. Aqui conferimos que as rotas respondem, que os totais batem com
 * a contagem feita direto no Postgres e que nenhuma delas inventa número
 * quando a tabela está vazia.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BASE = process.env.E2E_BASE || 'http://localhost:3500';
const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = pick('NEXT_PUBLIC_SUPABASE_URL');
const ANON = pick('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => {
  if (cond) { pass++; out.push(`  OK   ${name}`); }
  else { fail++; out.push(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`); }
};

const db = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co', port: 5432,
  user: 'postgres', password: '122459pa01#01', database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  console.log('\n=== Verificação — telas administrativas sem dados fictícios ===\n');
  await db.connect();

  const token = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@compreouvenda.com', password: '5AA$eA%VmM?-5bB2Z566' }),
  }).then((r) => r.json()).then((j) => j.access_token);

  const get = async (p) => {
    const res = await fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${token}` } });
    let body = null;
    try { body = await res.json(); } catch { /* sem corpo */ }
    return { status: res.status, body };
  };

  // Sem sessão nenhuma delas pode responder.
  for (const p of ['/api/admin/geo', '/api/admin/commissions', '/api/admin/ai-pricing',
    '/api/admin/feature-metrics?feature=auctions']) {
    const res = await fetch(`${BASE}${p}`);
    check(`${p} exige autenticação`, res.status === 401 || res.status === 403, `status ${res.status}`);
  }

  // ── Geolocalização ─────────────────────────────────────────────────────
  const geo = await get('/api/admin/geo');
  check('/api/admin/geo responde 200', geo.status === 200, JSON.stringify(geo.body).slice(0, 200));

  const usersTotal = (await db.query(`SELECT count(*)::int n FROM public.users`)).rows[0].n;
  check('total de usuários bate com o banco',
    geo.body?.coverage?.users_total === usersTotal,
    `api ${geo.body?.coverage?.users_total} x banco ${usersTotal}`);

  const usersComCidade = (await db.query(
    `SELECT count(*)::int n FROM public.users WHERE city IS NOT NULL AND btrim(city) <> ''`
  )).rows[0].n;
  check('cobertura de cidade preenchida bate com o banco',
    geo.body?.coverage?.users_with_city === usersComCidade,
    `api ${geo.body?.coverage?.users_with_city} x banco ${usersComCidade}`);

  const soma = (geo.body?.cities ?? []).reduce((t, c) => t + (c.users ?? 0), 0);
  check('ranking de cidades não soma mais do que existe', soma <= usersComCidade, `${soma} > ${usersComCidade}`);
  check('geo não devolve cidades fixas de exemplo',
    !JSON.stringify(geo.body ?? {}).includes('8.412'));

  // ── Comissões ──────────────────────────────────────────────────────────
  const com = await get('/api/admin/commissions');
  check('/api/admin/commissions responde 200', com.status === 200, JSON.stringify(com.body).slice(0, 200));
  const comBanco = (await db.query(`SELECT count(*)::int n FROM public.commissions`)).rows[0].n;
  check('contagem de comissões bate com o banco',
    (com.body?.kpis?.total ?? com.body?.commissions?.length ?? 0) === comBanco,
    `api ${com.body?.kpis?.total} x banco ${comBanco}`);
  check('valores de comissão não são números de exemplo',
    !JSON.stringify(com.body ?? {}).includes('6270'));

  // ── Recursos ainda não lançados ────────────────────────────────────────
  for (const [feature, tabela] of [
    ['auctions', 'auction_bids'], ['flash_offers', 'flash_offers'], ['videos', 'product_videos'],
  ]) {
    const r = await get(`/api/admin/feature-metrics?feature=${feature}`);
    check(`/api/admin/feature-metrics?feature=${feature} responde 200`, r.status === 200,
      JSON.stringify(r.body).slice(0, 200));

    const n = (await db.query(`SELECT count(*)::int n FROM public.${tabela}`)).rows[0].n;
    check(`contagem de ${feature} bate com o banco`, r.body?.total === n,
      `api ${r.body?.total} x banco ${n}`);
    check(`${feature} declara honestamente quando não há registro`,
      n > 0 ? r.body?.launched === true : r.body?.launched === false,
      `launched=${r.body?.launched} com ${n} registros`);
  }

  const invalido = await get('/api/admin/feature-metrics?feature=inexistente');
  check('recurso desconhecido é recusado', invalido.status === 400, `status ${invalido.status}`);

  // ── IA de precificação ─────────────────────────────────────────────────
  const ia = await get('/api/admin/ai-pricing');
  check('/api/admin/ai-pricing responde 200', ia.status === 200, JSON.stringify(ia.body).slice(0, 200));
  const cats = (await db.query(
    `SELECT count(*)::int n FROM public.categories WHERE is_active = true`
  )).rows[0].n;
  check('categorias vêm do banco, não da lista fixa de ids 1..12',
    (ia.body?.categories?.length ?? 0) === cats, `api ${ia.body?.categories?.length} x banco ${cats}`);
  check('categorias têm id em formato uuid',
    (ia.body?.categories ?? []).every((c) => /^[0-9a-f-]{36}$/i.test(c.id)));

  await db.end();
  console.log(out.join('\n'));
  console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FAIL (${pass + fail} testes) ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => {
  console.log(out.join('\n'));
  console.error('ERRO FATAL:', e);
  try { await db.end(); } catch { /* já encerrado */ }
  process.exit(1);
});
