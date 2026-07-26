const accessToken = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjhhM2VlMGE0LTEwMzAtNDljNy1iZmQxLWUxNDc5MzMyOTM5MiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1eGFhanJqd2Jkc254dHZnbXNiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZmFlNzdmOS0yNjlkLTQyOTctYmY5Ni05ZTczYTY5ZDY0MjYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg1MDkxNDk1LCJpYXQiOjE3ODUwODc4OTUsImVtYWlsIjoiYnJvd3Nlci50ZXN0LjE3ODUwODU2OTU1MzNAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJjaXR5IjoiIiwiZG9jdW1lbnQiOiIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkJyb3dzZXIgVGVzdCBVc2VyIiwicGhvbmUiOiIxMTk5OTk5OTk5OSIsInN0YXRlIjoiIiwidHlwZSI6ImJ1eWVyIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3ODUwODc4OTV9XSwic2Vzc2lvbl9pZCI6IjA5NjIzN2JkLTM0ZmYtNGMxYy1hZTNhLTFhMDdjYzQ2NzU3NyIsImlzX2Fub255bW91cyI6ZmFsc2V9.SzG8QOOr5km-MKdkpWFEgfyD7pGndhwnt9qWzOkQ24h9_lVDQpTZ4-7wfdZ45EINCK9xPsA0kRwG8xWvPwTMUw';

async function testProtectedRoute(path) {
  const res = await fetch('https://compreouvenda.vercel.app' + path, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 120));
}

(async () => {
  await testProtectedRoute('/api/health');
  await testProtectedRoute('/api/notifications/preferences');
  await testProtectedRoute('/api/orders');
})();
