/**
 * E2E Fase 4 — Portal do Parceiro (/parceiro).
 *
 * Monta um cenário real no banco com DUAS empresas parceiras e valida que
 * cada parceiro só enxerga e opera os próprios dados. É o teste mais
 * importante do portal: vazamento entre parceiros seria uma falha grave.
 *
 * Cobre:
 *   1. proteção das rotas sem sessão
 *   2. usuário sem vínculo é rejeitado
 *   3. dashboard restrito à própria empresa
 *   4. isolamento: parceiro A não lê/edita nada do parceiro B
 *   5. hierarquia owner > manager > operator
 *   6. empresa não aprovada fica em modo somente leitura
 *   7. parceiro não consegue autoaprovar benefício/campanha
 *   8. edição de benefício aprovado volta para análise
 *   9. validação de benefício no balcão: caminho feliz e todas as recusas
 *  10. trigger de used_quantity dispara pela rota do parceiro
 *  11. LGPD: histórico não expõe identificador do usuário
 *  12. reflexo no painel administrativo (fluxo integrado)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BASE = process.env.E2E_BASE || 'http://localhost:3200';
const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = pick('NEXT_PUBLIC_SUPABASE_URL');
const ANON = pick('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = pick('SUPABASE_SERVICE_ROLE_KEY');

const TAG = 'E2E-P4';
const PASSWORD = 'E2eParceiro#2024';

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

/**
 * Remove o usuário do Auth e do schema público.
 * A Admin API às vezes recusa a exclusão quando há referências; por isso
 * caímos para o DELETE direto, que respeita as FKs em cascata.
 */
async function dropUser(email) {
  // O Supabase normaliza o e-mail para minúsculas ao gravar em auth.users,
  // então a busca precisa ser case-insensitive para encontrar o resíduo.
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

/** Cria (ou recria) um usuário no Auth + public.users e devolve os dois ids. */
async function makeUser(email, name) {
  await dropUser(email);

  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  }).then((r) => r.json());

  if (!created.id) throw new Error(`Falha ao criar ${email}: ${JSON.stringify(created)}`);

  // O projeto tem um trigger que cria o perfil em public.users junto com o
  // registro no Auth. Reaproveitamos a linha criada em vez de inserir outra.
  let r = await db.query(`SELECT id FROM public.users WHERE auth_id = $1`, [created.id]);
  if (!r.rows.length) {
    r = await db.query(
      `INSERT INTO public.users (auth_id, email, name, type)
       VALUES ($1, $2, $3, 'buyer') RETURNING id`,
      [created.id, email, name]
    );
  } else {
    await db.query(`UPDATE public.users SET name = $2 WHERE id = $1`, [r.rows[0].id, name]);
  }
  return { authId: created.id, userId: r.rows[0].id, email };
}

async function login(email) {
  const j = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  }).then((r) => r.json());
  if (!j.access_token) throw new Error(`Login falhou (${email}): ${JSON.stringify(j)}`);
  return j.access_token;
}

const client = (token) => async (method, p, body) => {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, body: json };
};

async function cleanup() {
  // A cascata das FKs remove unidades, benefícios, campanhas e validações.
  await db.query(`DELETE FROM public.partners WHERE tax_id LIKE $1`, [`${TAG}%`]);
  for (const email of [
    `${TAG}-owner@e2e.local`, `${TAG}-operator@e2e.local`,
    `${TAG}-outro@e2e.local`, `${TAG}-semvinculo@e2e.local`,
  ]) {
    await dropUser(email);
  }
}

