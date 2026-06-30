const https = require('https');

const TOKEN = process.argv[2];
const PROJECT_ID = 'prj_qMP2DtuypyrnOm2txE0s1C6r2Ngg';

function vercelRequest(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.vercel.com',
      path,
      headers: { 'Authorization': 'Bearer ' + TOKEN },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    }).on('error', reject);
  });
}

async function main() {
  // Listar env vars do projeto
  const envRes = await vercelRequest('/v9/projects/' + PROJECT_ID + '/env');
  const envs = envRes.envs || [];

  const criticalVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
    'OPENAI_API_KEY',
    'CRON_SECRET',
    'PAGBANK_TOKEN',
    'NEXT_PUBLIC_APP_URL',
  ];

  console.log('═══ Variáveis de Ambiente — Vercel Produção ═══\n');
  for (const key of criticalVars) {
    const found = envs.find(e => e.key === key);
    if (found) {
      const targets = found.target || [];
      const hasProd = targets.includes('production');
      const isPlaceholder = found.value && (found.value.includes('placeholder') || found.value.includes('trocar'));
      const status = isPlaceholder ? '⚠️  PLACEHOLDER' : hasProd ? '✅ OK' : '⚠️  sem produção';
      console.log(status, key, '→', targets.join(', '));
    } else {
      console.log('❌ AUSENTE  ', key);
    }
  }

  // Verificar deployment atual
  const deploysRes = await vercelRequest('/v6/deployments?projectId=' + PROJECT_ID + '&limit=1&target=production');
  const lastDeploy = (deploysRes.deployments || [])[0];
  if (lastDeploy) {
    console.log('\n═══ Último Deployment ═══');
    console.log('Estado:', lastDeploy.state || lastDeploy.readyState);
    console.log('URL:', lastDeploy.url ? 'https://' + lastDeploy.url : 'N/A');
    console.log('Data:', new Date(lastDeploy.createdAt).toLocaleString('pt-BR'));
  }
}

main().catch(e => console.error(e.message));
