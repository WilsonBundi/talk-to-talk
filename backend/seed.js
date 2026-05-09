require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const dns = require('dns');

// Use Google DNS for SRV lookups
dns.setServers(['8.8.8.8']);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, required: true, enum: ['creator', 'consumer'], default: 'consumer' },
  displayName: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() }
});

const User = mongoose.model('User', userSchema);

const seedUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if users already exist
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing users. Skipping seed.`);
      await mongoose.connection.close();
      return;
    }

    // Hash passwords
    const hashedCreatorPassword = await bcryptjs.hash('creator123', 10);
    const hashedConsumerPassword = await bcryptjs.hash('consumer123', 10);

    const defaultUsers = [
      {
        username: 'creator_admin',
        password: hashedCreatorPassword,
        email: 'creator@example.com',
        displayName: 'Creator Admin',
        role: 'creator'
      },
      {
        username: 'consumer_user',
        password: hashedConsumerPassword,
        email: 'consumer@example.com',
        displayName: 'Consumer User',
        role: 'consumer'
      }
    ];

    await User.insertMany(defaultUsers);
    console.log('✓ Seeded 2 default users:');
    console.log('  - creator_admin / creator123 (creator)');
    console.log('  - consumer_user / consumer123 (consumer)');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedUsers();
