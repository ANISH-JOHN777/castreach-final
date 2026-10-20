const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');
const realtimeServer = require('./services/realtimeServer');
const logger = require('./utils/logger');

// ── Database + server start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
let mongodInstance = null;
let server;

async function startServer() {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/castreach_dev';

  if (uri === 'memory') {
    if (process.env.NODE_ENV === 'production') {
      logger.error('In-memory MongoDB instance is forbidden in production environment.');
      process.exit(1);
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri() + 'castreach_dev';
    logger.info('Using in-memory MongoDB instance');
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully', { uri: uri.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      const fs = require('fs');
      const dataDir = path.resolve(__dirname, '.data/db');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Clear stale lock file if left over from abrupt exit
      const lockFile = path.join(dataDir, 'mongod.lock');
      if (fs.existsSync(lockFile)) {
        try { fs.unlinkSync(lockFile); } catch {}
      }

      logger.warn(`Connecting to MongoDB at ${uri} failed (${err.message}). Starting MongoMemoryServer with persistent disk storage at ${dataDir}...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          storageEngine: 'wiredTiger',
          dbPath: dataDir,
          args: ['--syncdelay', '2']
        }
      });
      uri = mongodInstance.getUri() + 'castreach_dev';
      await mongoose.connect(uri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('MongoMemoryServer disk storage connected successfully', { uri: uri.replace(/\/\/.*@/, '//***@'), dataDir });
    } else {
      logger.error('MongoDB connection error', { error: err.message });
      process.exit(1);
    }
  }

  try {
    // Auto-seed if database is empty in development or if AUTO_SEED=true
    if (process.env.AUTO_SEED === 'true' || process.env.NODE_ENV !== 'production') {
      const User = require('./models/User');
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const { seedDemoData } = require('./scripts/seedDemo');
        await seedDemoData();
        logger.info('Seeded initial accounts into database.');
      }
    }

    server = http.createServer(app);

    realtimeServer.init(server);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
    });
  } catch (err) {
    logger.error('Server startup error', { error: err.message });
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }

  if (realtimeServer && typeof realtimeServer.close === 'function') {
    realtimeServer.close();
    logger.info('WebSocket connections closed.');
  }

  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.db.admin().command({ fsync: 1 });
      await mongoose.connection.db.admin().command({ shutdown: 1 });
    } catch {}
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed.');
  }

  if (mongodInstance) {
    try {
      await mongodInstance.stop({ doCleanup: false });
      logger.info('MongoMemoryServer disk instance cleanly stopped.');
    } catch {}
  }

  logger.info('Graceful shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = app;

