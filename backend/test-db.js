import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('/Users/mkeerthana/Downloads/shobana-hair-saloon-firebase-adminsdk-fbsvc-28740823d8.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const snapshot = await db.collection('bookings').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.time === '4:30 PM' || data.time === '2:00 PM') {
      console.log(doc.id, data.time, data.status, data.reminded1Hour, data.reminded15Min);
    }
  });
  process.exit(0);
}
run();
