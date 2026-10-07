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
    const shobanaPasswordHash = await bcrypt.hash('shobana123', 10);
    const clientUser = {
      username: 'shobana',
      passwordHash: shobanaPasswordHash,
      role: 'CLIENT',
      clientId: 'shobana_internal',
      createdAt: new Date().toISOString()
    };

    const clientSnapshot = await usersRef.where('username', '==', 'shobana').get();
    if (clientSnapshot.empty) {
      await usersRef.add(clientUser);
      console.log('Client user seeded successfully');
    } else {
      console.log('Client user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

seedAdmin();
