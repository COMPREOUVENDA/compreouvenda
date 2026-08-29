#!/usr/bin/env node
/**
 * seed-partner-demo.js
 *
 * Cria (ou reaproveita) uma empresa parceira de demonstração e vincula uma
 * conta de usuário a ela, para que seja possível abrir o Portal do Parceiro
 * em /parceiro.
 *
 * O portal não tem cadastro próprio: o lojista entra com a mesma conta do
 * marketplace e o acesso vem do vínculo em `partner_members`. Este script
 * cria justamente esse vínculo.
 *
 * Uso:
 *   node scripts/seed-partner-demo.js seu-email@exemplo.com
 *   node scripts/seed-partner-demo.js seu-email@exemplo.com operator
 *
 * O segundo argumento é o papel na empresa (owner | manager | operator).
 * Padrão: owner.
 *
 * Para remover tudo o que este script criou:
 *   node scripts/seed-partner-demo.js --limpar
 */

const { Client } = require('pg');

const TAX_ID = '11222333000181'; // CNPJ de demonstração com dígitos válidos
const ROLES = ['owner', 'manager', 'operator'];

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '122459pa01#01',
  ssl: { rejectUnauthorized: false },
});

async function limpar() {
  const r = await client.query(`DELETE FROM public.partners WHERE tax_id = $1 RETURNING trade_name`, [TAX_ID]);
  if (r.rowCount === 0) {
    console.log('Nada a remover: a empresa de demonstração não existe.');
  } else {
    console.log(`Removida a empresa "${r.rows[0].trade_name}" e todos os dados vinculados.`);
  }
}

async function main() {
  const arg = process.argv[2];
  const role = process.argv[3] || 'owner';

  await client.connect();

  if (arg === '--limpar') {
    await limpar();
    return;
  }

  if (!arg) {
    console.error('Informe o e-mail da conta que vai acessar o portal.');
    console.error('Exemplo: node scripts/seed-partner-demo.js seu-email@exemplo.com');
    process.exitCode = 1;
    return;
  }

  if (!ROLES.includes(role)) {
    console.error(`Papel inválido: "${role}". Use um destes: ${ROLES.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  // 1. A conta precisa existir. O portal não cria usuários.
  const user = await client.query(
    `SELECT id, name, email FROM public.users WHERE lower(email) = lower($1)`,
    [arg]
  );

  if (user.rowCount === 0) {
    console.error(`\nNenhuma conta encontrada para "${arg}".`);
    console.error('Cadastre-se primeiro em /register (ou faça login com essa conta) e rode o script de novo.');
    process.exitCode = 1;
    return;
  }

  const { id: userId, name } = user.rows[0];
  console.log(`Conta encontrada: ${name || arg}`);

  // 2. Empresa de demonstração, já aprovada para liberar todas as ações.
  const partner = await client.query(
    `INSERT INTO public.partners
       (legal_name, trade_name, tax_id, category, description, status, plan, owner_id, approved_at)
     VALUES
       ('Cafeteria Demonstracao LTDA', 'Cafeteria Demo', $1, 'gastronomia',
        'Empresa de demonstração criada para testar o Portal do Parceiro.',
        'approved', 'premium', $2, now())
     ON CONFLICT (tax_id) DO UPDATE
       SET status = 'approved', owner_id = EXCLUDED.owner_id
     RETURNING id, trade_name`,
    [TAX_ID, userId]
  );
  const partnerId = partner.rows[0].id;
  console.log(`Empresa: ${partner.rows[0].trade_name} (aprovada)`);

  // 3. Duas unidades, para o dashboard ter comparação entre filiais.
  const unidades = [
    ['Unidade Centro', 'São Paulo', 'SP'],
    ['Unidade Zona Sul', 'São Paulo', 'SP'],
  ];
  const unitIds = [];
  for (const [nome, cidade, uf] of unidades) {
    const u = await client.query(
      `INSERT INTO public.partner_units (partner_id, name, city, state, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [partnerId, nome, cidade, uf]
    );
    if (u.rowCount) unitIds.push(u.rows[0].id);
  }
  if (unitIds.length === 0) {
    const existing = await client.query(
      `SELECT id FROM public.partner_units WHERE partner_id = $1`, [partnerId]
    );
    unitIds.push(...existing.rows.map((r) => r.id));
  }
  console.log(`Unidades: ${unitIds.length}`);

  // 4. O vínculo que efetivamente libera o portal.
  const unitId = role === 'operator' ? unitIds[0] : null;
  await client.query(
    `INSERT INTO public.partner_members (partner_id, user_id, role, unit_id, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (partner_id, user_id) DO UPDATE
       SET role = EXCLUDED.role, unit_id = EXCLUDED.unit_id, is_active = true`,
    [partnerId, userId, role, unitId]
  );
  console.log(`Vínculo criado com o papel: ${role}`);

  // 5. Um benefício aprovado e um código pendente, para testar o balcão.
  const benefit = await client.query(
    `INSERT INTO public.benefits
       (partner_id, title, description, benefit_type, discount_percent,
        min_purchase_value, status, requires_approval, approved_at)
     VALUES
       ($1, 'Café com 20% de desconto',
        'Desconto válido em qualquer bebida quente da casa.',
        'percent_discount', 20, 10, 'approved', true, now())
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [partnerId]
  );

  let benefitId = benefit.rows[0]?.id;
  if (!benefitId) {
    const b = await client.query(
      `SELECT id FROM public.benefits WHERE partner_id = $1 LIMIT 1`, [partnerId]
    );
    benefitId = b.rows[0]?.id;
  }

  // Código novo a cada execução, para sempre haver um válido para testar.
  const code = `DEMO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  await client.query(
    `INSERT INTO public.benefit_redemptions
       (benefit_id, partner_id, unit_id, user_id, code, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', now() + interval '30 days')`,
    [benefitId, partnerId, unitIds[0] || null, userId, code]
  );

  console.log('\n─────────────────────────────────────────────');
  console.log('Pronto. Para testar:');
  console.log('');
  console.log('  1. Rode o servidor:      npm run dev');
  console.log(`  2. Faça login como:      ${arg}`);
  console.log('  3. Acesse:               http://localhost:3000/parceiro');
  console.log('');
  console.log(`  Código para validar no balcão: ${code}`);
  console.log('  (tela "Validar benefício" — informe um valor de compra acima de R$ 10)');
  console.log('');
  console.log('  Para desfazer tudo:      node scripts/seed-partner-demo.js --limpar');
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('\nFalhou:', e.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
