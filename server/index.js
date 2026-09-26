const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

// ── Database + server start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function startServer() {
  let uri = process.env.MONGODB_URI;

  if (uri === 'memory') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    console.log('ℹ️ Using in-memory MongoDB instance');
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
