const https = require('https');
const fs = require('fs');

const VERCEL_TOKEN = process.argv[2] || process.env.VERCEL_TOKEN || '';

function vercelRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        'Authorization': 'Bearer ' + VERCEL_TOKEN,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

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

// Variáveis que devem ir para produção (excluir placeholders)
const PLACEHOLDERS = ['placeholder', 'TROCAR', 'trocar', 'example', 'your_'];
function isPlaceholder(val) {
  return PLACEHOLDERS.some(p => val.toLowerCase().includes(p.toLowerCase()));
}

// Identificar target de cada variável
function getTargets(key) {
  if (key.startsWith('NEXT_PUBLIC_')) return ['production', 'preview', 'development'];
  return ['production', 'preview'];
}

async function main() {
  const envVars = readEnv();
  console.log('Variáveis no .env.local:', Object.keys(envVars).length);

  // Tentar endpoints alternativos para token vcp_
  const endpoints = [
    '/v9/projects?limit=20',
    '/v1/user',
    '/v2/teams',
  ];

  for (const ep of endpoints) {
    const r = await vercelRequest('GET', ep);
    console.log(ep, '→ status', r.status, typeof r.body === 'object' ? Object.keys(r.body).join(',') : r.body.slice(0, 100));
  }

  // Tentar com o endpoint específico de projeto pelo nome
  const byNameRes = await vercelRequest('GET', '/v9/projects/compreouvenda');
  console.log('\nProjeto por nome:', byNameRes.status, typeof byNameRes.body === 'object' ? JSON.stringify(byNameRes.body).slice(0, 200) : byNameRes.body.slice(0, 200));
}

main().catch(e => { console.error(e.message); process.exit(1); });
