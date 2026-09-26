const { app, request, makeUser, makeAdmin, makeHost, auth } = require('./helpers');
const User = require('../models/User');

describe('Platform Admin Security & Portal Suite', () => {
  let admin, guest, host;

  beforeEach(async () => {
    admin = await makeAdmin();
    guest = await makeUser({ role: 'guest' });
    host  = await makeHost();
  });

  // 1. Admin login succeeds with correct credentials
  test('1. Admin login succeeds with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.user.email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  // 2. Admin login fails with incorrect credentials
  test('2. Admin login fails with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.user.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // 3. Guest cannot access admin API
  test('3. Guest cannot access admin API (returns 403)', async () => {
    const res = await request(app)
      .get('/api/reports/overview')
      .use(auth(guest.token));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin only');
  });

  // 4. Host cannot access admin API
  test('4. Host cannot access admin API (returns 403)', async () => {
    const res = await request(app)
      .get('/api/reports/overview')
      .use(auth(host.token));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin only');
  });

  // 5. Unauthenticated request cannot access admin API
  test('5. Unauthenticated request cannot access admin API (returns 401)', async () => {
    const res = await request(app).get('/api/reports/overview');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  // 6. Admin can access admin API
  test('6. Admin can access admin API (returns 200)', async () => {
    const res = await request(app)
      .get('/api/reports/overview')
      .use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeDefined();
  });

  // 7. Public registration cannot create admin
  test('7. Public registration cannot create admin (returns 422)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'hacker@test.com',
        password: 'password123',
        name: 'Hacker',
        role: 'admin',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation failed');
  });

  // 8. Admin password is never returned by API
  test('8. Admin password is never returned by API', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .use(auth(admin.token));

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.password).toBeUndefined();
    expect(meRes.body.user.refreshToken).toBeUndefined();
  });

  // 9. Admin logout works
  test('9. Admin logout works', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });

  // 10. Admin refresh works
  test('10. Admin refresh works', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.user.email, password: 'password123' });

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.token).toBeDefined();
  });

  // 11. Existing guest authentication remains working
  test('11. Existing guest authentication remains working', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: guest.user.email, password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('guest');

    const meRes = await request(app)
      .get('/api/auth/me')
      .use(auth(loginRes.body.token));

    expect(meRes.status).toBe(200);
    expect(meRes.body.user._id).toBe(guest.user._id);
  });

  // 12. Existing host authentication remains working
  test('12. Existing host authentication remains working', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: host.user.email, password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('host');

    const meRes = await request(app)
      .get('/api/auth/me')
      .use(auth(loginRes.body.token));

    expect(meRes.status).toBe(200);
    expect(meRes.body.user._id).toBe(host.user._id);
  });
});
