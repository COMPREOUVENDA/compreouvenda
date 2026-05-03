const https = require('https');

const url = 'https://auxaajrjwbdsnxtvgmsb.supabase.co/auth/v1/token?grant_type=password';
const body = JSON.stringify({
  email: 'teste@compreouvenda.com',
  password: 'teste123'
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjI4NDYsImV4cCI6MjA2MDM5ODg0Nn0.bq-OwZ3XhoCaoTjbD7HnvPMXvFvUKv7BbJ7Ct7YIQLI'
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.access_token) {
      console.log('LOGIN SUCCESS!');
      console.log('User ID:', parsed.user.id);
      console.log('Email:', parsed.user.email);
    } else {
      console.log('LOGIN FAILED:', data);
    }
  });
});

req.write(body);
req.end();
