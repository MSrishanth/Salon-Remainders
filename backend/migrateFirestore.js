import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error("❌ ERROR: serviceAccountKey.json not found or invalid.");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const generateId = () => db.collection('dummy').doc().id;

async function migrateData() {
  console.log("🚀 Starting Firestore Migration (Idempotent & Safe)...");

  try {
    const stateDocRef = db.collection('saloon').doc('state');
    const stateDoc = await stateDocRef.get();

    if (!stateDoc.exists) {
      console.log("ℹ️ saloon/state document does not exist. Nothing to migrate.");
      return;
    }

    const data = stateDoc.data();
    const oldCustomers = data.customers || [];
    const oldBookings = data.bookings || [];
    const oldBarberAuth = data.barberAuth || {};
    const oldReminders = data.reminders || [];

    console.log(`📦 Found ${oldCustomers.length} legacy customers, ${oldBookings.length} legacy bookings, ${oldReminders.length} legacy reminders.`);

    let batch = db.batch();
    let batchCount = 0;
    let totalWrites = 0;

    const commitBatchIfNeeded = async () => {
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} writes...`);
        batch = db.batch();
        batchCount = 0;
      }
    };

    // Fetch existing new data to prevent duplicates
    const [existCustSnap, existBookSnap, existRemSnap] = await Promise.all([
      db.collection('customers').get(),
      db.collection('bookings').get(),
      db.collection('reminders').get()
    ]);

    const existCustMap = new Map();
    existCustSnap.docs.forEach(doc => {
      const d = doc.data();
      if (d.phone) existCustMap.set(d.phone, doc.id);
      else if (d.name) existCustMap.set(d.name, doc.id);
    });

    const existBookSet = new Set();
    existBookSnap.docs.forEach(doc => {
      const d = doc.data();
      existBookSet.add(`${d.customerId}_${d.date}_${d.time}_${d.service}`);
    });

    const existRemSet = new Set();
    existRemSnap.docs.forEach(doc => {
      const d = doc.data();
      existRemSet.add(`${d.customerId}_${d.remindDate}_${d.remindTime}_${d.type}`);
    });

    // --- PROCESS BARBER AUTH ---
    if (Object.keys(oldBarberAuth).length > 0) {
      const authRef = db.collection('barberAuth').doc('admin');
      batch.set(authRef, {
        name: oldBarberAuth.name || '',
        phone: oldBarberAuth.phone || '',
        email: oldBarberAuth.email || '',
        password: oldBarberAuth.password || '',
        username: oldBarberAuth.username || oldBarberAuth.phone || 'admin'
      });
      batchCount++; totalWrites++;
    }

    // --- PROCESS CUSTOMERS ---
    const customerIdMap = new Map(); // phone/name -> newId
    
    for (const oldCust of oldCustomers) {
      const identifier = oldCust.phone || oldCust.name;
      if (!identifier) continue;

      let newId;
      if (existCustMap.has(identifier)) {
        newId = existCustMap.get(identifier);
      } else {
        newId = generateId();
        const newDocRef = db.collection('customers').doc(newId);
        batch.set(newDocRef, {
          name: oldCust.name || 'Unknown',
          phone: oldCust.phone || '',
          email: oldCust.email || '',
          password: oldCust.password || '',
          visits: parseInt(oldCust.visits) || 0,
          spent: parseFloat(oldCust.spent) || 0,
          lastVisit: oldCust.lastVisit || 'N/A'
        });
        existCustMap.set(identifier, newId);
        batchCount++; totalWrites++;
      }
      customerIdMap.set(identifier, newId);
      await commitBatchIfNeeded();
    }

    // --- PROCESS BOOKINGS ---
    for (const oldBooking of oldBookings) {
      const identifier = oldBooking.phone || oldBooking.name;
      let customerId = customerIdMap.get(identifier);

      // Create dummy customer if not exists
      if (!customerId && identifier) {
        customerId = generateId();
        const newCustRef = db.collection('customers').doc(customerId);
        batch.set(newCustRef, { name: oldBooking.name || 'Unknown', phone: oldBooking.phone || '', visits: 1, spent: oldBooking.price || 0, email: oldBooking.email || '', lastVisit: oldBooking.date || 'N/A' });
        customerIdMap.set(identifier, customerId);
        batchCount++; totalWrites++;
      }

      if (!customerId) continue; // Skip if completely orphaned

      const bookingKey = `${customerId}_${oldBooking.date}_${oldBooking.time}_${oldBooking.service}`;
      if (!existBookSet.has(bookingKey)) {
        const newId = generateId();
        const newDocRef = db.collection('bookings').doc(newId);
        batch.set(newDocRef, {
          customerId: customerId,
          service: oldBooking.service || 'Unknown Service',
          price: parseFloat(oldBooking.price) || 0,
          status: oldBooking.status || 'PENDING',
          date: oldBooking.date || '',
          time: oldBooking.time || '',
          completedAt: oldBooking.completedAt || null
        });
        existBookSet.add(bookingKey);
        batchCount++; totalWrites++;
      }
      await commitBatchIfNeeded();
    }

    // --- PROCESS REMINDERS ---
    for (const oldReminder of oldReminders) {
      const identifier = oldReminder.phone || oldReminder.name;
      const customerId = customerIdMap.get(identifier);

      if (!customerId) continue;

      const remKey = `${customerId}_${oldReminder.remindDate}_${oldReminder.remindTime}_${oldReminder.type}`;
      if (!existRemSet.has(remKey)) {
        const newId = generateId();
        const newDocRef = db.collection('reminders').doc(newId);
        batch.set(newDocRef, {
          customerId: customerId,
          sentAt: oldReminder.sentAt || '',
          remindDate: oldReminder.remindDate || '',
          remindTime: oldReminder.remindTime || '',
          type: oldReminder.type || '',
          status: oldReminder.status || 'Scheduled'
        });
        existRemSet.add(remKey);
        batchCount++; totalWrites++;
      }
      await commitBatchIfNeeded();
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`🎉 Safe Migration Completed! Total new records written: ${totalWrites}`);
    console.log(`ℹ️ Note: The legacy saloon/state document was left intact as requested.`);
  } catch (error) {
    console.error("❌ FATAL ERROR during migration:", error);
  }
}

migrateData();
