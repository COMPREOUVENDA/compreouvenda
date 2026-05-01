const { Client } = require('pg');
const client = new Client({ host:'db.auxaajrjwbdsnxtvgmsb.supabase.co', port:5432, database:'postgres', user:'postgres', password:'122459pa01#01', ssl:{rejectUnauthorized:false} });

async function run() {
  await client.connect();
  console.log('Connected.\n');

  // 1. Create video_jobs table
  await client.query(`
    CREATE TABLE IF NOT EXISTS video_jobs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      style TEXT NOT NULL DEFAULT 'template',
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER DEFAULT 0,
      video_url TEXT,
      thumbnail_url TEXT,
      input_photos TEXT[],
      input_title TEXT,
      input_price DECIMAL(10,2),
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `);
  console.log('+ video_jobs table created');

  // 2. Create subscriptions table (for premium plans)
  await client.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      next_billing_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('+ subscriptions table created');

  // 3. Create push_subscriptions table (Web Push)
  await client.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, endpoint)
    );
  `);
  console.log('+ push_subscriptions table created');

  // 4. Add video columns to products if missing
  await client.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'none';
  `);
  console.log('+ products video columns added');

  // 5. RLS for new tables
  await client.query(`
    ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can read own video jobs" ON video_jobs FOR SELECT USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));
    CREATE POLICY "Users can insert video jobs" ON video_jobs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "Users can update own video jobs" ON video_jobs FOR UPDATE USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));
    
    CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));
    CREATE POLICY "Users can manage own push subs" ON push_subscriptions FOR ALL USING (auth.uid()::text IN (SELECT auth_id::text FROM users WHERE id = user_id));
  `).catch(e => console.log('  (some policies already exist)'));
  console.log('+ RLS configured');

  // 6. Grant permissions
  await client.query(`
    GRANT SELECT, INSERT, UPDATE ON video_jobs TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
    GRANT ALL ON push_subscriptions TO authenticated;
    GRANT SELECT ON video_jobs TO anon;
  `);
  console.log('+ Grants applied');

  // 7. Enable Realtime for video_jobs (for progress tracking)
  await client.query(`
    ALTER PUBLICATION supabase_realtime ADD TABLE video_jobs;
  `).catch(() => console.log('  (video_jobs already in realtime)'));
  
  await client.query(`
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  `).catch(() => console.log('  (messages already in realtime)'));
  
  await client.query(`
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  `).catch(() => console.log('  (notifications already in realtime)'));
  console.log('+ Realtime enabled for video_jobs, messages, notifications');

  await client.end();
  console.log('\nDone!');
}

run().catch(e => { console.error(e.message); process.exit(1); });
