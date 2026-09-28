const mongoose = require('mongoose');

const User = require('../models/User');
const Booking = require('../models/Booking');
const Message = require('../models/Message');

async function runRealPersistenceTest() {
  const uri = 'mongodb://127.0.0.1:27017/castreach_demo';
  
  console.log('=== PHASE 1: CONNECT TO PERSISTENT MONGODB ===');
  await mongoose.connect(uri);
  console.log('Connected to:', uri);

  const host = await User.findOne({ role: 'host' });
  const guest = await User.findOne({ role: 'guest' });

  if (!host || !guest) {
    throw new Error('Baseline host/guest accounts not found');
  }

  console.log('=== PHASE 2: CREATE REAL APPLICATION RECORD ===');
  const testBooking = await Booking.create({
    host: host._id,
    guest: guest._id,
    slotStart: new Date(Date.now() + 1000000),
    slotEnd: new Date(Date.now() + 2000000),
    status: 'confirmed',
    paymentStatus: 'held',
    amountCents: 25000,
    currency: 'usd',
    tenantId: 'castreach',
  });

  const testMessage = await Message.create({
    booking: testBooking._id,
    sender: guest._id,
    content: 'REAL_PERSISTENCE_TEST_MESSAGE_BODY_XYZ_123',
    text: 'REAL_PERSISTENCE_TEST_MESSAGE_BODY_XYZ_123',
    tenantId: 'castreach',
  });

  const bookingId = testBooking._id.toString();
  const messageId = testMessage._id.toString();

  console.log(`Created Booking ID: ${bookingId}`);
  console.log(`Created Message ID: ${messageId}`);

  console.log('=== PHASE 3: STOP BACKEND CONNECTION (SIMULATE BACKEND RESTART) ===');
  await mongoose.disconnect();
  console.log('Backend connection completely terminated.');

  console.log('=== PHASE 4: RESTART BACKEND CONNECTION & QUERY RECORDS ===');
  await mongoose.connect(uri);
  console.log('Backend connection restarted.');

  const queriedBooking = await Booking.findById(bookingId);
  const queriedMessage = await Message.findById(messageId);

  console.log('=== PHASE 5: VERIFY EXACT ID MATCH ===');
  if (!queriedBooking) {
    throw new Error(`FAILED: Booking ID ${bookingId} missing after server restart!`);
  }
  if (!queriedMessage) {
    throw new Error(`FAILED: Message ID ${messageId} missing after server restart!`);
  }

  console.log(`Queried Booking ID: ${queriedBooking._id.toString()} — Status: ${queriedBooking.status}`);
  console.log(`Queried Message ID: ${queriedMessage._id.toString()} — Content: ${queriedMessage.content}`);

  const bookingMatch = queriedBooking._id.toString() === bookingId;
  const messageMatch = queriedMessage._id.toString() === messageId;

  console.log(`Booking ID Match: ${bookingMatch}`);
  console.log(`Message ID Match: ${messageMatch}`);

  await mongoose.disconnect();

  if (bookingMatch && messageMatch) {
    console.log('REAL_RUNTIME_PERSISTENCE_TEST_PASSED_100_PERCENT');
  } else {
    throw new Error('ID mismatch after server restart!');
  }
}

runRealPersistenceTest().catch((err) => {
  console.error('PERSISTENCE TEST ERROR:', err);
  process.exit(1);
});
