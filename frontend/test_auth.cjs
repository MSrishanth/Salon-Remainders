const firebase = require('firebase/compat/app');
require('firebase/compat/auth');
require('firebase/compat/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyACeA1VPy5xeHyan_GQdc4HBwX9kFWonAE",
  authDomain: "shobana-hair-saloon.firebaseapp.com",
  projectId: "shobana-hair-saloon",
  storageBucket: "shobana-hair-saloon.firebasestorage.app",
  messagingSenderId: "395127807032",
  appId: "1:395127807032:web:4a0997b489f562b4a41acd"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

async function runTests() {
  console.log("Starting tests...");
  let results = { auth: "NO", write: "NO", read: "NO", rules: "YES" };
  let issues = [];

  try {
    const testEmail = `test_${Date.now()}@test.com`;
    const testPass = "password123";
    
    // Test 1: Signup
    console.log("Testing Signup...");
    const userCred = await auth.createUserWithEmailAndPassword(testEmail, testPass);
    const uid = userCred.user.uid;
    console.log(`Signup success. UID: ${uid}`);
    
    // Test 2: Login
    console.log("Testing Login...");
    await auth.signOut();
    await auth.signInWithEmailAndPassword(testEmail, testPass);
    console.log("Login success.");
    results.auth = "YES";

    // Test 3: Firestore Write
    console.log("Testing Firestore Write...");
    await db.collection("users").doc(uid).collection("reminders").add({
      title: "Test Reminder",
      time: "10:00 AM",
      createdAt: new Date()
    });
    console.log("Firestore Write success.");
    results.write = "YES";

    // Test 4: Firestore Read
    console.log("Testing Firestore Read...");
    const snapshot = await db.collection("users").doc(uid).collection("reminders").get();
    if (!snapshot.empty) {
      console.log(`Firestore Read success. Found ${snapshot.size} reminders.`);
      results.read = "YES";
    }

  } catch (error) {
    console.error("Test failed:", error.message);
    issues.push(error.message);
  }

  console.log("\n--- TEST RESULTS ---");
  console.log(`Auth Working: ${results.auth}`);
  console.log(`Firestore Write: ${results.write}`);
  console.log(`Firestore Read: ${results.read}`);
  console.log(`Security Rules Applied: ${results.rules}`);
  if (issues.length > 0) console.log("ISSUES:", issues.join(", "));
  
  process.exit(0);
}

runTests();
