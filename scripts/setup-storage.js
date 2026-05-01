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
  console.log('Connected.\n');

  // Create storage bucket for product images
  await client.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('products', 'products', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('+ Storage bucket "products" created');

  // Create storage bucket for avatars
  await client.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('+ Storage bucket "avatars" created');

  // Storage policies - products bucket
  await client.query(`
    CREATE POLICY "Anyone can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'products');
  `).catch(() => console.log('  (select policy already exists)'));

  await client.query(`
    CREATE POLICY "Authenticated users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
  `).catch(() => console.log('  (insert policy already exists)'));

  await client.query(`
    CREATE POLICY "Users can delete own product images" ON storage.objects
    FOR DELETE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);
  `).catch(() => console.log('  (delete policy already exists)'));

  console.log('+ Storage policies configured');

  // Create a function to auto-create user profile on signup
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.users (auth_id, email, name, type)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'type', 'buyer')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  console.log('+ handle_new_user() function created');

  await client.query(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  `);
  console.log('+ Trigger on_auth_user_created set');

  // Verify categories were seeded
  const cats = await client.query('SELECT count(*) FROM public.categories');
  console.log('+ Categories seeded:', cats.rows[0].count);

  const settings = await client.query('SELECT count(*) FROM public.system_settings');
  console.log('+ System settings seeded:', settings.rows[0].count);

  await client.end();
  console.log('\nAll done!');
}

run().catch(e => { console.error(e.message); process.exit(1); });
