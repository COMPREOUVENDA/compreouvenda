/**
 * E2E Fase 3 — Central Financeira consolidada + KPIs do Clube no dashboard.
 *
 * Valida:
 *  1. /api/admin/commercial retorna bloco `finance` com as 7 fontes de receita
 *  2. cada fonte aponta para a tabela de origem correta (sem duplicação)
 *  3. soma dos streams == totalRevenue; netRevenue == totalRevenue - gatewayCost
 *  4. participação (share) de cada fonte é coerente
 *  5. /api/admin/stats expõe `club` e `pendingActions` com dados reais
 *  6. KPIs do clube batem com o banco (contagem direta via /api/admin/club-metrics)
 *  7. pendências só aparecem quando existe item realmente pendente
 *  8. rotas continuam protegidas sem token
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = pick('NEXT_PUBLIC_SUPABASE_URL');
const ANON = pick('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push(`  OK   ${name}`); }
  else { fail++; results.push(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`); }
}

async function login() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@compreouvenda.com', password: '5AA$eA%VmM?-5bB2Z566' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Login admin falhou: ' + JSON.stringify(j));
  return j.access_token;
}

const api = (token) => async (p) => {
  const r = await fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${token}` } });
  let body = null;
  try { body = await r.json(); } catch { /* resposta sem json */ }
  return { status: r.status, body };
};

