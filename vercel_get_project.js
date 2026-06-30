const https = require('https');

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

async function main() {
  // 1. Listar projetos
  const projectsRes = await vercelRequest('GET', '/v9/projects?limit=10');
  if (projectsRes.status !== 200) {
    console.error('Erro ao listar projetos:', JSON.stringify(projectsRes.body));
    process.exit(1);
  }
  const projects = projectsRes.body.projects || [];
  console.log('Projetos encontrados:', projects.map(p => p.name + ' (' + p.id + ')').join(', '));

  const project = projects.find(p => p.name.toLowerCase().includes('compreouvenda')) || projects[0];
  if (!project) { console.error('Projeto não encontrado'); process.exit(1); }
  console.log('Usando projeto:', project.name, '| ID:', project.id);

  process.stdout.write(JSON.stringify({ projectId: project.id, projectName: project.name }));
}

main().catch(e => { console.error(e.message); process.exit(1); });
