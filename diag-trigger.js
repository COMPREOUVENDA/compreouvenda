const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auxaajrjwbdsnxtvgmsb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const email = `diag.${Date.now()}@test.com`;
  const password = 'Teste@123456';
  const name = 'Diag User';

  console.log('1. Criando usuário...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (authError) throw authError;
  console.log('   User ID:', authData.user.id);

  console.log('2. Buscando perfil...');
  const { data: profiles, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authData.user.id);
  console.log('   Profiles:', profiles);
  console.log('   Error:', profileError);

  console.log('3. Verificando trigger handle_new_user...');
  const { data: triggers } = await supabase.rpc('check_trigger_exists', { trigger_name: 'on_auth_user_created' });
  console.log('   Trigger exists:', triggers);

  console.log('4. Limpando...');
  await supabase.from('users').delete().eq('auth_id', authData.user.id);
  await supabase.auth.admin.deleteUser(authData.user.id);
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
