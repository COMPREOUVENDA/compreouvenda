/**
 * setup-pagbank-webhook.js
 * Registra o webhook do PagBank para receber notificações de pagamento.
 *
 * Pré-requisito: substituir PAGBANK_TOKEN no .env.local pelo token real.
 *
 * Uso:
 *   node setup-pagbank-webhook.js
 *
 * Ambientes:
 *   - Sandbox: https://sandbox.api.pagseguro.com
 *   - Produção: https://api.pagseguro.com
 */

const https = require('https');
const fs = require('fs');

// Ler .env.local
function readEnv() {
  const content = fs.readFileSync('.env.local', 'utf8');
  const vars = {};
  content.split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (val) vars[key] = val;
    }
  });
  return vars;
}

function pagbankRequest(method, path, body, host, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: host,
      path,
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const env = readEnv();

  const token = env['PAGBANK_TOKEN'];
  const appUrl = env['NEXT_PUBLIC_APP_URL'] || 'https://compreouvenda.vercel.app';
  const environment = env['PAGBANK_ENV'] || 'sandbox';

  if (!token || token.includes('placeholder')) {
    console.error('❌ PAGBANK_TOKEN não configurado no .env.local');
    console.error('   Acesse https://minha.conta.pagseguro.uol.com.br/aplicacoes-admin/');
    console.error('   Crie um token OAuth e substitua o valor no .env.local');
    process.exit(1);
  }

  const host = environment === 'production'
    ? 'api.pagseguro.com'
    : 'sandbox.api.pagseguro.com';

  const webhookUrl = appUrl.replace(/\/$/, '') + '/api/payments/webhook';
  console.log(`🔗 Ambiente: ${environment}`);
  console.log(`🔗 Host PagBank: ${host}`);
  console.log(`🔗 Webhook URL: ${webhookUrl}`);

  // Listar webhooks existentes
  console.log('\n📋 Verificando webhooks registrados...');
  const listRes = await pagbankRequest('GET', '/webhooks', null, host, token);
  console.log('Status:', listRes.status);

  if (listRes.status === 200) {
    const webhooks = listRes.body?.webhooks || listRes.body || [];
    const alreadyRegistered = Array.isArray(webhooks)
      ? webhooks.find(w => w.url === webhookUrl)
      : null;

    if (alreadyRegistered) {
      console.log('✅ Webhook já registrado! ID:', alreadyRegistered.id);
      return;
    }
    console.log(`ℹ️  ${Array.isArray(webhooks) ? webhooks.length : 0} webhook(s) existentes`);
  } else {
    console.log('Resposta:', JSON.stringify(listRes.body || listRes.raw).slice(0, 300));
  }

  // Registrar webhook
  console.log('\n📝 Registrando webhook...');
  const registerRes = await pagbankRequest('POST', '/webhooks', {
    url: webhookUrl,
    events: [
      'CHARGE_AUTHORIZED',
      'CHARGE_PAID',
      'CHARGE_DECLINED',
      'CHARGE_CANCELED',
      'ORDER_AUTHORIZED',
      'ORDER_PAID',
    ],
  }, host, token);

  console.log('Status:', registerRes.status);

  if (registerRes.status === 200 || registerRes.status === 201) {
    const wb = registerRes.body;
    console.log('✅ Webhook registrado com sucesso!');
    console.log('   ID:', wb.id || wb.webhookId || 'N/A');
    console.log('   URL:', webhookUrl);
    console.log('   Eventos:', (wb.events || []).join(', '));
  } else {
    console.error('❌ Erro ao registrar webhook:');
    console.error(JSON.stringify(registerRes.body || registerRes.raw, null, 2));
    console.error('\n💡 Passos manuais alternativos:');
    console.error('   1. Acesse: https://minha.conta.pagseguro.uol.com.br/aplicacoes-admin/');
    console.error('   2. Vá em: Notificações → Webhooks');
    console.error('   3. Adicione a URL:', webhookUrl);
    console.error('   4. Selecione os eventos de pagamento');
  }
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
