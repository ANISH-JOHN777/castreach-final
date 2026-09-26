/**
 * Create or promote an admin user (BLK-3).
 *
 * There is intentionally no self-serve route to become an admin. Run:
 *
 *   node scripts/createAdmin.js admin@example.com "Strong P@ssw0rd" "Admin Name"
 *
 * If the email already exists, that account is promoted to `admin`.
 * Otherwise a new admin account is created.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

async function main() {
  let [email, password, name] = process.argv.slice(2);
  
  if (!email)    email    = process.env.ADMIN_EMAIL;
  if (!password) password = process.env.ADMIN_PASSWORD;
  if (!name)     name     = process.env.ADMIN_NAME || 'Platform Admin';

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password> [name]');
    console.error('   OR: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/createAdmin.js');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    if (password) existing.password = password; // pre-save hook will hash password
    await existing.save();
    console.log(`Promoted existing user ${email} to admin.`);
  } else {
    await User.create({ email, password, name: name || 'Platform Admin', role: 'admin', isOnboarded: true });
    console.log(`Created admin user ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
