/**
 * E2E Fase 5 — Clube de Benefícios no aplicativo do usuário final.
 *
 * Fecha o ciclo que estava quebrado: o administrador aprovava, o parceiro
 * publicava e ninguém nunca via a oferta. Este teste percorre a ponta que
 * faltava e prova que ela conecta as duas que já existiam.
 *
 * Cobre:
 *   1. vitrine pública — o que aparece e, principalmente, o que NÃO aparece
 *   2. filtro por cidade e segmentação de campanha
 *   3. detalhe do benefício (e o 404 honesto para o que não é público)
 *   4. geração de código: caminho feliz e todas as recusas
 *   5. cancelar libera a trava de código pendente único
 *   6. ciclo completo: usuário gera -> parceiro valida -> métricas mudam
 *   7. instrumentação de campanha: CTR deixa de ser null
 *   8. LGPD: vitrine e rastreamento não expõem dado pessoal
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BASE = process.env.E2E_BASE || 'http://localhost:3500';
const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = pick('NEXT_PUBLIC_SUPABASE_URL');
const ANON = pick('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = pick('SUPABASE_SERVICE_ROLE_KEY');

const TAG = 'E2E-P5';
const PASSWORD = 'E2eClube#2024';
const CIDADE = 'Sorocaba';

let pass = 0, fail = 0;
const out = [];
function check(name, cond, detail) {
  if (cond) { pass++; out.push(`  OK   ${name}`); }
  else { fail++; out.push(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`); }
}

const db = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co', port: 5432,
  user: 'postgres', password: '122459pa01#01', database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function dropUser(email) {
  const r = await db.query(`SELECT id FROM auth.users WHERE lower(email) = lower($1)`, [email]);
  for (const row of r.rows) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${row.id}`, {
      method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    }).catch(() => null);
    if (!res || !res.ok) {
      await db.query(`DELETE FROM public.users WHERE auth_id = $1`, [row.id]);
      await db.query(`DELETE FROM auth.users WHERE id = $1`, [row.id]);
    }
  }
  await db.query(`DELETE FROM public.users WHERE lower(email) = lower($1)`, [email]);
}

async function makeUser(email, name) {
  await dropUser(email);
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  }).then((r) => r.json());
  if (!created.id) throw new Error(`Falha ao criar ${email}: ${JSON.stringify(created)}`);

  let r = await db.query(`SELECT id FROM public.users WHERE auth_id = $1`, [created.id]);
  if (!r.rows.length) {
    r = await db.query(
      `INSERT INTO public.users (auth_id, email, name, type) VALUES ($1,$2,$3,'buyer') RETURNING id`,
      [created.id, email, name]
    );
  } else {
    await db.query(`UPDATE public.users SET name = $2 WHERE id = $1`, [r.rows[0].id, name]);
  }
  return { authId: created.id, userId: r.rows[0].id, email };
}

async function login(email, password = PASSWORD) {
  const j = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!j.access_token) throw new Error(`Login falhou (${email}): ${JSON.stringify(j)}`);
  return j.access_token;
}

/** Cliente HTTP. Sem token = requisição anônima, como a vitrine pública. */
const client = (token) => async (method, p, body) => {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, body: json };
};

const EMAILS = [
  `${TAG}-cliente@e2e.local`,
  `${TAG}-premium@e2e.local`,
  `${TAG}-lojista@e2e.local`,
];

async function cleanup() {
  await db.query(`DELETE FROM public.partners WHERE tax_id LIKE $1`, [`${TAG}%`]);
  // Assinatura não cai por cascata: precisa sair antes do usuário.
  await db.query(
    `DELETE FROM public.subscriptions WHERE user_id IN (
       SELECT id FROM public.users WHERE lower(email) = ANY($1::text[])
     )`,
    [EMAILS.map((e) => e.toLowerCase())]
  );
  for (const e of EMAILS) await dropUser(e);
}

