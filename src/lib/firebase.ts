// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // Keep for future Firebase Auth integration

// =================================================================================
// This configuration is now loaded from environment variables.
// Populate your .env.local file with the values from your Firebase project.
// To get this:
// 1. Go to your Firebase Console: https://console.firebase.google.com/
// 2. Select your project.
// 3. Click the gear icon (Project settings) in the top left.
// 4. In the "Your apps" card, select your web app.
// 5. Under "SDK setup and configuration", choose "Config".
// 6. Copy the corresponding values into your .env file.
// =================================================================================
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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
const auth = getAuth(app); // Uncomment when Firebase Auth is integrated

export { app, db, storage, auth };
