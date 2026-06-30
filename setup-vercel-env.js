/**
 * setup-vercel-env.js
 * Configura TODAS as variáveis de ambiente do .env.local no projeto Vercel.
 *
 * Uso:
 *   node setup-vercel-env.js SEU_TOKEN_VERCEL [NOME_DO_PROJETO]
 *
 * Como gerar um token:
 *   1. Acesse https://vercel.com/account/tokens
 *   2. Clique em "Create Token"
 *   3. Nome: "compreouvenda-deploy"
 *   4. Escopo: Full Account
 *   5. Cole o token como primeiro argumento
 */

const https = require('https');
const fs = require('fs');

const VERCEL_TOKEN = process.argv[2];
const PROJECT_FILTER = process.argv[3] || 'compreouvenda';

if (!VERCEL_TOKEN) {
  console.error('❌ Token obrigatório. Uso: node setup-vercel-env.js SEU_TOKEN');
  console.error('   Gere em: https://vercel.com/account/tokens');
  process.exit(1);
}

// Variáveis que NÃO devem ir para produção (placeholders)
const PLACEHOLDER_PATTERNS = ['placeholder', 'trocar', 'example', 'your_', 'xxx', 'test123'];
function isPlaceholder(val) {
  return PLACEHOLDER_PATTERNS.some(p => val.toLowerCase().includes(p));
}

// Definir em quais ambientes Vercel cada variável vai
function getTargets(key) {
  if (key.startsWith('NEXT_PUBLIC_')) return ['production', 'preview', 'development'];
  return ['production', 'preview']; // secrets: não vai para development
}

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
  // 1. Ler .env.local
  if (!fs.existsSync('.env.local')) {
    console.error('❌ .env.local não encontrado. Execute na raiz do projeto.');
    process.exit(1);
  }
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (val) envVars[key] = val;
    }
  });

  console.log(`📋 ${Object.keys(envVars).length} variáveis encontradas no .env.local`);

  // 2. Buscar projeto
  const projectsRes = await vercelRequest('GET', '/v9/projects?limit=20');
  if (projectsRes.status !== 200) {
    console.error('❌ Erro ao listar projetos:', JSON.stringify(projectsRes.body || projectsRes.raw));
    process.exit(1);
  }
  const projects = projectsRes.body.projects || [];
  const project = projects.find(p => p.name.toLowerCase().includes(PROJECT_FILTER.toLowerCase())) || projects[0];
  if (!project) {
    console.error('❌ Projeto não encontrado. Projetos disponíveis:', projects.map(p => p.name).join(', '));
    process.exit(1);
  }
  console.log(`✅ Projeto: ${project.name} (${project.id})`);

  // 3. Buscar variáveis já existentes no Vercel
  const existingRes = await vercelRequest('GET', `/v9/projects/${project.id}/env`);
  const existing = existingRes.body?.envs || [];
  const existingKeys = new Set(existing.map(e => e.key));
  console.log(`📊 ${existingKeys.size} variáveis já configuradas no Vercel`);

  // 4. Adicionar / atualizar cada variável
  let added = 0, skipped = 0, placeholder = 0, updated = 0;

  for (const [key, val] of Object.entries(envVars)) {
    if (isPlaceholder(val)) {
      console.log(`⚠️  ${key} = PLACEHOLDER — ignorado`);
      placeholder++;
      continue;
    }

    const targets = getTargets(key);

    if (existingKeys.has(key)) {
      // Atualizar existente
      const existingEnv = existing.find(e => e.key === key);
      if (existingEnv) {
        const updateRes = await vercelRequest('PATCH', `/v9/projects/${project.id}/env/${existingEnv.id}`, {
          value: val,
          target: targets,
        });
        if (updateRes.status === 200) {
          console.log(`🔄 ${key} atualizado`);
          updated++;
        } else {
          console.log(`❌ ${key} falhou ao atualizar:`, JSON.stringify(updateRes.body || updateRes.raw).slice(0, 100));
        }
      }
    } else {
      // Criar novo
      const createRes = await vercelRequest('POST', `/v9/projects/${project.id}/env`, {
        key,
        value: val,
        type: 'encrypted',
        target: targets,
      });
      if (createRes.status === 200 || createRes.status === 201) {
        console.log(`✅ ${key} adicionado (${targets.join(', ')})`);
        added++;
      } else {
        console.log(`❌ ${key} falhou:`, JSON.stringify(createRes.body || createRes.raw).slice(0, 100));
      }
    }
  }

  console.log('\n════════════════════════════════════');
  console.log(`✅ Adicionadas: ${added}`);
  console.log(`🔄 Atualizadas: ${updated}`);
  console.log(`⏭️  Já existiam: ${skipped}`);
  console.log(`⚠️  Placeholders ignorados: ${placeholder}`);
  console.log('\n🚀 Agora faça um redeploy no Vercel para aplicar as variáveis.');
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
