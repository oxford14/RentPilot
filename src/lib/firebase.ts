// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAuth } from "firebase/auth"; // Keep for future Firebase Auth integration

// =================================================================================
// This configuration is now populated with your project's details.
// =================================================================================
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDQQTAoi87lLlDW59SkhWjv9FatQ6bVN3I",
  authDomain: "tenanttracker-u4wuw.firebaseapp.com",
  projectId: "tenanttracker-u4wuw",
  storageBucket: "tenanttracker-u4wuw.appspot.com",
  messagingSenderId: "239178627658",
  appId: "1:239178627658:web:fd0ff48875cdff217fc4b3"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const storage = getStorage(app);
// const auth = getAuth(app); // Uncomment when Firebase Auth is integrated

export { app, db, storage /*, auth */ };
