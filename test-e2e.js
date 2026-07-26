const BASE_URL = 'https://compreouvenda.vercel.app';
const timestamp = Date.now();
const email = `e2e.${timestamp}@gmail.com`;
const password = 'Teste@123456';

async function signup() {
  const res = await fetch(`${BASE_URL}/api/auth/signup-bypass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: `E2E User ${timestamp}`, phone: '11999999999' }),
  });
  const data = await res.json();
  if (!data.user?.id) throw new Error('Signup failed: ' + JSON.stringify(data));
  console.log('✓ Signup OK:', data.user.id);
  return data.session.access_token;
}

async function signin() {
  const res = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.session?.access_token) throw new Error('Signin failed: ' + JSON.stringify(data));
  console.log('✓ Signin OK');
  return data.session.access_token;
}

async function createProduct(token) {
  const res = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: `Produto Teste ${timestamp}`,
      description: 'Descrição de teste automatizado',
      price: 99.9,
      category_id: '00000000-0000-0000-0000-000000000000',
      condition: 'new',
      images: [],
      videos: [],
    }),
  });
  const text = await res.text();
  console.log('Create product status:', res.status, text.slice(0, 200));
  try { return JSON.parse(text); } catch { return { error: text.slice(0, 100) }; }
}

async function run() {
  try {
    const token = await signup();
    await signin();
    const product = await createProduct(token);
    if (!product.success) throw new Error('Create product failed: ' + JSON.stringify(product));
    console.log('✓ Product OK:', product.product.id);
    console.log('\n✅ Fluxo E2E concluído com sucesso');
  } catch (e) {
    console.error('\n❌ Fluxo E2E falhou:', e.message);
  }
}

run();
