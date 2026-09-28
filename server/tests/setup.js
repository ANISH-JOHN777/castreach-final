// Test environment configuration — must be set before app/routes are required.
process.env.NODE_ENV              = 'test';
process.env.JWT_SECRET            = 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET    = 'test_refresh_secret';
process.env.JWT_EXPIRES_IN        = '15m';
process.env.STRIPE_SECRET_KEY     = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.ANTHROPIC_API_KEY     = 'sk-ant-dummy';
process.env.DAILY_API_KEY         = 'daily_dummy';
process.env.CLIENT_URL            = 'http://localhost:5173';

const mongoose = require('mongoose');
// BUG-7 fix requires transactions → replica set mode.
// MongoMemoryReplSet runs a single-member replica set in memory, which is
// still Atlas-compatible and backward-compatible with all standalone operations.
const { MongoMemoryServer, MongoMemoryReplSet } = require('mongodb-memory-server');

let mongo;

beforeAll(async () => {
  try {
    mongo = await MongoMemoryServer.create();
  } catch (err) {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  }
  await mongoose.connect(mongo.getUri());
}, 30000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongo) {
    await mongo.stop({ doCleanup: true });
  }
});

