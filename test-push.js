const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
    port: 5432,
    user: 'postgres',
    password: '122459pa01#01',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  
  const r = await c.query("SELECT id, email FROM public.users WHERE email = 'teste@compreouvenda.com'");
  if (r.rows.length === 0) {
    console.log('User not found. Listing all:');
    const all = await c.query('SELECT id, email FROM public.users LIMIT 10');
    console.log(JSON.stringify(all.rows, null, 2));
  } else {
    const userId = r.rows[0].id;
    console.log('Found user:', userId);
    
    // Send push notification
    const res = await fetch('https://compreouvenda.vercel.app/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': 'a11bc58888e44009341f8888ef3de60aee9b67eca447aa3f7be12bf74a16e924'
      },
      body: JSON.stringify({
        userId: userId,
        notification: {
          title: '🛒 Novo pedido recebido!',
          body: 'Um comprador quer seu iPhone 13. Confira agora!',
          icon: '/icons/icon-192x192.png',
          url: '/dashboard',
          type: 'new_order'
        }
      })
    });
    const result = await res.json();
    console.log('Push result:', JSON.stringify(result));
  }
  
  await c.end();
}
main().catch(e => console.error(e.message));