/** Dia da semana atual no fuso de Brasília — a mesma referência do servidor. */
function diaBrasilia() {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
  const MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return MAP[fmt.format(new Date())];
}

(async () => {
  console.log('\n=== E2E FASE 5 — Clube de Benefícios no app do usuário ===\n');
  await db.connect();
  await cleanup();

  // ── Cenário ────────────────────────────────────────────────────────────
  const cliente = await makeUser(EMAILS[0], 'Cliente Clube');
  const assinante = await makeUser(EMAILS[1], 'Assinante Clube');
  const lojista = await makeUser(EMAILS[2], 'Lojista Clube');

  // Parceiro aprovado, com unidade em Sorocaba.
  const pA = (await db.query(
    `INSERT INTO public.partners (legal_name, trade_name, tax_id, category, status, owner_id)
     VALUES ('Cafeteria Clube E2E LTDA', 'Cafeteria Clube', $1, 'gastronomia', 'approved', $2) RETURNING id`,
    [`${TAG}-A`, lojista.userId]
  )).rows[0].id;

  // Parceiro SUSPENSO — nada dele pode chegar à vitrine.
  const pSus = (await db.query(
    `INSERT INTO public.partners (legal_name, trade_name, tax_id, category, status)
     VALUES ('Loja Suspensa E2E LTDA', 'Loja Suspensa', $1, 'moda', 'suspended') RETURNING id`,
    [`${TAG}-S`]
  )).rows[0].id;

  const uA = (await db.query(
    `INSERT INTO public.partner_units (partner_id, name, city, state)
     VALUES ($1, 'Unidade Centro', $2, 'SP') RETURNING id`, [pA, CIDADE]
  )).rows[0].id;

  // Unidade de outro parceiro, para provar que o resgate recusa unidade alheia.
  const uSus = (await db.query(
    `INSERT INTO public.partner_units (partner_id, name, city, state)
     VALUES ($1, 'Unidade Alheia', 'Manaus', 'AM') RETURNING id`, [pSus]
  )).rows[0].id;

  await db.query(
    `INSERT INTO public.partner_members (partner_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [pA, lojista.userId]
  );

  const novoBeneficio = async (campos) => {
    const cols = ['partner_id', ...Object.keys(campos)];
    const vals = [pA, ...Object.values(campos)];
    const ph = cols.map((_, i) => `$${i + 1}`).join(',');
    return (await db.query(
      `INSERT INTO public.benefits (${cols.join(',')}) VALUES (${ph}) RETURNING id`, vals
    )).rows[0].id;
  };

  const bOk = await novoBeneficio({
    title: 'Café 20% OFF', benefit_type: 'percent_discount', discount_percent: 20,
    status: 'approved', min_purchase_value: 10,
  });
  const bDraft = await novoBeneficio({ title: 'Rascunho Invisível', status: 'draft' });
  const bPending = await novoBeneficio({ title: 'Em Análise Invisível', status: 'pending' });
  const bEnded = await novoBeneficio({
    title: 'Promo Encerrada', status: 'approved',
    ends_at: new Date(Date.now() - 86400000).toISOString(),
  });
  const bFuture = await novoBeneficio({
    title: 'Promo Futura', status: 'approved',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  const bSold = await novoBeneficio({
    title: 'Promo Esgotada', status: 'approved', total_quantity: 1, used_quantity: 1,
  });
  const bPremium = await novoBeneficio({
    title: 'Exclusivo Assinantes', status: 'approved', audience: 'premium',
    benefit_type: 'percent_discount', discount_percent: 40,
  });
  const bLimite = await novoBeneficio({
    title: 'Uma Vez Por Pessoa', status: 'approved', per_user_limit: 1,
  });

  // Só vale em dois dias que não são hoje: continua visível, mas com aviso.
  const hoje = diaBrasilia();
  const outrosDias = [(hoje + 3) % 7, (hoje + 4) % 7];
  const bDia = await novoBeneficio({
    title: 'Só em Outro Dia', status: 'approved', valid_weekdays: outrosDias,
  });

  // Benefício aprovado de parceiro suspenso — a armadilha do teste.
  const bSus = (await db.query(
    `INSERT INTO public.benefits (partner_id, title, status, benefit_type, discount_percent)
     VALUES ($1, 'Oferta de Empresa Suspensa', 'approved', 'percent_discount', 90) RETURNING id`,
    [pSus]
  )).rows[0].id;

  // Campanhas: uma para Sorocaba, outra restrita a Manaus.
  const campSoro = (await db.query(
    `INSERT INTO public.partner_campaigns (partner_id, benefit_id, title, campaign_type, status, target_cities, priority)
     VALUES ($1, $2, 'Semana do Café', 'banner', 'active', ARRAY['Sorocaba'], 10) RETURNING id`,
    [pA, bOk]
  )).rows[0].id;

  const campManaus = (await db.query(
    `INSERT INTO public.partner_campaigns (partner_id, title, campaign_type, status, target_cities)
     VALUES ($1, 'Campanha de Manaus', 'banner', 'active', ARRAY['Manaus']) RETURNING id`,
    [pA]
  )).rows[0].id;

  const ANON_C = client(null);
  const tokenCliente = await login(cliente.email);
  const C = client(tokenCliente);
  const tokenAssinante = await login(assinante.email);
  const PREM = client(tokenAssinante);
  const tokenLojista = await login(lojista.email);
  const LOJA = client(tokenLojista);

  // ── 1. Vitrine pública ─────────────────────────────────────────────────
  const vit = await ANON_C('GET', '/api/club/benefits?limit=100');
  check('vitrine responde 200 sem autenticação', vit.status === 200, JSON.stringify(vit.body).slice(0, 200));
  const ids = (vit.body?.benefits ?? []).map((b) => b.id);

  check('benefício aprovado e vigente aparece na vitrine', ids.includes(bOk));
  check('rascunho não aparece na vitrine', !ids.includes(bDraft));
  check('benefício em análise não aparece na vitrine', !ids.includes(bPending));
  check('benefício encerrado não aparece na vitrine', !ids.includes(bEnded));
  check('benefício que ainda não começou não aparece', !ids.includes(bFuture));
  check('benefício esgotado não aparece na vitrine', !ids.includes(bSold));
  check('benefício de parceiro suspenso não aparece', !ids.includes(bSus));

  const cardOk = (vit.body?.benefits ?? []).find((b) => b.id === bOk);
  check('cartão traz o destaque calculado no servidor',
    cardOk?.highlight === '20% de desconto', cardOk?.highlight);
  check('cartão informa que pode ser usado agora', cardOk?.available_now === true);
  check('estoque ilimitado devolve null, nunca zero', cardOk?.remaining === null, String(cardOk?.remaining));

  const cardDia = (vit.body?.benefits ?? []).find((b) => b.id === bDia);
  check('benefício fora do dia continua visível', !!cardDia);
  check('benefício fora do dia é marcado como indisponível agora',
    cardDia?.available_now === false, String(cardDia?.available_now));
  check('benefício fora do dia explica quando vale',
    /Válido apenas em/i.test(cardDia?.availability_note ?? ''), cardDia?.availability_note);

  const cardPrem = (vit.body?.benefits ?? []).find((b) => b.id === bPremium);
  check('benefício premium aparece marcado, não escondido', cardPrem?.premium_only === true);

  check('vitrine não expõe e-mail de ninguém', !JSON.stringify(vit.body).includes('@e2e.local'));
  check('vitrine não expõe id de usuário', !JSON.stringify(vit.body).includes(cliente.userId));

  // ── 2. Filtro geográfico e segmentação de campanha ─────────────────────
  const vitSoro = await ANON_C('GET', `/api/club/benefits?city=${encodeURIComponent(CIDADE)}`);
  check('filtro pela cidade da unidade encontra o benefício',
    (vitSoro.body?.benefits ?? []).some((b) => b.id === bOk));
  const unidades = (vitSoro.body?.benefits ?? []).find((b) => b.id === bOk)?.units ?? [];
  check('resultado traz a unidade participante', unidades.some((u) => u.id === uA));

  const vitOutra = await ANON_C('GET', '/api/club/benefits?city=Manaus');
  check('cidade sem unidade do parceiro não retorna o benefício',
    !(vitOutra.body?.benefits ?? []).some((b) => b.id === bOk));

  const campSoroRes = await ANON_C('GET', `/api/club/campaigns?city=${encodeURIComponent(CIDADE)}`);
  const campIdsSoro = (campSoroRes.body?.campaigns ?? []).map((c) => c.id);
  check('campanha segmentada para a cidade é entregue', campIdsSoro.includes(campSoro));
  check('campanha de outra cidade não é entregue', !campIdsSoro.includes(campManaus));

  // ── 3. Detalhe do benefício ────────────────────────────────────────────
  const det = await ANON_C('GET', `/api/club/benefits/${bOk}`);
  check('detalhe responde 200', det.status === 200);
  check('detalhe traz as unidades participantes',
    (det.body?.benefit?.units ?? []).some((u) => u.id === uA));
  check('detalhe sem sessão não traz contexto pessoal',
    det.body?.authenticated === false && det.body?.my_redemption === null);

  const detDraft = await ANON_C('GET', `/api/club/benefits/${bDraft}`);
  check('rascunho responde 404 no detalhe', detDraft.status === 404, `status ${detDraft.status}`);
  const detSus = await ANON_C('GET', `/api/club/benefits/${bSus}`);
  check('benefício de parceiro suspenso responde 404', detSus.status === 404, `status ${detSus.status}`);
  check('404 não revela que o benefício existe em outro estado',
    !JSON.stringify(detSus.body).includes('Empresa Suspensa'));

  // ── 4. Geração de código ───────────────────────────────────────────────
  const semLogin = await ANON_C('POST', '/api/club/redemptions', { benefit_id: bOk });
  check('resgate sem login responde 401', semLogin.status === 401, `status ${semLogin.status}`);
  check('resgate sem login orienta a entrar na conta',
    semLogin.body?.code === 'unauthenticated', semLogin.body?.code);

  const ger = await C('POST', '/api/club/redemptions', { benefit_id: bOk, unit_id: uA });
  check('geração de código responde 201', ger.status === 201, JSON.stringify(ger.body));
  const codigo = ger.body?.redemption?.code;
  check('código tem 8 caracteres', (codigo ?? '').length === 8, codigo);
  check('código usa apenas o alfabeto legível em maiúsculas',
    /^[23456789ABCDEFGHJKMNPQRTUVWXYZ]{8}$/.test(codigo ?? ''), codigo);
  check('código nasce pendente', ger.body?.redemption?.status === 'pending');
  const expira = new Date(ger.body?.redemption?.expires_at ?? 0).getTime();
  check('código expira em até 24h',
    expira > Date.now() && expira <= Date.now() + 24 * 3600 * 1000 + 60000,
    ger.body?.redemption?.expires_at);

  const usadoAposGerar = (await db.query('SELECT used_quantity FROM public.benefits WHERE id = $1', [bOk]))
    .rows[0].used_quantity;
  check('gerar código não consome estoque', usadoAposGerar === 0, String(usadoAposGerar));

  const denovo = await C('POST', '/api/club/redemptions', { benefit_id: bOk });
  check('segundo código do mesmo benefício é recusado', denovo.status === 409, `status ${denovo.status}`);
  check('recusa devolve o código que já existe',
    denovo.body?.code === 'already_has_code' && denovo.body?.redemption?.code === codigo,
    JSON.stringify(denovo.body));

  const dbPend = await db.query(
    `SELECT count(*)::int n FROM public.benefit_redemptions
     WHERE benefit_id = $1 AND user_id = $2 AND status = 'pending'`, [bOk, cliente.userId]
  );
  check('banco mantém um único código pendente por benefício', dbPend.rows[0].n === 1, String(dbPend.rows[0].n));

  const esgotado = await C('POST', '/api/club/redemptions', { benefit_id: bSold });
  check('benefício esgotado recusa resgate',
    esgotado.status === 409 && esgotado.body?.code === 'sold_out', JSON.stringify(esgotado.body));

  const encerrado = await C('POST', '/api/club/redemptions', { benefit_id: bEnded });
  check('benefício encerrado recusa resgate',
    encerrado.status === 409 && encerrado.body?.code === 'benefit_ended', JSON.stringify(encerrado.body));

  const rascunho = await C('POST', '/api/club/redemptions', { benefit_id: bDraft });
  check('rascunho recusa resgate',
    rascunho.status === 409 && rascunho.body?.code === 'unavailable', JSON.stringify(rascunho.body));

  const suspensa = await C('POST', '/api/club/redemptions', { benefit_id: bSus });
  check('benefício de parceiro suspenso recusa resgate',
    suspensa.status === 409 && suspensa.body?.code === 'unavailable', JSON.stringify(suspensa.body));

  const unidadeAlheia = await C('POST', '/api/club/redemptions', { benefit_id: bLimite, unit_id: uSus });
  check('unidade de outra empresa é recusada',
    unidadeAlheia.status === 400 && unidadeAlheia.body?.code === 'invalid_unit',
    JSON.stringify(unidadeAlheia.body));

  const inexistente = await C('POST', '/api/club/redemptions', {
    benefit_id: '00000000-0000-0000-0000-000000000000',
  });
  check('benefício inexistente responde 404', inexistente.status === 404, `status ${inexistente.status}`);

  // Premium: sem assinatura recusa; com assinatura ativa libera.
  const semPlano = await C('POST', '/api/club/redemptions', { benefit_id: bPremium });
  check('benefício premium recusa quem não assina',
    semPlano.status === 403 && semPlano.body?.code === 'premium_required', JSON.stringify(semPlano.body));

  await db.query(
    `INSERT INTO public.subscriptions (user_id, plan_id, status, next_billing_at)
     VALUES ($1, 'premium', 'active', now() + interval '30 days')`, [assinante.userId]
  );
  const comPlano = await PREM('POST', '/api/club/redemptions', { benefit_id: bPremium });
  check('assinante ativo resgata o benefício premium', comPlano.status === 201, JSON.stringify(comPlano.body));

  // Limite por pessoa: uma utilização já validada bloqueia a próxima.
  // Usamos o assinante e não o cliente: uma validação anterior no mesmo
  // parceiro faria o cliente deixar de ser "novo" no teste do ciclo completo.
  await db.query(
    `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, user_id, code, status, validated_at)
     VALUES ($1, $2, $3, $4, 'validated', now())`,
    [bLimite, pA, assinante.userId, `${TAG}LIM1`]
  );
  const noLimite = await PREM('POST', '/api/club/redemptions', { benefit_id: bLimite });
  check('limite por pessoa bloqueia novo resgate',
    noLimite.status === 409 && noLimite.body?.code === 'per_user_limit', JSON.stringify(noLimite.body));

  // ── 5. Meus códigos e cancelamento ─────────────────────────────────────
  const listaSemLogin = await ANON_C('GET', '/api/club/redemptions');
  check('lista de códigos exige sessão', listaSemLogin.status === 401, `status ${listaSemLogin.status}`);

  const lista = await C('GET', '/api/club/redemptions');
  check('lista de códigos responde 200', lista.status === 200);
  check('lista traz o código gerado',
    (lista.body?.redemptions ?? []).some((r) => r.code === codigo));
  check('lista conta os códigos ativos', lista.body?.active >= 1, String(lista.body?.active));
  check('lista traz o parceiro do código',
    (lista.body?.redemptions ?? []).some((r) => r.partner?.name === 'Cafeteria Clube'));

  const cancelAlheio = await PREM('DELETE', `/api/club/redemptions?id=${ger.body.redemption.id}`);
  check('ninguém cancela o código de outra pessoa', cancelAlheio.status === 404, `status ${cancelAlheio.status}`);

  // Cancela e prova que a trava de pendente único é liberada.
  const cancel = await C('DELETE', `/api/club/redemptions?id=${ger.body.redemption.id}`);
  check('usuário cancela o próprio código', cancel.status === 200, JSON.stringify(cancel.body));
  const regerado = await C('POST', '/api/club/redemptions', { benefit_id: bOk, unit_id: uA });
  check('após cancelar é possível gerar outro código', regerado.status === 201, JSON.stringify(regerado.body));
  const codigoFinal = regerado.body?.redemption?.code;
  check('o novo código é diferente do cancelado', codigoFinal !== codigo);

  // ── 6. Ciclo completo: usuário gera -> parceiro valida ─────────────────
  const usadoAntes = (await db.query('SELECT used_quantity FROM public.benefits WHERE id = $1', [bOk]))
    .rows[0].used_quantity;

  const validado = await LOJA('POST', '/api/partner/redemptions', {
    code: codigoFinal, purchase_value: 100,
  });
  check('parceiro valida o código gerado pelo aplicativo',
    validado.status === 200, JSON.stringify(validado.body));
  check('desconto de 20% é calculado no servidor',
    Number(validado.body?.redemption?.discount_applied) === 20,
    validado.body?.redemption?.discount_applied);
  check('cliente é registrado como novo para o parceiro',
    validado.body?.redemption?.is_new_customer === true);

  const usadoDepois = (await db.query('SELECT used_quantity FROM public.benefits WHERE id = $1', [bOk]))
    .rows[0].used_quantity;
  check('validação incrementa used_quantity pelo trigger',
    usadoDepois === usadoAntes + 1, `${usadoAntes} -> ${usadoDepois}`);

  const minhaLista = await C('GET', '/api/club/redemptions?status=validated');
  check('código validado aparece no histórico do usuário',
    (minhaLista.body?.redemptions ?? []).some((r) => r.code === codigoFinal && r.status === 'validated'));

  const codigoValidado = codigoFinal;
  const reValidar = await LOJA('POST', '/api/partner/redemptions', { code: codigoValidado });
  check('o mesmo código não é validado duas vezes', reValidar.status === 409, `status ${reValidar.status}`);

  const dash = await LOJA('GET', '/api/partner/dashboard');
  check('painel do parceiro registra a utilização',
    (dash.body?.kpis?.redemptions ?? 0) >= 1, JSON.stringify(dash.body?.kpis?.redemptions));

  // ── 7. Instrumentação de campanha ──────────────────────────────────────
  const eventoInvalido = await ANON_C('POST', '/api/club/track', {
    event: 'compra', campaign_id: campSoro,
  });
  check('evento desconhecido é recusado', eventoInvalido.status === 400, `status ${eventoInvalido.status}`);

  const semCampanha = await ANON_C('POST', '/api/club/track', { event: 'impression' });
  check('rastreamento sem campanha é recusado', semCampanha.status === 400, `status ${semCampanha.status}`);

  const forjado = await ANON_C('POST', '/api/club/track', {
    event: 'impression', campaign_id: '00000000-0000-0000-0000-000000000000',
  });
  check('campanha inexistente não gera métrica', forjado.body?.tracked === 0, JSON.stringify(forjado.body));

  const imp1 = await ANON_C('POST', '/api/club/track', { event: 'impression', campaign_ids: [campSoro] });
  check('impressão é contabilizada', imp1.status === 200 && imp1.body?.tracked === 1, JSON.stringify(imp1.body));
  await ANON_C('POST', '/api/club/track', { event: 'impression', campaign_ids: [campSoro] });
  const clk = await ANON_C('POST', '/api/club/track', { event: 'click', campaign_id: campSoro });
  check('clique é contabilizado', clk.body?.tracked === 1, JSON.stringify(clk.body));

  const met = await db.query(
    `SELECT impressions, clicks FROM public.campaign_metrics
     WHERE campaign_id = $1 AND metric_date = current_date`, [campSoro]
  );
  check('métricas do dia foram agregadas em uma única linha', met.rows.length === 1, String(met.rows.length));
  check('duas impressões foram somadas', met.rows[0]?.impressions === 2, String(met.rows[0]?.impressions));
  check('um clique foi somado', met.rows[0]?.clicks === 1, String(met.rows[0]?.clicks));
  check('rastreamento não guarda identificador de pessoa',
    !JSON.stringify(imp1.body).includes(cliente.userId));

  const adminToken = await login('admin@compreouvenda.com', '5AA$eA%VmM?-5bB2Z566');
  const ADM = client(adminToken);

  const dashDepois = await LOJA('GET', '/api/partner/dashboard');
  check('CTR do parceiro deixa de ser null após a instrumentação',
    dashDepois.body?.kpis?.ctr !== null && dashDepois.body?.kpis?.ctr !== undefined,
    String(dashDepois.body?.kpis?.ctr));

  const metrics = await ADM('GET', `/api/admin/club-metrics?partner_id=${pA}`);
  check('métricas do clube respondem 200 para o admin', metrics.status === 200);
  check('utilização gerada pelo app aparece nos KPIs do admin',
    (metrics.body?.kpis?.redemptions ?? 0) >= 1, String(metrics.body?.kpis?.redemptions));
  check('cliente novo é contabilizado no admin',
    (metrics.body?.kpis?.new_customers ?? 0) >= 1, String(metrics.body?.kpis?.new_customers));
  check('impressões deixam de ser null no admin',
    metrics.body?.kpis?.impressions !== null && metrics.body?.kpis?.impressions >= 2,
    String(metrics.body?.kpis?.impressions));

  const minhaCamp = (metrics.body?.top_campaigns ?? []).find((c) => c.id === campSoro);
  check('campanha instrumentada aparece no ranking do admin', !!minhaCamp);
  check('CTR da campanha deixa de ser null',
    minhaCamp?.ctr !== null && minhaCamp?.ctr !== undefined, String(minhaCamp?.ctr));
  check('CTR é calculado corretamente (1 clique / 2 impressões)',
    Number(minhaCamp?.ctr) === 50, String(minhaCamp?.ctr));

  // ── 8. LGPD ────────────────────────────────────────────────────────────
  const balcao = await LOJA('GET', '/api/partner/redemptions');
  check('histórico do balcão não expõe id do usuário',
    !JSON.stringify(balcao.body).includes(cliente.userId));
  check('histórico do balcão não expõe e-mail do cliente',
    !JSON.stringify(balcao.body).includes('@e2e.local'));

  // ── Limpeza ────────────────────────────────────────────────────────────
  await cleanup();
  const left = await db.query(`SELECT count(*)::int n FROM public.partners WHERE tax_id LIKE $1`, [`${TAG}%`]);
  check('dados de teste removidos ao final', left.rows[0].n === 0, `${left.rows[0].n} restantes`);
  const orfaos = await db.query(
    `SELECT count(*)::int n FROM public.benefit_redemptions WHERE code = ANY($1::text[])`,
    [[codigo, codigoFinal, `${TAG}LIM1`].filter(Boolean)]
  );
  check('cascata de FK removeu os códigos de teste', orfaos.rows[0].n === 0, `${orfaos.rows[0].n} restantes`);

  await db.end();
  console.log(out.join('\n'));
  console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FAIL (${pass + fail} testes) ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => {
  console.log(out.join('\n'));
  console.error('ERRO FATAL:', e);
  try { await cleanup(); await db.end(); } catch { /* já encerrado */ }
  process.exit(1);
});
