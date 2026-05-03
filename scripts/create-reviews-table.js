// scripts/create-reviews-table.js
// Run: node scripts/create-reviews-table.js
// Requires: npm install pg

const { Client } = require('pg');

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '122459pa01#01',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const SQL = `
-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reviewed_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rating int CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Prevent duplicate reviews per order
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_reviewer_unique
  ON reviews(order_id, reviewer_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews(product_id);
CREATE INDEX IF NOT EXISTS reviews_reviewed_id_idx ON reviews(reviewed_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read reviews
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews
  FOR SELECT USING (true);

-- Policy: authenticated users can insert their own reviews
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid()::text = reviewer_id::text);

-- Policy: reviewer can update their own review
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid()::text = reviewer_id::text);

-- Auction bids table
CREATE TABLE IF NOT EXISTS auction_bids (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  bidder_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  value numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS auction_bids_product_id_idx ON auction_bids(product_id);

ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_bids_select_all" ON auction_bids;
CREATE POLICY "auction_bids_select_all" ON auction_bids
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "auction_bids_insert_auth" ON auction_bids;
CREATE POLICY "auction_bids_insert_auth" ON auction_bids
  FOR INSERT WITH CHECK (auth.uid()::text = bidder_id::text);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid()::text = user_id::text);
`;

async function main() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    await client.query(SQL);
    console.log('Tables created/verified successfully:');
    console.log('  ✓ reviews');
    console.log('  ✓ auction_bids');
    console.log('  ✓ favorites');
    console.log('  ✓ RLS policies applied');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
