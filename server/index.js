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
let server;

async function startServer() {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/castreach_demo';

  if (uri === 'memory') {
    if (process.env.NODE_ENV === 'production') {
      logger.error('In-memory MongoDB instance is forbidden in production environment.');
      process.exit(1);
    }
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = mongod.getUri();
    logger.info('Using in-memory MongoDB Replica Set instance (rs0)');
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully', { uri: uri.replace(/\/\/.*@/, '//***@') });

    // Auto-seed demo environment dataset when database is empty in non-production environments
    const isDemo = process.env.APP_ENV === 'demo' || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');
    if (isDemo) {
      const User = require('./models/User');
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const { seedDemoData } = require('./scripts/seedDemo');
        await seedDemoData();
        logger.info('Auto-seeded demo accounts into empty database on server startup.');
      }
    }

    server = http.createServer(app);

    realtimeServer.init(server);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
    });
  } catch (err) {
    logger.error('MongoDB connection error', { error: err.message });
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
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed.');
  }

  logger.info('Graceful shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = app;

