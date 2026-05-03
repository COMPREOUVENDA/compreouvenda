const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    'https://auxaajrjwbdsnxtvgmsb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MjEzMywiZXhwIjoyMDkyODE4MTMzfQ.CX_0c-PgeTKZ9V6fVALULIA_KDidTec3TeEeiOf_jJY'
  );

  // List users to find teste@compreouvenda.com
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.log('List error:', listErr); return; }
  
  const testUser = users.users.find(u => u.email === 'teste@compreouvenda.com');
  if (!testUser) { console.log('User not found!'); return; }
  
  console.log('Found user:', testUser.id, testUser.email);
  console.log('Email confirmed:', testUser.email_confirmed_at);

  // Reset password to teste123
  const { data, error } = await supabase.auth.admin.updateUserById(testUser.id, {
    password: 'teste123',
    email_confirm: true
  });

  if (error) {
    console.log('Error updating:', error);
  } else {
    console.log('Password reset SUCCESS!');
    console.log('User ID:', data.user.id);
  }

  // Test login with anon key
  const anonClient = createClient(
    'https://auxaajrjwbdsnxtvgmsb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDIxMzMsImV4cCI6MjA5MjgxODEzM30.y7Sv6U7L0APrnQWBb5sKaFw8D-Vq13IiKs1uAP8MC8M'
  );

  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: 'teste@compreouvenda.com',
    password: 'teste123'
  });

  if (loginErr) {
    console.log('Login FAILED:', loginErr.message);
  } else {
    console.log('Login SUCCESS! Token obtained for:', loginData.user.email);
  }
}

main().catch(console.error);
