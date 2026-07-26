const email = 'browser.test.' + Date.now() + '@gmail.com';
const password = 'Teste@123456';

fetch('https://compreouvenda.vercel.app/api/auth/signup-bypass', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name: 'Browser Test User', phone: '11999999999' }),
})
  .then(r => r.json())
  .then(data => {
    if (data.user) {
      console.log('CREDENTIALS');
      console.log('email=' + email);
      console.log('password=' + password);
      console.log('userId=' + data.user.id);
    } else {
      console.log('FAIL', data);
    }
  })
  .catch(e => console.error(e.message));
