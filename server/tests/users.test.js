const { request, app, makeUser } = require('./helpers');

describe('Users — PII exposure (BLK-5)', () => {
  test('GET /api/users requires authentication', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('GET /api/users never returns email for listed users', async () => {
    await makeUser({ role: 'host', name: 'Listed Host' });
    const viewer = await makeUser({ role: 'guest' });

    const res = await request(app)
      .get('/api/users?role=host')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    for (const u of res.body.users) {
      expect(u.email).toBeUndefined();
      expect(u.password).toBeUndefined();
    }
  });

  test('GET /api/users/:id hides email of OTHER users', async () => {
    const target = await makeUser({ role: 'host' });
    const viewer = await makeUser({ role: 'guest' });

    const res = await request(app)
      .get(`/api/users/${target.user._id}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeUndefined();
  });

  test('GET /api/users/:id shows OWN email', async () => {
    const me = await makeUser({ role: 'guest' });
    const res = await request(app)
      .get(`/api/users/${me.user._id}`)
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(me.user.email);
  });
});

describe('Users — Search, Filtering, Sorting & Pagination (Phase 1)', () => {
  test('filters by expertise, rating, and badge with pagination metadata', async () => {
    const User = require('../models/User');
    const host1 = await makeUser({ role: 'host', name: 'Expert AI Host' });
    await User.findByIdAndUpdate(host1.user._id, { expertise: ['AI', 'Startups'], avgRating: 4.8, totalReviews: 10, badges: ['top_rated'] });

    const host2 = await makeUser({ role: 'host', name: 'Junior Host' });
    await User.findByIdAndUpdate(host2.user._id, { expertise: ['Design'], avgRating: 3.2, totalReviews: 2 });

    const viewer = await makeUser({ role: 'guest' });

    // Filter by expertise=AI
    const resExp = await request(app)
      .get('/api/users?role=host&expertise=AI')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(resExp.status).toBe(200);
    expect(resExp.body.users.length).toBe(1);
    expect(resExp.body.users[0].name).toBe('Expert AI Host');
    expect(resExp.body.pagination).toBeDefined();
    expect(resExp.body.pagination.total).toBe(1);

    // Filter by minRating=4.0
    const resRating = await request(app)
      .get('/api/users?role=host&minRating=4.0')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(resRating.status).toBe(200);
    expect(resRating.body.users.length).toBe(1);
    expect(resRating.body.users[0]._id).toBe(host1.user._id.toString());

    // Filter by badge=top_rated
    const resBadge = await request(app)
      .get('/api/users?role=host&badge=top_rated')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(resBadge.status).toBe(200);
    expect(resBadge.body.users.length).toBe(1);
    expect(resBadge.body.users[0]._id).toBe(host1.user._id.toString());
  });

  test('sorts by session rate price_asc and price_desc', async () => {
    const User = require('../models/User');
    const hLow  = await makeUser({ role: 'host', name: 'Low Rate Host' });
    await User.findByIdAndUpdate(hLow.user._id, { sessionRateCents: 1000 });

    const hHigh = await makeUser({ role: 'host', name: 'High Rate Host' });
    await User.findByIdAndUpdate(hHigh.user._id, { sessionRateCents: 10000 });

    const viewer = await makeUser({ role: 'guest' });

    const resAsc = await request(app)
      .get('/api/users?role=host&sort=price_asc')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(resAsc.status).toBe(200);
    expect(resAsc.body.users[0].sessionRateCents).toBeLessThanOrEqual(resAsc.body.users[1].sessionRateCents);

    const resDesc = await request(app)
      .get('/api/users?role=host&sort=price_desc')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(resDesc.status).toBe(200);
    expect(resDesc.body.users[0].sessionRateCents).toBeGreaterThanOrEqual(resDesc.body.users[1].sessionRateCents);
  });
});
