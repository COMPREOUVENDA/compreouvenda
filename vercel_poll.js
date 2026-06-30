const https = require('https');

const TOKEN = process.argv[2];
const DEPLOY_ID = process.argv[3] || 'dpl_5ZYMQicqu4t5iYxWe5h7fFeUya9n';

function getDeployment() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.vercel.com',
      path: '/v13/deployments/' + DEPLOY_ID,
      headers: { 'Authorization': 'Bearer ' + TOKEN },
    };
    https.get(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    }).on('error', reject);
  });
}

async function poll() {
  console.log('Aguardando deploy', DEPLOY_ID, '...');
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const d = await getDeployment();
    const state = d.readyState || d.status || '?';
    const url = d.url ? 'https://' + d.url : '';
    console.log(new Date().toISOString().slice(11, 19), '|', state, url ? '| ' + url : '');
    if (state === 'READY') {
      console.log('\n✅ Deploy concluído com sucesso!');
      console.log('🌐 URL de produção:', url || 'ver dashboard Vercel');
      break;
    }
    if (state === 'ERROR' || state === 'CANCELED') {
      console.log('\n❌ Deploy falhou. Estado:', state);
      console.log('Detalhes:', JSON.stringify(d).slice(0, 400));
      break;
    }
  }
}

poll().catch(e => console.error(e.message));
