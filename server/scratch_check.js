const mongoose = require('mongoose');
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/castreach';

async function run() {
  await mongoose.connect(mongoUri);
  const User = require('./models/User');
  const Booking = require('./models/Booking');

  const host = await User.findOne({ email: 'demo.host1@castreach.demo' });
  console.log('Host profile:', host ? { id: host._id.toString(), email: host.email, role: host.role } : 'NOT FOUND');

  if (host) {
    const bookings = await Booking.find({ $or: [{ host: host._id }, { guest: host._id }] })
      .populate('host', 'name email role podcastName')
      .populate('guest', 'name email role expertise')
      .lean();

    console.log(`Found ${bookings.length} bookings for demo.host1@castreach.demo:`);
    bookings.forEach((b, idx) => {
      console.log(`\nBooking #${idx + 1}:`);
      console.log(`  ID: ${b._id}`);
      console.log(`  Host: ${b.host ? `${b.host.name} (${b.host._id})` : 'NULL/MISSING'}`);
      console.log(`  Guest: ${b.guest ? `${b.guest.name} (${b.guest._id})` : 'NULL/MISSING'}`);
      console.log(`  Status: ${b.status}`);
      console.log(`  SlotStart: ${b.slotStart}`);
      console.log(`  Topics: ${JSON.stringify(b.topics)}`);
    });
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
