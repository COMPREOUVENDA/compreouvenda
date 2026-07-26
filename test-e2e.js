const BASE_URL = 'https://compreouvenda.vercel.app';

async function post(path, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE_URL + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function main() {
  const ts = Date.now();
  const email = `e2e.${ts}@test.com`;
  const password = 'Teste@123456';

  console.log('1. Signup:', email);
  const signup = await post('/api/auth/signup-bypass', { email, password, name: 'E2E User', type: 'seller' });
  console.log('   status', signup.status, signup.data);
  if (signup.status !== 200 && signup.status !== 201) throw new Error('Signup failed');

  console.log('2. Signin');
  const signin = await post('/api/auth/signin', { email, password });
  console.log('   status', signin.status);
  if (signin.status !== 200) throw new Error('Signin failed: ' + JSON.stringify(signin.data));
  const token = signin.data.session.access_token;

  console.log('3. Create product');
  const product = await post('/api/products', {
    title: `Produto E2E ${ts}`,
    description: 'Descrição de teste',
    price: 99.9,
    category_id: '550e8400-e29b-41d4-a716-446655440000',
    condition: 'new',
    images: ['https://placehold.co/600x400'],
  }, token);
  console.log('   status', product.status, product.data);
  if (product.status !== 200) throw new Error('Create product failed: ' + JSON.stringify(product.data));

  console.log('\n✅ Fluxo E2E completo funcionando!');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
