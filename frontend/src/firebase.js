import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyACeA1VPy5xeHyan_GQdc4HBwX9kFWonAE",
  authDomain: "shobana-hair-saloon.firebaseapp.com",
  projectId: "shobana-hair-saloon",
  storageBucket: "shobana-hair-saloon.firebasestorage.app",
  messagingSenderId: "395127807032",
  appId: "1:395127807032:web:4a0997b489f562b4a41acd",
  measurementId: "G-HK19F7EQXK"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

export { db };
export default firebase;
