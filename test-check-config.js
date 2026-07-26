fetch('https://compreouvenda.vercel.app/api/auth/check-config')
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error(e.message));
