const https = require('https');

const VERCEL_TOKEN = process.argv[2] || process.env.VERCEL_TOKEN || '';
const PROJECT_ID = 'prj_qMP2DtuypyrnOm2txE0s1C6r2Ngg';

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
        catch (e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Buscar o último deployment para obter o gitSource
  const deploymentsRes = await vercelRequest('GET', `/v6/deployments?projectId=${PROJECT_ID}&limit=1&target=production`);
  if (deploymentsRes.status !== 200) {
    console.error('Erro ao buscar deployments:', JSON.stringify(deploymentsRes.body || deploymentsRes.raw).slice(0, 300));
    process.exit(1);
  }

  const deployments = deploymentsRes.body.deployments || [];
  if (!deployments.length) {
    console.error('Nenhum deployment encontrado.');
    process.exit(1);
  }

  const last = deployments[0];
  console.log('Último deployment:', last.uid, '|', last.state, '|', last.createdAt);

  // Criar novo deployment redeploy
  const redeployRes = await vercelRequest('POST', '/v13/deployments', {
    name: 'compreouvenda',
    project: PROJECT_ID,
    target: 'production',
    deploymentId: last.uid,
    withLatestCommit: true,
  });

  if (redeployRes.status === 200 || redeployRes.status === 201) {
    const d = redeployRes.body;
    console.log('✅ Redeploy iniciado!');
    console.log('   ID:', d.id || d.uid);
    console.log('   URL:', d.url ? 'https://' + d.url : 'N/A');
    console.log('   Estado:', d.readyState || d.status || 'BUILDING');
    console.log('\n🔗 Acompanhe em: https://vercel.com/compreouvenda/compreouvenda/deployments');
  } else {
    console.error('❌ Erro ao disparar redeploy:');
    console.error(JSON.stringify(redeployRes.body || redeployRes.raw, null, 2).slice(0, 500));
    console.error('\n💡 Alternativa: vá em https://vercel.com → projeto → "Redeploy"');
  }
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
