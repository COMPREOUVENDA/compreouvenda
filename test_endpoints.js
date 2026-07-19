const https = require('https');

const BASE = 'compreouvenda.vercel.app';
const endpoints = [
  { method: 'GET', path: '/api/health', name: 'Health Check' },
  { method: 'GET', path: '/api/payments/webhook', name: 'Webhook PagBank' },
  { method: 'GET', path: '/sitemap.xml', name: 'Sitemap SEO' },
  { method: 'GET', path: '/privacy', name: 'Política de Privacidade' },
  { method: 'GET', path: '/terms', name: 'Termos de Uso' },
  { method: 'GET', path: '/', name: 'Home' },
];

async function testEndpoint(ep) {
  return new Promise((resolve) => {
    const opts = { hostname: BASE, path: ep.path, method: ep.method, timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' } };
    const r = https.request(opts, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        resolve({ name: ep.name, path: ep.path, status: res.statusCode, ok, size: d.length });
      });
    });
    r.on('error', (e) => resolve({ name: ep.name, path: ep.path, status: 0, ok: false, error: e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ name: ep.name, path: ep.path, status: 0, ok: false, error: 'timeout' }); });
    r.end();
  });
}

async function main() {
  console.log('\n=== TESTE DE ENDPOINTS EM PRODUÇÃO ===');
  console.log(`Base: https://${BASE}\n`);
  for (const ep of endpoints) {
    const r = await testEndpoint(ep);
    const icon = r.ok ? '✅' : '❌';
    const size = r.size ? ` | ${r.size} bytes` : '';
    const err = r.error ? ` | ${r.error}` : '';
    console.log(`${icon} ${r.status || 'ERR'} — ${r.name} (${r.path})${size}${err}`);
  }
}
main();
