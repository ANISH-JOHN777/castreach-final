const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

/**
 * Phase 8 Verification Script: Real MongoDB Transaction & Rollback Testing
 * Verifies that local/memory MongoDB topology supports replica set transactions,
 * commits multi-document operations, and cleanly rolls back on intentional failure.
 */
async function verifyReplicaSetAndTransactions() {
  console.log('=== CASTREACH MONGO TRANSACTION VERIFICATION ===');
  let mongoReplSet = null;
  let uri = process.env.MONGODB_URI;

  if (!uri || uri === 'memory') {
    console.log('[1/5] Starting MongoMemoryReplSet (rs0)...');
    mongoReplSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = mongoReplSet.getUri();
  }

  console.log('[2/5] Connecting to MongoDB...');
  await mongoose.connect(uri);

  // 1. Verify Topology
  const adminDb = mongoose.connection.db.admin();
  const isMaster = await adminDb.command({ isMaster: 1 });

  console.log('[3/5] Topology Status:');
  console.log('      - ismaster:', isMaster.ismaster);
  console.log('      - setName:', isMaster.setName || 'none');
  console.log('      - msg:', isMaster.msg || 'N/A');

  const isReplSet = Boolean(isMaster.setName || isMaster.ismaster);
  if (!isReplSet) {
    throw new Error('MongoDB server is not running as a replica set member!');
  }

  // Define temporary test schema
  const testSchema = new mongoose.Schema({ name: String, val: Number });
  const TestModel = mongoose.model('TxTestModel', testSchema);

  // 2. Test Transaction Commit
  console.log('[4/5] Testing Transaction Commit...');
  const commitSession = await mongoose.startSession();
  commitSession.startTransaction();

  const [doc1] = await TestModel.create([{ name: 'commit_test', val: 100 }], { session: commitSession });
  await commitSession.commitTransaction();
  commitSession.endSession();

  const persistedDoc = await TestModel.findById(doc1._id);
  if (!persistedDoc || persistedDoc.val !== 100) {
    throw new Error('Transaction commit verification failed!');
  }
  console.log('      ✅ Transaction commit succeeded! Document persisted:', persistedDoc._id);

  // 3. Test Transaction Rollback
  console.log('[5/5] Testing Transaction Rollback (Abort)...');
  const rollbackSession = await mongoose.startSession();
  rollbackSession.startTransaction();

  const [doc2] = await TestModel.create([{ name: 'rollback_test', val: 999 }], { session: rollbackSession });
  await rollbackSession.abortTransaction();
  rollbackSession.endSession();

  const rolledBackDoc = await TestModel.findById(doc2._id);
  if (rolledBackDoc !== null) {
    throw new Error('Transaction rollback failed! Document was unexpectedly saved.');
  }
  console.log('      ✅ Transaction rollback succeeded! Uncommitted document was discarded.');

  // Clean up
  await TestModel.deleteMany({});
  await mongoose.disconnect();
  if (mongoReplSet) await mongoReplSet.stop();

  console.log('=== VERIFICATION PASSED: REPLICA SET TRANSACTIONS VERIFIED ===');
}

if (require.main === module) {
  verifyReplicaSetAndTransactions().catch((err) => {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  });
}

module.exports = verifyReplicaSetAndTransactions;
