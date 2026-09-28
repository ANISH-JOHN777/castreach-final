const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function testUser(email, label) {
  console.log(`\n========================================`);
  console.log(`Testing ${label} (${email})...`);
  const loginRes = await post('/api/auth/login', { email, password: 'DemoPassword123!' });
  if (loginRes.status !== 200) {
    console.log(`Login failed with ${loginRes.status}:`, loginRes.body);
    return;
  }
  const token = loginRes.body.token;
  const user = loginRes.body.user;
  console.log(`LoggedIn User ID: ${user._id}, Role: ${user.role}, Name: ${user.name}`);

  const bookingsRes = await get('/api/bookings', token);
  const bookings = bookingsRes.body.bookings || [];
  console.log(`Found ${bookings.length} bookings for ${email}`);

  for (const b of bookings) {
    console.log(`\n  Booking ID: ${b._id}`);
    console.log(`  Host: ${b.host?.name} (${b.host?._id || b.host})`);
    console.log(`  Guest: ${b.guest?.name} (${b.guest?._id || b.guest})`);
    console.log(`  Status: ${b.status}`);

    const detailRes = await get(`/api/bookings/${b._id}`, token);
    console.log(`  GET /api/bookings/${b._id} STATUS: ${detailRes.status}`);
    if (detailRes.status !== 200) {
      console.log(`  ERROR:`, detailRes.body);
    }
  }
}

async function run() {
  await testUser('demo.host1@castreach.demo', 'Host 1');
  await testUser('demo.host2@castreach.demo', 'Host 2');
  await testUser('demo.host3@castreach.demo', 'Host 3');
  await testUser('demo.guest1@castreach.demo', 'Guest 1');
  await testUser('demo.admin@castreach.demo', 'Admin');
}

run().catch(console.error);
