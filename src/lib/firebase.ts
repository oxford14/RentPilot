
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAuth } from "firebase/auth"; // Keep for future Firebase Auth integration

// =================================================================================
// This configuration MUST be from your Firebase project settings.
// To get this:
// 1. Go to your Firebase Console: https://console.firebase.google.com/
// 2. Select your project.
// 3. Click the gear icon (Project settings) in the top left.
// 4. In the "Your apps" card, select your web app.
// 5. Under "SDK setup and configuration", choose "Config".
// 6. Copy the entire 'firebaseConfig' object and paste it below.
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
