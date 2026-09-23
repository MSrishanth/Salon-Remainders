import { db } from './firebaseAdmin.js';
import bcrypt from 'bcrypt';

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminUser = {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      clientId: null,
      createdAt: new Date().toISOString()
    };

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', 'admin').get();

    if (snapshot.empty) {
      await usersRef.add(adminUser);
      console.log('Admin user seeded successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

seedAdmin();
