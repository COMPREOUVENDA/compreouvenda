const { Client } = require('pg');

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '122459pa01#01',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected. Fixing RLS policies...\n');

  const policies = [
    // Categories - public read
    `DROP POLICY IF EXISTS "Anyone can read categories" ON categories;`,
    `CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);`,

    // Products - public read active ones
    `DROP POLICY IF EXISTS "Anyone can read active products" ON products;`,
    `CREATE POLICY "Anyone can read active products" ON products FOR SELECT USING (status = 'active');`,
    `DROP POLICY IF EXISTS "Users can insert own products" ON products;`,
    `CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));`,
    `DROP POLICY IF EXISTS "Users can update own products" ON products;`,
    `CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));`,

    // Product images - public read
    `DROP POLICY IF EXISTS "Anyone can read product images" ON product_images;`,
    `CREATE POLICY "Anyone can read product images" ON product_images FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Users can insert product images" ON product_images;`,
    `CREATE POLICY "Users can insert product images" ON product_images FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,

    // Users - public read basic info
    `DROP POLICY IF EXISTS "Anyone can read user profiles" ON users;`,
    `CREATE POLICY "Anyone can read user profiles" ON users FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Users can update own profile" ON users;`,
    `CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = auth_id::text);`,
    `DROP POLICY IF EXISTS "System can insert users" ON users;`,
    `CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true);`,

    // Charities - public read
    `DROP POLICY IF EXISTS "Anyone can read charities" ON charities;`,
    `CREATE POLICY "Anyone can read charities" ON charities FOR SELECT USING (true);`,

    // Favorites
    `DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;`,
    `CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));`,

    // Conversations
    `DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;`,
    `CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id IN (buyer_id, seller_id)));`,
    `DROP POLICY IF EXISTS "Users can create conversations" ON conversations;`,
    `CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,

    // Messages
    `DROP POLICY IF EXISTS "Users can read conversation messages" ON messages;`,
    `CREATE POLICY "Users can read conversation messages" ON messages FOR SELECT USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = sender_id) OR conversation_id IN (SELECT id FROM conversations WHERE auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id IN (buyer_id, seller_id))));`,
    `DROP POLICY IF EXISTS "Users can send messages" ON messages;`,
    `CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,

    // Orders
    `DROP POLICY IF EXISTS "Users can read own orders" ON orders;`,
    `CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id IN (buyer_id, seller_id)));`,

    // Notifications
    `DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;`,
    `CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));`,
    `DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;`,
    `CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));`,

    // System settings - public read
    `DROP POLICY IF EXISTS "Anyone can read settings" ON system_settings;`,
    `CREATE POLICY "Anyone can read settings" ON system_settings FOR SELECT USING (true);`,

    // Ensure RLS is enabled on all tables
    `ALTER TABLE categories ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE products ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE charities ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;`,
  ];

  let success = 0;
  let failed = 0;
  for (const sql of policies) {
    try {
      await client.query(sql);
      success++;
    } catch(e) {
      console.log('WARN:', sql.substring(0, 60), '-', e.message.substring(0, 80));
      failed++;
    }
  }

  console.log(`Done: ${success} OK, ${failed} warnings`);

  // Also fix the trigger - check if profile was created
  const { rows } = await client.query(`SELECT id, email, name FROM public.users ORDER BY created_at DESC LIMIT 5`);
  console.log('\nUsers in DB:', rows.length);
  rows.forEach(r => console.log(' ', r.email, '-', r.name));

  // Check if trigger user was created
  const authUsers = await client.query(`SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 3`);
  console.log('\nAuth users:', authUsers.rows.length);
  authUsers.rows.forEach(r => console.log(' ', r.email, '-', r.id.substring(0, 8)));

  // Manual fix: insert profile for the test user if missing
  if (authUsers.rows.length > 0) {
    for (const au of authUsers.rows) {
      const { rows: existing } = await client.query('SELECT id FROM public.users WHERE auth_id = $1', [au.id]);
      if (existing.length === 0) {
        await client.query(
          `INSERT INTO public.users (auth_id, email, name, type) VALUES ($1, $2, $3, 'seller')`,
          [au.id, au.email, au.email.split('@')[0]]
        );
        console.log('  -> Created profile for', au.email);
      }
    }
  }

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
