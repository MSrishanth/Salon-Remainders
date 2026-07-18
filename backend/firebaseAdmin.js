import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Parse from base64 string provided in Render environment variables
    const decodedKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decodedKey);
  } else {
    // Fallback to local file for development
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } else {
      console.warn("⚠️ WARNING: FIREBASE_SERVICE_ACCOUNT_KEY not set and serviceAccountKey.json not found.");
    }
  }
} catch (error) {
  console.error("❌ ERROR initializing Firebase credentials:", error);
}

// Initialize Firebase App if credentials exist
let db;
if (serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount)
  });
  db = getFirestore();
  console.log("✅ Firebase Admin initialized successfully.");
} else {
  console.error("❌ Failed to initialize Firebase Admin. Database operations will fail.");
}

export { db };
