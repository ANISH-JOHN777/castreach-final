const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.demo') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const { seedDemoData } = require('./seedDemo');

/**
 * CastReach Demo Reset Script
 * Resets demo database records and re-seeds cleanly.
 * FORBIDDEN IN PRODUCTION.
 */
async function resetDemoData() {
  const isDemo = process.env.APP_ENV === 'demo' || process.env.NODE_ENV !== 'production';
  if (!isDemo || process.env.NODE_ENV === 'production') {
    console.error('CRITICAL GUARD: Demo reset script is strictly forbidden in production environment.');
    process.exit(1);
  }

  let mongoUri = process.env.MONGODB_URI || 'memory';
  if (mongoose.connection.readyState === 0) {
    if (mongoUri === 'memory') {
      const { MongoMemoryReplSet } = require('mongodb-memory-server');
      const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      mongoUri = mongod.getUri();
    }
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }

  console.log('[Reset] Resetting demo collections...');
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }

  console.log('[Reset] Demo database wiped. Re-seeding demo dataset...');
  await seedDemoData();
  console.log('[Reset] Demo environment reset complete.');
}

if (require.main === module) {
  resetDemoData()
    .then(() => {
      console.log('[Reset] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Reset] Error:', err);
      process.exit(1);
    });
}

module.exports = { resetDemoData };
