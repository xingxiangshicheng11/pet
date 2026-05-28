async function main() {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@pet.com', password: 'owner123' }),
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  if (!loginData.token) {
    console.log('Login failed:', JSON.stringify(loginData));
    return;
  }
  const token = loginData.token;
  console.log('Token OK');

  // Test products with all=true (marketplace uses this when category is empty)
  let res = await fetch('http://localhost:3001/api/products?all=true', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  let data = await res.json();
  console.log('Products?all=true status:', res.status, 'count:', Array.isArray(data) ? data.length : 'N/A');
  if (!Array.isArray(data)) console.log('Response:', JSON.stringify(data).substring(0, 500));

  // Test products with no params
  res = await fetch('http://localhost:3001/api/products', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  data = await res.json();
  console.log('Products (no params) status:', res.status, 'count:', Array.isArray(data) ? data.length : 'N/A');
  if (!Array.isArray(data)) console.log('Response:', JSON.stringify(data).substring(0, 500));

  // Test favorites
  res = await fetch('http://localhost:3001/api/owner/favorites', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  data = await res.json();
  console.log('Favorites status:', res.status, 'data:', JSON.stringify(data).substring(0, 200));
}

main().catch(console.error);
