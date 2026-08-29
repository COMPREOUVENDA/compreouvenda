/**
 * E2E — Gestão de acesso ao Portal do Parceiro pelo painel administrativo.
 *
 * Valida o ciclo completo de concessão, alteração e revogação de acesso, e
 * as travas que impedem estados inconsistentes:
 *   - empresa aprovada sem ninguém que consiga entrar no portal
 *   - empresa sem nenhum responsável ativo
 *   - uma conta operando duas empresas ao mesmo tempo
 *
 * Também confirma o efeito prático: assim que o admin concede o acesso, a
 * conta passa a abrir /api/partner/dashboard; ao revogar, deixa de abrir.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BASE = process.env.E2E_BASE || 'http://localhost:3400';
const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = pick('NEXT_PUBLIC_SUPABASE_URL');
const ANON = pick('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = pick('SUPABASE_SERVICE_ROLE_KEY');

const TAG = 'E2E-ACC';
const PASSWORD = 'E2eAcesso#2024';
// CNPJs válidos exclusivos deste teste (não colidem com o seed de demonstração).
const CNPJ_1 = '22333444000181';
const CNPJ_2 = '33444555000181';

// e-mails sao normalizados para minusculas pelo Supabase
const byEmail = (arr, email) => (arr || []).find((m) => (m.user?.email || '').toLowerCase() === email.toLowerCase());

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
  return { userId: r.rows[0].id, email };
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

const client = (token) => async (method, p, body) => {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, body: json };
};

async function cleanup() {
  await db.query(
    `DELETE FROM public.partners WHERE tax_id LIKE $1 OR tax_id = ANY($2::text[])`,
    [`${TAG}%`, [CNPJ_1, CNPJ_2]]
  );
  for (const e of [`${TAG}-dono@e2e.local`, `${TAG}-gerente@e2e.local`,
    `${TAG}-caixa@e2e.local`, `${TAG}-fora@e2e.local`]) {
    await dropUser(e);
  }
}

(async () => {
  console.log('\n=== E2E — Gestão de acesso ao Portal do Parceiro ===\n');
  await db.connect();
  await cleanup();

  const dono = await makeUser(`${TAG}-dono@e2e.local`, 'Dono Acesso');
  const gerente = await makeUser(`${TAG}-gerente@e2e.local`, 'Gerente Acesso');
  const caixa = await makeUser(`${TAG}-caixa@e2e.local`, 'Caixa Acesso');
  const fora = await makeUser(`${TAG}-fora@e2e.local`, 'Sem Acesso');

  const adminToken = await login('admin@compreouvenda.com', '5AA$eA%VmM?-5bB2Z566');
  const ADM = client(adminToken);

  // ── 1. Cadastro com responsável já vinculado ───────────────────────────
  const created = await ADM('POST', '/api/admin/partners', {
    legal_name: 'Empresa Acesso E2E LTDA',
    trade_name: 'Empresa Acesso',
    tax_id: CNPJ_1,
    category: 'gastronomia',
    owner_email: dono.email,
  });
  check('cadastro com owner_email cria o parceiro', created.status === 201, JSON.stringify(created.body));
  check('resposta confirma o acesso concedido',
    /acesso ao Portal/i.test(created.body?.message ?? ''), created.body?.message);

  const partnerId = created.body?.partner?.id;
  if (!partnerId) throw new Error(`Cadastro não devolveu id: ${JSON.stringify(created)}`);
  await db.query(`UPDATE public.partners SET tax_id = $2 WHERE id = $1`, [partnerId, `${TAG}-1`]);

  const linked = await db.query(
    `SELECT role, is_active FROM public.partner_members WHERE partner_id = $1 AND user_id = $2`,
    [partnerId, dono.userId]
  );
  check('vínculo em partner_members foi criado no cadastro', linked.rowCount === 1);
  check('vínculo nasce como responsável ativo',
    linked.rows[0]?.role === 'owner' && linked.rows[0]?.is_active === true,
    JSON.stringify(linked.rows[0]));

  // ── 2. Cadastro sem responsável avisa o administrador ──────────────────
  const created2 = await ADM('POST', '/api/admin/partners', {
    legal_name: 'Empresa Sem Dono E2E LTDA',
    trade_name: 'Empresa Sem Dono',
    tax_id: CNPJ_2,
    category: 'moda',
  });
  check('cadastro sem owner_email é aceito', created2.status === 201, JSON.stringify(created2.body));
  check('resposta avisa que ninguém tem acesso ao portal',
    /Nenhuma conta tem acesso/i.test(created2.body?.message ?? ''), created2.body?.message);
  const partner2 = created2.body?.partner?.id;
  if (!partner2) throw new Error(`Cadastro 2 não devolveu id: ${JSON.stringify(created2)}`);
  await db.query(`UPDATE public.partners SET tax_id = $2 WHERE id = $1`, [partner2, `${TAG}-2`]);

  // ── 3. E-mail inexistente é recusado com orientação ────────────────────
  const ghost = await ADM('POST', `/api/admin/partners/${partnerId}/members`, {
    email: 'nao-existe-mesmo@e2e.local', role: 'manager',
  });
  check('e-mail sem conta é recusado', ghost.status === 404, `status ${ghost.status}`);
  check('mensagem orienta a pessoa a se cadastrar antes',
    /precisa se cadastrar/i.test(ghost.body?.error ?? ''), ghost.body?.error);

  // ── 4. Conceder acesso a gerente e operador ────────────────────────────
  const units = await db.query(
    `INSERT INTO public.partner_units (partner_id, name, city, state)
     VALUES ($1, 'Unidade Centro', 'São Paulo', 'SP') RETURNING id`, [partnerId]
  );
  const unitId = units.rows[0].id;

  const grantManager = await ADM('POST', `/api/admin/partners/${partnerId}/members`, {
    email: gerente.email, role: 'manager',
  });
  check('admin concede acesso de gerente', grantManager.status === 201, JSON.stringify(grantManager.body));
  check('mensagem nomeia a pessoa e o papel',
    /Gerente Acesso.*Gerente/i.test(grantManager.body?.message ?? ''), grantManager.body?.message);

  const grantOperator = await ADM('POST', `/api/admin/partners/${partnerId}/members`, {
    email: caixa.email, role: 'operator', unit_id: unitId,
  });
  check('admin concede acesso de operador restrito à unidade', grantOperator.status === 201);
  check('unidade é gravada no vínculo do operador',
    grantOperator.body?.member?.unit_id === unitId, grantOperator.body?.member?.unit_id);

  const badUnit = await ADM('POST', `/api/admin/partners/${partner2}/members`, {
    email: fora.email, role: 'operator', unit_id: unitId,
  });
  check('unidade de outra empresa é recusada', badUnit.status === 400, `status ${badUnit.status}`);

  // ── 5. Uma conta não opera duas empresas ───────────────────────────────
  const doubleLink = await ADM('POST', `/api/admin/partners/${partner2}/members`, {
    email: gerente.email, role: 'owner',
  });
  check('conta já vinculada a outra empresa é recusada', doubleLink.status === 409, `status ${doubleLink.status}`);
  check('mensagem nomeia a empresa do vínculo anterior',
    /Empresa Acesso/i.test(doubleLink.body?.error ?? ''), doubleLink.body?.error);

  // ── 6. Efeito prático: o portal abre ───────────────────────────────────
  const gerenteToken = await login(gerente.email);
  const G = client(gerenteToken);

  const gDash = await G('GET', '/api/partner/dashboard');
  check('gerente acessa o portal após a concessão', gDash.status === 200, `status ${gDash.status}`);
  check('portal mostra a empresa correta', gDash.body?.partner?.id === partnerId);

  const foraToken = await login(fora.email);
  const semAcesso = await client(foraToken)('GET', '/api/partner/dashboard');
  check('conta sem vínculo continua bloqueada', semAcesso.status === 403, `status ${semAcesso.status}`);

  // ── 7. Listagem e avisos ───────────────────────────────────────────────
  const list = await ADM('GET', `/api/admin/partners/${partnerId}/members`);
  check('listagem responde 200', list.status === 200);
  check('listagem traz os 3 acessos concedidos', list.body?.members?.length === 3,
    String(list.body?.members?.length));
  check('responsável de registro é sinalizado',
    list.body?.members?.some((m) => m.is_owner_of_record), 'nenhum marcado');
  check('papéis vêm traduzidos para exibição',
    list.body?.members?.some((m) => m.role_label === 'Gerente'));
  check('unidade do operador aparece pelo nome',
    list.body?.members?.some((m) => m.unit_name === 'Unidade Centro'));
  check('empresa com acesso completo não gera aviso',
    (list.body?.warnings ?? []).length === 0, JSON.stringify(list.body?.warnings));

  const list2 = await ADM('GET', `/api/admin/partners/${partner2}/members`);
  check('empresa sem ninguém vinculado gera aviso',
    (list2.body?.warnings ?? []).some((w) => /Nenhuma conta tem acesso/i.test(w)),
    JSON.stringify(list2.body?.warnings));

  // ── 8. Alteração de papel e unidade ────────────────────────────────────
  const managerId = byEmail(list.body.members, gerente.email).id;

  const toOperator = await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: managerId, role: 'operator', unit_id: unitId,
  });
  check('admin rebaixa gerente para operador', toOperator.status === 200, JSON.stringify(toOperator.body));

  const afterDemote = await G('POST', '/api/partner/benefits', { title: 'Teste', discount_percent: 10 });
  check('a mudança de papel tem efeito imediato no portal', afterDemote.status === 403,
    `status ${afterDemote.status}`);

  await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: managerId, role: 'manager', unit_id: null,
  });
  const afterPromote = await G('GET', '/api/partner/benefits');
  check('promover de volta restaura o acesso', afterPromote.status === 200);

  const badRole = await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: managerId, role: 'superuser',
  });
  check('papel inválido é recusado', badRole.status === 400, `status ${badRole.status}`);

  const noChange = await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: managerId,
  });
  check('PATCH sem alteração é recusado', noChange.status === 400);

  // ── 9. Trava do último responsável ─────────────────────────────────────
  const ownerId = byEmail(list.body.members, dono.email).id;

  const demoteOwner = await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: ownerId, role: 'manager',
  });
  check('não é possível rebaixar o único responsável', demoteOwner.status === 409,
    `status ${demoteOwner.status}`);
  check('erro identifica a trava do último responsável', demoteOwner.body?.code === 'last_owner');

  const deactivateOwner = await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: ownerId, is_active: false,
  });
  check('não é possível desativar o único responsável', deactivateOwner.status === 409);

  const revokeOwner = await ADM('DELETE', `/api/admin/partners/${partnerId}/members?member_id=${ownerId}`);
  check('não é possível revogar o único responsável', revokeOwner.status === 409);

  // Com um segundo responsável, a trava libera.
  await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, { member_id: managerId, role: 'owner' });
  const demoteNow = await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, {
    member_id: ownerId, role: 'manager',
  });
  check('com dois responsáveis, o rebaixamento é permitido', demoteNow.status === 200,
    JSON.stringify(demoteNow.body));

  // ── 10. Desativar e reativar ───────────────────────────────────────────
  const caixaId = byEmail(list.body.members, caixa.email).id;
  const caixaToken = await login(caixa.email);
  const CX = client(caixaToken);

  check('operador acessa o portal antes da desativação',
    (await CX('GET', '/api/partner/dashboard')).status === 200);

  await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, { member_id: caixaId, is_active: false });
  const afterOff = await CX('GET', '/api/partner/dashboard');
  check('acesso desativado bloqueia o portal', afterOff.status === 403, `status ${afterOff.status}`);

  await ADM('PATCH', `/api/admin/partners/${partnerId}/members`, { member_id: caixaId, is_active: true });
  check('reativação devolve o acesso',
    (await CX('GET', '/api/partner/dashboard')).status === 200);

  // Reconceder a quem já teve acesso é reativação, não duplicação.
  await ADM('DELETE', `/api/admin/partners/${partnerId}/members?member_id=${caixaId}`);
  const regrant = await ADM('POST', `/api/admin/partners/${partnerId}/members`, {
    email: caixa.email, role: 'operator',
  });
  check('reconceder acesso funciona após revogação', [200, 201].includes(regrant.status),
    `status ${regrant.status}`);
  const dupCount = await db.query(
    `SELECT count(*)::int n FROM public.partner_members WHERE partner_id = $1 AND user_id = $2`,
    [partnerId, caixa.userId]
  );
  check('não há vínculo duplicado após reconceder', dupCount.rows[0].n === 1, `${dupCount.rows[0].n} vínculos`);

  // ── 11. Revogação efetiva ──────────────────────────────────────────────
  const finalList = await ADM('GET', `/api/admin/partners/${partnerId}/members`);
  const caixaId2 = byEmail(finalList.body.members, caixa.email).id;

  const revoke = await ADM('DELETE', `/api/admin/partners/${partnerId}/members?member_id=${caixaId2}`);
  check('admin revoga o acesso', revoke.status === 200, JSON.stringify(revoke.body));
  check('mensagem nomeia quem perdeu o acesso',
    /Caixa Acesso/i.test(revoke.body?.message ?? ''), revoke.body?.message);

  const afterRevoke = await CX('GET', '/api/partner/dashboard');
  check('portal fecha imediatamente após a revogação', afterRevoke.status === 403,
    `status ${afterRevoke.status}`);

  // ── 12. Vínculo automático na aprovação ────────────────────────────────
  await db.query(`UPDATE public.partners SET owner_id = $2 WHERE id = $1`, [partner2, fora.userId]);
  const approve = await ADM('PATCH', '/api/admin/partners', { id: partner2, action: 'approve' });
  check('admin aprova a empresa sem vínculo', approve.status === 200, JSON.stringify(approve.body));
  check('aprovação informa que o responsável foi vinculado automaticamente',
    /vinculado automaticamente/i.test(approve.body?.accessWarning ?? ''), approve.body?.accessWarning);

  const autoLink = await db.query(
    `SELECT role FROM public.partner_members WHERE partner_id = $1 AND user_id = $2 AND is_active`,
    [partner2, fora.userId]
  );
  check('vínculo do responsável foi criado na aprovação', autoLink.rowCount === 1);

  const foraToken2 = await login(fora.email);
  const afterApprove = await client(foraToken2)('GET', '/api/partner/dashboard');
  check('responsável passa a acessar o portal após a aprovação', afterApprove.status === 200,
    `status ${afterApprove.status}`);

  // ── 13. Aprovação sem responsável avisa o administrador ────────────────
  const p3 = (await db.query(
    `INSERT INTO public.partners (legal_name, trade_name, tax_id, category, status)
     VALUES ('Empresa Orfa E2E LTDA','Empresa Orfa',$1,'servicos','pending') RETURNING id`,
    [`${TAG}-3`]
  )).rows[0].id;

  const approveOrphan = await ADM('PATCH', '/api/admin/partners', { id: p3, action: 'approve' });
  check('aprovar empresa sem responsável avisa o administrador',
    /Nenhuma conta tem acesso/i.test(approveOrphan.body?.accessWarning ?? ''),
    approveOrphan.body?.accessWarning);

  // ── 14. Auditoria ──────────────────────────────────────────────────────
  const audit = await db.query(
    `SELECT action FROM public.audit_logs
     WHERE target_id = $1 AND action LIKE 'partner_access%'`, [partnerId]
  );
  const actions = audit.rows.map((r) => r.action);
  check('concessão de acesso é auditada', actions.includes('partner_access_granted'));
  check('alteração de acesso é auditada', actions.includes('partner_access_updated'));
  check('revogação de acesso é auditada', actions.includes('partner_access_revoked'));

  // ── 15. Autorização da própria rota ────────────────────────────────────
  const noAuth = await fetch(`${BASE}/api/admin/partners/${partnerId}/members`);
  check('rota de equipe exige autenticação', [401, 403].includes(noAuth.status), `status ${noAuth.status}`);

  const asPartner = await G('GET', `/api/admin/partners/${partnerId}/members`);
  check('parceiro não acessa a rota administrativa de equipe',
    [401, 403].includes(asPartner.status), `status ${asPartner.status}`);

  // ── Limpeza ────────────────────────────────────────────────────────────
  await cleanup();
  const left = await db.query(`SELECT count(*)::int n FROM public.partners WHERE tax_id LIKE $1`, [`${TAG}%`]);
  check('dados de teste removidos ao final', left.rows[0].n === 0, `${left.rows[0].n} restantes`);

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
