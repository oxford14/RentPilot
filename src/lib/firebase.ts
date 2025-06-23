// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAuth } from "firebase/auth"; // Keep for future Firebase Auth integration

// =================================================================================
// IMPORTANT: REPLACE WITH YOUR FIREBASE PROJECT CONFIGURATION
// =================================================================================
// The configuration below is a placeholder. To connect to YOUR Firebase project,
// you must replace this object with the configuration from your Firebase Console.
//
// How to get it:
// 1. Go to your Firebase project: https://console.firebase.google.com/
// 2. Click the gear icon (Project settings) in the top left.
// 3. In the "Your apps" card, select your web app.
// 4. Under "SDK setup and configuration", choose "Config" and copy the object.
// 5. Paste the entire object here to replace the placeholder `firebaseConfig`.
// =================================================================================
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDQQTAoi87lLlDW59SkhWjv9FatQ6bVN3I", // <--- REPLACE
  authDomain: "tenanttracker-u4wuw.firebaseapp.com", // <--- REPLACE
  projectId: "tenanttracker-u4wuw", // <--- REPLACE
  storageBucket: "tenanttracker-u4wuw.appspot.com", // <--- REPLACE
  messagingSenderId: "239178627658", // <--- REPLACE
  appId: "1:239178627658:web:fd0ff48875cdff217fc4b3" // <--- REPLACE
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