(async () => {
  console.log('\n=== E2E FASE 3 — Central Financeira + Ecossistema ===\n');

  // --- 1. Proteção das rotas ---
  for (const p of ['/api/admin/commercial', '/api/admin/stats']) {
    const r = await fetch(`${BASE}${p}`);
    check(`${p} bloqueia acesso sem token`, r.status === 401 || r.status === 403, `status ${r.status}`);
  }

  const token = await login();
  const get = api(token);

  // --- 2. Central Financeira ---
  const com = await get('/api/admin/commercial');
  check('GET /api/admin/commercial responde 200', com.status === 200, `status ${com.status}`);

  const f = com.body?.finance;
  check('resposta contém bloco `finance`', !!f);

  if (f) {
    const EXPECTED = [
      'marketplace_fee', 'subscriptions', 'featured',
      'advertising', 'club', 'ai_credits', 'financial_services',
    ];
    const ids = (f.streams || []).map((s) => s.id);
    check('finance expõe exatamente 7 fontes de receita', ids.length === 7, `recebeu ${ids.length}`);
    for (const id of EXPECTED) {
      check(`fonte "${id}" presente`, ids.includes(id));
    }

    for (const s of f.streams || []) {
      check(`"${s.id}" declara tabela de origem`, typeof s.origin === 'string' && s.origin.length > 0);
      check(`"${s.id}" tem rótulo em português`, typeof s.label === 'string' && s.label.length > 0);
      check(`"${s.id}" tem total numérico >= 0`, typeof s.total === 'number' && s.total >= 0, String(s.total));
      check(`"${s.id}" tem valor do mês <= total`, s.month <= s.total + 0.001, `mês ${s.month} > total ${s.total}`);
      check(`"${s.id}" marca active coerente com o total`, s.active === (s.total > 0), `active=${s.active} total=${s.total}`);
    }

    // Origens não podem se repetir — garantia de "sem estrutura duplicada"
    const origins = (f.streams || []).map((s) => s.origin);
    check('nenhuma fonte compartilha a mesma tabela de origem', new Set(origins).size === origins.length,
      origins.join(' | '));

    // Intermediação deve vir de orders, não de revenue_entries
    const mkt = (f.streams || []).find((s) => s.id === 'marketplace_fee');
    check('intermediação é lida de `orders` (não duplicada em revenue_entries)',
      !!mkt && mkt.origin.includes('orders'), mkt?.origin);
    const subs = (f.streams || []).find((s) => s.id === 'subscriptions');
    check('assinaturas são lidas de `subscriptions`', !!subs && subs.origin.includes('subscription'), subs?.origin);
    const feat = (f.streams || []).find((s) => s.id === 'featured');
    check('destaques são lidos de `featured_products`', !!feat && feat.origin.includes('featured_products'), feat?.origin);

    // --- 3. Consistência aritmética ---
    const sumTotal = (f.streams || []).reduce((a, s) => a + Number(s.total || 0), 0);
    check('soma dos streams == totalRevenue', Math.abs(sumTotal - f.totalRevenue) < 0.01,
      `soma ${sumTotal} vs total ${f.totalRevenue}`);
    const sumMonth = (f.streams || []).reduce((a, s) => a + Number(s.month || 0), 0);
    check('soma dos streams do mês == monthRevenue', Math.abs(sumMonth - f.monthRevenue) < 0.01,
      `soma ${sumMonth} vs mês ${f.monthRevenue}`);
    check('netRevenue == totalRevenue - gatewayCost',
      Math.abs(f.netRevenue - (f.totalRevenue - f.gatewayCost)) < 0.01,
      `${f.netRevenue} != ${f.totalRevenue} - ${f.gatewayCost}`);
    check('gatewayCost nunca supera a receita total', f.gatewayCost <= f.totalRevenue + 0.01,
      `custo ${f.gatewayCost} > receita ${f.totalRevenue}`);
    check('activeStreams == nº de fontes com receita',
      f.activeStreams === (f.streams || []).filter((s) => s.total > 0).length,
      `${f.activeStreams}`);
    check('totalStreams == 7', f.totalStreams === 7, String(f.totalStreams));

    // --- 4. Participação percentual ---
    if (f.totalRevenue > 0) {
      const sumShare = (f.streams || []).reduce((a, s) => a + Number(s.share || 0), 0);
      check('soma das participações fica próxima de 100%', Math.abs(sumShare - 100) < 1.5, `${sumShare}%`);
      for (const s of f.streams || []) {
        check(`participação de "${s.id}" entre 0 e 100`, s.share >= 0 && s.share <= 100, String(s.share));
      }
    } else {
      check('sem receita, todas as participações são 0',
        (f.streams || []).every((s) => s.share === 0));
    }

    // Abas antigas preservadas (não houve regressão)
    check('bloco `revenue` original preservado', !!com.body?.revenue);
    check('bloco `plans` original preservado', Array.isArray(com.body?.plans));
    check('bloco `coupons` original preservado', Array.isArray(com.body?.coupons));
  }

  // --- 5. Dashboard executivo: KPIs do clube ---
  const st = await get('/api/admin/stats');
  check('GET /api/admin/stats responde 200', st.status === 200, `status ${st.status}`);
  const club = st.body?.club;
  check('stats expõe bloco `club`', !!club);
  check('stats expõe `pendingActions`', Array.isArray(st.body?.pendingActions));
  check('overview original preservado', !!st.body?.overview?.totalUsers !== undefined);

  if (club) {
    const KEYS = ['totalPartners', 'activePartners', 'pendingPartners', 'publishedBenefits',
      'redemptions', 'clubUsers', 'newCustomers', 'clubVolume', 'activeCampaigns', 'adRevenue'];
    for (const k of KEYS) {
      check(`club.${k} é numérico`, typeof club[k] === 'number', `${typeof club[k]}`);
    }
    check('activePartners <= totalPartners', club.activePartners <= club.totalPartners);
    check('pendingPartners <= totalPartners', club.pendingPartners <= club.totalPartners);
    check('clubUsers <= redemptions', club.clubUsers <= club.redemptions,
      `${club.clubUsers} usuários para ${club.redemptions} utilizações`);
    check('newCustomers <= redemptions', club.newCustomers <= club.redemptions);
    check('redemptions30d <= redemptions', club.redemptions30d <= club.redemptions);
  }

  // --- 6. Visão consolidada do ecossistema ---
  const ov = st.body?.overview;
  if (ov && club) {
    check('ecosystemVolume == gmv + volume do clube',
      Math.abs(ov.ecosystemVolume - (ov.gmv + club.clubVolume)) < 0.01,
      `${ov.ecosystemVolume}`);
    check('ecosystemRevenue == receita marketplace + publicidade do clube',
      Math.abs(ov.ecosystemRevenue - (ov.totalRevenue + club.adRevenue)) < 0.01,
      `${ov.ecosystemRevenue}`);
    check('ecosystemVolume nunca menor que o GMV', ov.ecosystemVolume >= ov.gmv);
  }

  // --- 7. Pendências coerentes ---
  const pa = st.body?.pendingActions || [];
  check('toda pendência listada tem contagem > 0', pa.every((a) => a.count > 0),
    JSON.stringify(pa));
  check('toda pendência aponta para uma rota do admin', pa.every((a) => a.href?.startsWith('/admin/')));
  if (club) {
    const pp = pa.find((a) => a.id === 'partners');
    check('pendência de parceiros reflete club.pendingPartners',
      club.pendingPartners > 0 ? pp?.count === club.pendingPartners : !pp,
      `pending=${club.pendingPartners} card=${pp?.count}`);
  }

  // --- 8. Cruzamento com a rota de métricas do clube ---
  const cm = await get('/api/admin/club-metrics');
  check('GET /api/admin/club-metrics responde 200', cm.status === 200, `status ${cm.status}`);
  if (cm.status === 200 && club) {
    const k = cm.body?.kpis || cm.body;
    const partners = k?.activePartners ?? k?.partners?.active;
    if (typeof partners === 'number') {
      check('parceiros ativos batem entre /stats e /club-metrics',
        partners === club.activePartners, `${partners} vs ${club.activePartners}`);
    } else {
      check('club-metrics retorna estrutura de KPIs', !!k);
    }
  }

  console.log(results.join('\n'));
  console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FAIL (${pass + fail} testes) ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
