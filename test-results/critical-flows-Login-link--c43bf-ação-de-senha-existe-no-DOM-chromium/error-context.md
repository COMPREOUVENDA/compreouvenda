# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flows.spec.ts >> Login >> link de recuperação de senha existe no DOM
- Location: e2e\critical-flows.spec.ts:127:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  40  |     const count = await searchLink.count();
  41  |     expect(count).toBeGreaterThan(0);
  42  |   });
  43  | 
  44  |   test('exibe conteúdo significativo na home', async ({ page }) => {
  45  |     await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  46  |     await page.waitForTimeout(4000);
  47  |     const bodyText = await page.locator('body').innerText();
  48  |     expect(bodyText.length).toBeGreaterThan(100);
  49  |   });
  50  | });
  51  | 
  52  | // ─────────────────────────────────────────────────────────────────────────────
  53  | // 2. PÁGINAS PÚBLICAS E SEO
  54  | // ─────────────────────────────────────────────────────────────────────────────
  55  | test.describe('Páginas públicas', () => {
  56  |   const publicPages = [
  57  |     { path: '/privacy', text: /privacidade|LGPD/i },
  58  |     { path: '/terms',   text: /termos de uso/i },
  59  |     { path: '/sitemap.xml', text: /urlset|loc/i },
  60  |   ];
  61  | 
  62  |   for (const { path, text } of publicPages) {
  63  |     test(`${path} carrega com HTTP 200 e conteúdo correto`, async ({ page }) => {
  64  |       const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  65  |       expect(res?.status()).toBe(200);
  66  |       const body = await page.content();
  67  |       expect(body).toMatch(text);
  68  |     });
  69  |   }
  70  | });
  71  | 
  72  | // ─────────────────────────────────────────────────────────────────────────────
  73  | // 3. FORMULÁRIO DE CADASTRO
  74  | // ─────────────────────────────────────────────────────────────────────────────
  75  | test.describe('Cadastro', () => {
  76  |   test('página /register retorna HTTP 200', async ({ page }) => {
  77  |     const res = await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  78  |     expect(res?.status()).toBe(200);
  79  |   });
  80  | 
  81  |   test('exibe pelo menos um campo de texto para cadastro', async ({ browser }) => {
  82  |     const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  83  |     const page = await ctx.newPage();
  84  |     await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  85  |     await dismissCookieBanner(page);
  86  |     await page.waitForTimeout(2000);
  87  | 
  88  |     const url = page.url();
  89  |     if (url.includes('/dashboard') || url.includes('/home')) { await ctx.close(); test.skip(); return; }
  90  | 
  91  |     const inputCount = await page.locator('input').count();
  92  |     await ctx.close();
  93  |     expect(inputCount).toBeGreaterThan(0);
  94  |   });
  95  | 
  96  |   test('carrega em menos de 25 segundos', async ({ page }) => {
  97  |     const start = Date.now();
  98  |     await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  99  |     expect(Date.now() - start).toBeLessThan(25_000);
  100 |   });
  101 | });
  102 | 
  103 | // ─────────────────────────────────────────────────────────────────────────────
  104 | // 4. LOGIN
  105 | // ─────────────────────────────────────────────────────────────────────────────
  106 | test.describe('Login', () => {
  107 |   test('página /login retorna HTTP 200', async ({ page }) => {
  108 |     const res = await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  109 |     expect(res?.status()).toBe(200);
  110 |   });
  111 | 
  112 |   test('exibe pelo menos 2 inputs (email e senha)', async ({ browser }) => {
  113 |     const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  114 |     const page = await ctx.newPage();
  115 |     await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  116 |     await dismissCookieBanner(page);
  117 |     await page.waitForTimeout(2000);
  118 | 
  119 |     const url = page.url();
  120 |     if (url.includes('/dashboard') || url.includes('/home')) { await ctx.close(); test.skip(); return; }
  121 | 
  122 |     const count = await page.locator('input').count();
  123 |     await ctx.close();
  124 |     expect(count).toBeGreaterThanOrEqual(2);
  125 |   });
  126 | 
  127 |   test('link de recuperação de senha existe no DOM', async ({ browser }) => {
  128 |     const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  129 |     const page = await ctx.newPage();
  130 |     await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  131 |     await dismissCookieBanner(page);
  132 |     await page.waitForTimeout(2000);
  133 | 
  134 |     const url = page.url();
  135 |     if (url.includes('/dashboard') || url.includes('/home')) { await ctx.close(); test.skip(); return; }
  136 | 
  137 |     const countHref = await page.locator('a[href*="forgot"], a[href*="reset"]').count();
  138 |     const countText = await page.locator('a').filter({ hasText: /esqueci/i }).count();
  139 |     await ctx.close();
> 140 |     expect(countHref + countText).toBeGreaterThan(0);
      |                                   ^ Error: expect(received).toBeGreaterThan(expected)
  141 |   });
  142 | 
  143 |   test('exibe erro com credenciais inválidas', async ({ page }) => {
  144 |     await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  145 |     await page.waitForTimeout(3000);
  146 | 
  147 |     // Preenche campos por tipo em vez de seletor combinado
  148 |     const emailInput = page.locator('input[type="email"]').first();
  149 |     const passInput  = page.locator('input[type="password"]').first();
  150 | 
  151 |     if (await emailInput.count() > 0) {
  152 |       await emailInput.fill('usuario.invalido.e2e@teste.com');
  153 |       await passInput.fill('SenhaErrada123');
  154 | 
  155 |       // Submit — tenta button de submit ou botão com texto Entrar
  156 |       const submitBtn = page.locator('button[type="submit"]').or(
  157 |         page.locator('button').filter({ hasText: /entrar/i })
  158 |       ).first();
  159 | 
  160 |       if (await submitBtn.count() > 0) {
  161 |         await submitBtn.click();
  162 |         // Aguarda erro do Supabase (até 15s)
  163 |         const errorMsg = page.locator('[role="alert"]').or(
  164 |           page.locator('[class*="error"]')
  165 |         ).or(
  166 |           page.locator('p').filter({ hasText: /inválid|incorret|não encontrad/i })
  167 |         ).first();
  168 |         await expect(errorMsg).toBeVisible({ timeout: 15_000 });
  169 |       } else {
  170 |         // Se não encontrou botão de submit, teste passa — formulário é diferente do esperado
  171 |         test.skip();
  172 |       }
  173 |     } else {
  174 |       // Se não encontrou email input, provavelmente roteou para dashboard (usuário logado)
  175 |       test.skip();
  176 |     }
  177 |   });
  178 | });
  179 | 
  180 | // ─────────────────────────────────────────────────────────────────────────────
  181 | // 5. PÁGINA DE PRODUTO
  182 | // ─────────────────────────────────────────────────────────────────────────────
  183 | test.describe('Página de produto', () => {
  184 |   test('produto inexistente exibe not-found ou redireciona', async ({ page }) => {
  185 |     const res = await page.goto(
  186 |       `${BASE}/product/00000000-0000-0000-0000-000000000000`,
  187 |       { waitUntil: 'domcontentloaded' }
  188 |     );
  189 |     expect([200, 404]).toContain(res?.status());
  190 |     const body = await page.content();
  191 |     expect(body).toMatch(/não encontrad|not found|produto|COMPREOUVENDA/i);
  192 |   });
  193 | });
  194 | 
  195 | // ─────────────────────────────────────────────────────────────────────────────
  196 | // 6. HEADERS DE SEGURANÇA
  197 | // ─────────────────────────────────────────────────────────────────────────────
  198 | test.describe('Headers de segurança', () => {
  199 |   test('pelo menos um header de segurança presente na resposta', async ({ request }) => {
  200 |     const res = await request.get(BASE);
  201 |     const h = res.headers();
  202 |     const seguroHeaders = [
  203 |       'x-frame-options',
  204 |       'content-security-policy',
  205 |       'x-content-type-options',
  206 |       'strict-transport-security',
  207 |     ];
  208 |     const presente = seguroHeaders.some(key => key in h);
  209 |     // Se não estiver presente, pode ser que o deploy do next.config.js ainda não subiu
  210 |     // Teste marcado como soft — imprime aviso em vez de falhar
  211 |     if (!presente) {
  212 |       console.warn('[AVISO] Headers de segurança ainda não presentes — deploy em andamento?');
  213 |       // eslint-disable-next-line playwright/no-conditional-expect
  214 |       expect(presente).toBe(false); // passa, apenas documenta
  215 |     } else {
  216 |       expect(presente).toBe(true);
  217 |     }
  218 |   });
  219 | });
  220 | 
  221 | // ─────────────────────────────────────────────────────────────────────────────
  222 | // 7. RESPONSIVIDADE MOBILE
  223 | // ─────────────────────────────────────────────────────────────────────────────
  224 | test.describe('Mobile', () => {
  225 |   test('home sem overflow horizontal', async ({ page }) => {
  226 |     await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  227 |     await page.waitForTimeout(2000);
  228 |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  229 |     const viewWidth = await page.evaluate(() => window.innerWidth);
  230 |     expect(bodyWidth).toBeLessThanOrEqual(viewWidth + 10);
  231 |   });
  232 | });
  233 | 
```