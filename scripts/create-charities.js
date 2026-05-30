const pg = require('pg');
const client = new pg.Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  category TEXT,
  pix_key TEXT,
  active BOOLEAN DEFAULT true,
  total_received DECIMAL(10,2) DEFAULT 0,
  supporters INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS total_received DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS supporters INT DEFAULT 0;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY charities_select ON public.charities FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_charities_active ON public.charities(active);
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('SUCCESS: charities table created'); client.end(); })
  .catch(e => { console.error('ERROR:', e.message); client.end(); });