(async () => {
  console.log('\n=== E2E FASE 4 — Portal do Parceiro ===\n');
  await db.connect();
  await cleanup();

  // ── Cenário ────────────────────────────────────────────────────────────
  const owner = await makeUser(`${TAG}-owner@e2e.local`, 'Dono E2E');
  const operator = await makeUser(`${TAG}-operator@e2e.local`, 'Operador E2E');
  const outro = await makeUser(`${TAG}-outro@e2e.local`, 'Dono Concorrente');
  const semVinculo = await makeUser(`${TAG}-semvinculo@e2e.local`, 'Usuario Comum');

  // Empresa A — aprovada. Empresa B — também aprovada, para testar isolamento.
  const pA = (await db.query(
    `INSERT INTO public.partners (legal_name, trade_name, tax_id, category, status, owner_id)
     VALUES ('Empresa A E2E LTDA', 'Empresa A', $1, 'gastronomia', 'approved', $2) RETURNING id`,
    [`${TAG}-A`, owner.userId]
  )).rows[0].id;

  const pB = (await db.query(
    `INSERT INTO public.partners (legal_name, trade_name, tax_id, category, status, owner_id)
     VALUES ('Empresa B E2E LTDA', 'Empresa B', $1, 'moda', 'approved', $2) RETURNING id`,
    [`${TAG}-B`, outro.userId]
  )).rows[0].id;

  // Empresa C — pendente, mesmo dono do operador, para o teste de modo leitura.
  const pC = (await db.query(
    `INSERT INTO public.partners (legal_name, trade_name, tax_id, category, status)
     VALUES ('Empresa C E2E LTDA', 'Empresa C', $1, 'servicos', 'pending') RETURNING id`,
    [`${TAG}-C`]
  )).rows[0].id;

  const uA = (await db.query(
    `INSERT INTO public.partner_units (partner_id, name, city, state)
     VALUES ($1, 'Unidade Centro', 'São Paulo', 'SP') RETURNING id`, [pA]
  )).rows[0].id;

  await db.query(
    `INSERT INTO public.partner_members (partner_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [pA, owner.userId]
  );
  await db.query(
    `INSERT INTO public.partner_members (partner_id, user_id, unit_id, role) VALUES ($1, $2, $3, 'operator')`,
    [pA, operator.userId, uA]
  );
  await db.query(
    `INSERT INTO public.partner_members (partner_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [pB, outro.userId]
  );

  // Benefício aprovado da empresa A, com um código pendente para validar.
  const bA = (await db.query(
    `INSERT INTO public.benefits (partner_id, title, benefit_type, discount_percent, status, min_purchase_value)
     VALUES ($1, 'Almoço 20% OFF', 'percent_discount', 20, 'approved', 50) RETURNING id`,
    [pA]
  )).rows[0].id;

  // Benefício da empresa B — alvo das tentativas de acesso indevido.
  const bB = (await db.query(
    `INSERT INTO public.benefits (partner_id, title, benefit_type, discount_percent, status)
     VALUES ($1, 'Segredo da Empresa B', 'percent_discount', 50, 'approved') RETURNING id`,
    [pB]
  )).rows[0].id;

  const codeOk = `${TAG}-OK1`;
  await db.query(
    `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, unit_id, user_id, code, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [bA, pA, uA, semVinculo.userId, codeOk]
  );
  const codeUsed = `${TAG}-USED`;
  await db.query(
    `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, code, status, validated_at)
     VALUES ($1, $2, $3, 'validated', now())`,
    [bA, pA, codeUsed]
  );
  const codeB = `${TAG}-DAB`;
  await db.query(
    `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, code, status)
     VALUES ($1, $2, $3, 'pending')`,
    [bB, pB, codeB]
  );
  const codeExp = `${TAG}-EXP`;
  await db.query(
    `INSERT INTO public.benefit_redemptions (benefit_id, partner_id, code, status, expires_at)
     VALUES ($1, $2, $3, 'pending', now() - interval '1 day')`,
    [bA, pA, codeExp]
  );

  // ── 1. Proteção sem sessão ─────────────────────────────────────────────
  for (const p of ['/api/partner/dashboard', '/api/partner/benefits', '/api/partner/campaigns',
    '/api/partner/units', '/api/partner/redemptions']) {
    const r = await fetch(`${BASE}${p}`);
    check(`${p} bloqueia acesso sem sessão`, r.status === 401, `status ${r.status}`);
  }

  // ── 2. Usuário sem vínculo ─────────────────────────────────────────────
  const semToken = await login(semVinculo.email);
  const sem = client(semToken);
  const semRes = await sem('GET', '/api/partner/dashboard');
  check('usuário sem vínculo recebe 403', semRes.status === 403, `status ${semRes.status}`);
  check('mensagem explica a ausência de vínculo',
    /não está vinculada/i.test(semRes.body?.error ?? ''), semRes.body?.error);

  const semPost = await sem('POST', '/api/partner/benefits', { title: 'Invasao' });
  check('usuário sem vínculo não cria benefício', semPost.status === 403);

  // ── 3. Dashboard da empresa A ──────────────────────────────────────────
  const ownerToken = await login(owner.email);
  const A = client(ownerToken);

  const dash = await A('GET', '/api/partner/dashboard');
  check('owner acessa o dashboard', dash.status === 200, `status ${dash.status}`);
  check('dashboard traz a própria empresa', dash.body?.partner?.id === pA);
  check('empresa aprovada libera gestão', dash.body?.canManage === true);
  check('KPI de unidades reflete o cadastro', dash.body?.kpis?.units === 1, String(dash.body?.kpis?.units));
  check('KPI de benefícios ativos reflete o cadastro', dash.body?.kpis?.activeBenefits === 1);
  check('sem campanhas medidas, impressões vêm como null (não zero)',
    dash.body?.kpis?.impressions === null, String(dash.body?.kpis?.impressions));
  check('dashboard não expõe dados de outra empresa',
    JSON.stringify(dash.body).includes('Empresa B') === false);

  // ── 4. Isolamento entre parceiros ──────────────────────────────────────
  const listA = await A('GET', '/api/partner/benefits');
  check('listagem retorna apenas benefícios da própria empresa',
    listA.body?.benefits?.every((b) => b.partner_id === pA), 'vazou benefício de outro parceiro');
  check('benefício da empresa B não aparece na lista da A',
    !listA.body?.benefits?.some((b) => b.id === bB));

  const stealPatch = await A('PATCH', '/api/partner/benefits', { id: bB, title: 'Invadido' });
  check('parceiro A não edita benefício da empresa B', stealPatch.status === 404, `status ${stealPatch.status}`);

  const bBrow = await db.query('SELECT title FROM public.benefits WHERE id = $1', [bB]);
  check('título do benefício da empresa B permaneceu intacto',
    bBrow.rows[0].title === 'Segredo da Empresa B', bBrow.rows[0].title);

  const stealUnit = await A('PATCH', '/api/partner/units', { id: uA, name: 'ok' });
  check('parceiro edita a própria unidade normalmente', stealUnit.status === 200);

  // Forjar partner_id no corpo não deve mudar a empresa de destino.
  const forge = await A('POST', '/api/partner/benefits', {
    title: 'Tentativa de forjar dono', discount_percent: 10, partner_id: pB,
  });
  check('POST aceita a criação (partner_id do corpo é ignorado)', forge.status === 201, `status ${forge.status}`);
  check('benefício criado pertence à empresa autenticada, não à forjada',
    forge.body?.benefit?.partner_id === pA, forge.body?.benefit?.partner_id);

  // ── 5. Hierarquia de papéis ────────────────────────────────────────────
  const opToken = await login(operator.email);
  const OP = client(opToken);

  const opDash = await OP('GET', '/api/partner/dashboard');
  check('operador acessa o dashboard', opDash.status === 200);
  check('operador não recebe permissão de gestão', opDash.body?.canManage === false);

  const opCreate = await OP('POST', '/api/partner/benefits', { title: 'Operador criando', discount_percent: 5 });
  check('operador não cria benefício', opCreate.status === 403, `status ${opCreate.status}`);
  check('mensagem cita o perfil do membro', /perfil na empresa/i.test(opCreate.body?.error ?? ''));

  const opUnit = await OP('POST', '/api/partner/units', { name: 'X', city: 'Y', state: 'SP' });
  check('operador não cadastra unidade', opUnit.status === 403);

  const opList = await OP('GET', '/api/partner/redemptions');
  check('operador consulta validações', opList.status === 200);
  check('operador fica restrito à própria unidade', opList.body?.scopedToUnit === uA, opList.body?.scopedToUnit);

  // ── 6. Empresa não aprovada = modo leitura ─────────────────────────────
  await db.query(`DELETE FROM public.partner_members WHERE partner_id = $1`, [pB]);
  await db.query(
    `INSERT INTO public.partner_members (partner_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [pC, outro.userId]
  );
  const outroToken = await login(outro.email);
  const C = client(outroToken);

  const cDash = await C('GET', '/api/partner/dashboard');
  check('empresa em análise ainda acessa o dashboard', cDash.status === 200, `status ${cDash.status}`);
  check('empresa em análise não recebe permissão de gestão', cDash.body?.canManage === false);
  check('empresa em análise recebe alerta explicativo',
    (cDash.body?.alerts ?? []).some((a) => /análise/i.test(a.message)));
  check('empresa sem unidade é alertada',
    (cDash.body?.alerts ?? []).some((a) => /unidade/i.test(a.message)));

  const cCreate = await C('POST', '/api/partner/benefits', { title: 'Antes da aprovação', discount_percent: 10 });
  check('empresa não aprovada não cria benefício', cCreate.status === 403, `status ${cCreate.status}`);
  check('mensagem informa o status da empresa', cCreate.body?.partnerStatus === 'pending', cCreate.body?.partnerStatus);

  const cList = await C('GET', '/api/partner/benefits');
  check('empresa não aprovada mantém acesso de leitura', cList.status === 200);

  // ── 7. Parceiro não pode autoaprovar ───────────────────────────────────
  const newBenefit = forge.body.benefit.id;
  const selfApprove = await A('PATCH', '/api/partner/benefits', { id: newBenefit, status: 'approved' });
  check('parceiro não aprova o próprio benefício', selfApprove.status === 403, `status ${selfApprove.status}`);
  check('mensagem indica que a aprovação é da equipe',
    /COMPREOUVENDA/i.test(selfApprove.body?.error ?? ''), selfApprove.body?.error);

  const camp = await A('POST', '/api/partner/campaigns', { title: 'Campanha E2E', submit: true });
  check('parceiro cria campanha e ela nasce em análise',
    camp.status === 201 && camp.body?.campaign?.status === 'pending', camp.body?.campaign?.status);

  const selfActivate = await A('PATCH', '/api/partner/campaigns', { id: camp.body.campaign.id, status: 'active' });
  check('parceiro não ativa a própria campanha', selfActivate.status === 403, `status ${selfActivate.status}`);

  const stealCampaign = await A('POST', '/api/partner/campaigns', {
    title: 'Campanha usando benefício alheio', benefit_id: bB,
  });
  check('campanha não pode apontar para benefício de outra empresa',
    stealCampaign.status === 400, `status ${stealCampaign.status}`);

  // ── 8. Editar benefício aprovado devolve para análise ──────────────────
  const editApproved = await A('PATCH', '/api/partner/benefits', { id: bA, description: 'Nova descrição' });
  check('edição de benefício aprovado é aceita', editApproved.status === 200, `status ${editApproved.status}`);
  check('benefício aprovado volta para análise ao ser editado',
    editApproved.body?.benefit?.status === 'pending', editApproved.body?.benefit?.status);
  check('resposta explica o retorno para análise',
    /nova análise/i.test(editApproved.body?.message ?? ''), editApproved.body?.message);

  // Restaura para os testes de validação no balcão.
  await db.query(`UPDATE public.benefits SET status = 'approved' WHERE id = $1`, [bA]);

  // ── 9. Validação no balcão ─────────────────────────────────────────────
  const notFound = await A('POST', '/api/partner/redemptions', { code: 'NAO-EXISTE-123' });
  check('código inexistente retorna 404', notFound.status === 404, `status ${notFound.status}`);

  const wrongPartner = await A('POST', '/api/partner/redemptions', { code: codeB });
  check('código de outra empresa é recusado', wrongPartner.status === 403, `status ${wrongPartner.status}`);
  check('recusa não revela a empresa dona do código',
    !JSON.stringify(wrongPartner.body).includes('Empresa B'));

  const alreadyUsed = await A('POST', '/api/partner/redemptions', { code: codeUsed });
  check('código já validado retorna 409', alreadyUsed.status === 409, `status ${alreadyUsed.status}`);
  check('resposta identifica o motivo "já utilizado"', alreadyUsed.body?.code === 'already_used');

  const expired = await A('POST', '/api/partner/redemptions', { code: codeExp });
  check('código expirado é recusado', expired.status === 409 && expired.body?.code === 'expired',
    JSON.stringify(expired.body));
  const expRow = await db.query('SELECT status FROM public.benefit_redemptions WHERE code = $1', [codeExp]);
  check('código expirado é marcado como expired no banco',
    expRow.rows[0].status === 'expired', expRow.rows[0].status);

  const belowMin = await A('POST', '/api/partner/redemptions', { code: codeOk, purchase_value: 10 });
  check('compra abaixo do mínimo é recusada',
    belowMin.status === 409 && belowMin.body?.code === 'below_minimum', JSON.stringify(belowMin.body));

  const usedBefore = (await db.query('SELECT used_quantity FROM public.benefits WHERE id = $1', [bA]))
    .rows[0].used_quantity;

  const ok = await A('POST', '/api/partner/redemptions', { code: codeOk, purchase_value: 100 });
  check('validação bem-sucedida retorna 200', ok.status === 200, JSON.stringify(ok.body));
  check('desconto é calculado no servidor (20% de 100)',
    Number(ok.body?.redemption?.discount_applied) === 20, ok.body?.redemption?.discount_applied);
  check('cliente é marcado como novo na primeira visita',
    ok.body?.redemption?.is_new_customer === true);
  check('mensagem destaca o cliente novo',
    /cliente novo/i.test(ok.body?.message ?? ''), ok.body?.message);
  check('resposta traz apenas o primeiro nome do cliente',
    ok.body?.customerFirstName === 'Usuario', ok.body?.customerFirstName);
  check('resposta não expõe e-mail do cliente',
    !JSON.stringify(ok.body).includes('@e2e.local'));

  // ── 10. Trigger de consumo ─────────────────────────────────────────────
  const usedAfter = (await db.query('SELECT used_quantity FROM public.benefits WHERE id = $1', [bA]))
    .rows[0].used_quantity;
  check('trigger incrementou used_quantity ao validar',
    usedAfter === usedBefore + 1, `${usedBefore} -> ${usedAfter}`);

  const twice = await A('POST', '/api/partner/redemptions', { code: codeOk, purchase_value: 100 });
  check('o mesmo código não pode ser validado duas vezes', twice.status === 409, `status ${twice.status}`);

  // ── 11. LGPD no histórico ──────────────────────────────────────────────
  const hist = await A('GET', '/api/partner/redemptions');
  check('histórico responde 200', hist.status === 200);
  const raw = JSON.stringify(hist.body);
  check('histórico não expõe user_id', !raw.includes(semVinculo.userId));
  check('histórico não expõe e-mail do cliente', !raw.includes('@e2e.local'));
  check('histórico não expõe nome do cliente', !raw.includes('Usuario Comum'));
  check('histórico indica apenas se houve usuário vinculado',
    hist.body?.redemptions?.some((r) => r.has_user === true));
  check('contagem de validações confirmadas está correta',
    hist.body?.counts?.validated >= 2, String(hist.body?.counts?.validated));

  // ── 12. Fluxo integrado com o painel administrativo ────────────────────
  const adminToken = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@compreouvenda.com', password: '5AA$eA%VmM?-5bB2Z566' }),
  }).then((r) => r.json()).then((j) => j.access_token);
  const ADM = client(adminToken);

  // O benefício foi criado como rascunho; o parceiro precisa enviá-lo para
  // análise antes de ele aparecer na fila do administrador.
  const submitted = await A('PATCH', '/api/partner/benefits', { id: newBenefit, status: 'pending' });
  check('parceiro envia o rascunho para análise',
    submitted.status === 200 && submitted.body?.benefit?.status === 'pending',
    submitted.body?.benefit?.status);

  const admBenefits = await ADM('GET', '/api/admin/benefits?status=pending');
  check('benefício enviado pelo parceiro aparece na fila do admin',
    admBenefits.body?.benefits?.some((b) => b.id === newBenefit), 'não encontrado na fila');

  const admCampaigns = await ADM('GET', '/api/admin/campaigns?status=pending');
  check('campanha enviada pelo parceiro aparece na fila do admin',
    admCampaigns.body?.campaigns?.some((c) => c.id === camp.body.campaign.id));

  // O painel administrativo trabalha por ação (approve/reject/pause/resume),
  // não por status cru — é o contrato já existente da Fase 2.
  const approve = await ADM('PATCH', '/api/admin/benefits', { id: newBenefit, action: 'approve' });
  check('admin aprova o benefício do parceiro', approve.status === 200, JSON.stringify(approve.body));

  const afterApprove = await A('GET', '/api/partner/benefits?status=approved');
  check('benefício aprovado pelo admin aparece como "no ar" para o parceiro',
    afterApprove.body?.benefits?.some((b) => b.id === newBenefit));

  const admStats = await ADM('GET', '/api/admin/stats');
  check('validação do parceiro alimenta os KPIs do admin',
    admStats.body?.club?.redemptions >= 2, String(admStats.body?.club?.redemptions));
  check('cliente novo do parceiro é contabilizado no admin',
    admStats.body?.club?.newCustomers >= 1, String(admStats.body?.club?.newCustomers));

  const admPartner = await ADM('GET', `/api/admin/partners/${pA}`);
  check('visão 360° do admin enxerga a operação do parceiro', admPartner.status === 200);
  check('visão 360° lista as validações registradas pelo portal',
    (admPartner.body?.redemptions?.length ?? 0) >= 2, String(admPartner.body?.redemptions?.length));

  // ── Limpeza ────────────────────────────────────────────────────────────
  await cleanup();
  const left = await db.query(`SELECT count(*)::int n FROM public.partners WHERE tax_id LIKE $1`, [`${TAG}%`]);
  check('dados de teste removidos ao final', left.rows[0].n === 0, `${left.rows[0].n} restantes`);
  const orphan = await db.query(
    `SELECT count(*)::int n FROM public.benefit_redemptions WHERE code LIKE $1`, [`${TAG}%`]
  );
  check('cascata de FK removeu as validações de teste', orphan.rows[0].n === 0, `${orphan.rows[0].n} restantes`);

  await db.end();
  console.log(out.join('\n'));
  console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FAIL (${pass + fail} testes) ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => {
  console.error('ERRO FATAL:', e);
  try { await cleanup(); await db.end(); } catch { /* já encerrado */ }
  process.exit(1);
});
