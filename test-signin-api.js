const email = 'login.verify.1785087296835@gmail.com';
const password = 'Teste@123456';

fetch('https://compreouvenda.vercel.app/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
  .then(r => r.json())
  .then(data => {
    console.log('Status:', data.session ? 'OK' : 'FAIL');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(e => console.error(e.message));
