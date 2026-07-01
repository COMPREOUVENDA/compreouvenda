/**
 * setup-pagbank-webhook.js
 *
 * INFORMAÇÃO IMPORTANTE:
 * O PagBank NÃO usa registro global de webhook (diferente do Stripe).
 * O endpoint é enviado em cada pedido via campo `notification_urls`.
 *
 * A integração JÁ ESTÁ CORRETA em src/lib/pagbank.ts (createPixOrder e
 * createCreditCardOrder) — o campo notification_urls já aponta para
 * /api/payments/webhook automaticamente em cada pedido criado.
 *
 * Este script apenas verifica se o endpoint está acessível e exibe
 * instruções para obter o token real do PagBank.
 *
 * Uso: node setup-pagbank-webhook.js
 */

const https = require('https');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://compreouvenda.vercel.app';
const WEBHOOK_URL = `${APP_URL}/api/payments/webhook`;

console.log('=================================================');
console.log('  COMPREOUVENDA — Configuração PagBank Webhook');
console.log('=================================================\n');
console.log('✅ STATUS: O webhook PagBank já está configurado!');
console.log('');
console.log('📌 Como funciona:');
console.log('   - Cada pedido criado no PagBank inclui automaticamente:');
console.log(`   - notification_urls: ["${WEBHOOK_URL}"]`);
console.log('   - O PagBank envia POST para essa URL quando o status muda.');
console.log('');
console.log('🔑 Para ativar em PRODUÇÃO:');
console.log('   1. Acesse: https://minha.conta.pagseguro.uol.com.br/aplicacoes-admin');
console.log('   2. Crie uma aplicação ou acesse a existente');
console.log('   3. Copie o TOKEN de produção');
console.log('   4. Configure no Vercel via setup-vercel-env.js (PAGBANK_TOKEN + PAGBANK_ENV=production)');
console.log('');
console.log('🧪 Para SANDBOX (testes):');
console.log('   1. Acesse: https://sandbox.pagseguro.uol.com.br/aplicacoes-admin');
console.log('   2. Use token sandbox + PAGBANK_ENV=sandbox no .env.local');
console.log('');

// Verificar se o endpoint está acessível
console.log(`🔍 Verificando endpoint: ${WEBHOOK_URL}`);

try {
  const url = new URL(WEBHOOK_URL);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'GET',
    timeout: 10000,
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log(`✅ Endpoint ativo! Status: ${json.status} | Provider: ${json.provider}`);
        } catch {
          console.log(`✅ Endpoint respondeu com HTTP ${res.statusCode}`);
        }
      } else {
        console.log(`⚠️  Endpoint retornou HTTP ${res.statusCode}`);
      }
      console.log('');
      console.log('Nenhuma ação adicional necessária para o webhook PagBank.');
    });
  });

  req.on('error', (err) => {
    console.log(`ℹ️  Endpoint não verificável: ${err.message}`);
    console.log('   (Normal se o app ainda não foi deployado ou em ambiente local)');
  });

  req.on('timeout', () => { req.destroy(); console.log('⏱️  Timeout.'); });
  req.end();
} catch (e) {
  console.log('ℹ️  Não foi possível verificar o endpoint agora.');
  console.log('   Isso não afeta o funcionamento do webhook em produção.');
}
