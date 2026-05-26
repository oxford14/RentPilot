import * as admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tenanttracker-u4wuw';

function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    });
  }

  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add your Firebase service account JSON to .env.local for PayMongo webhooks.'
  );
}

export function getAdminDb() {
  initFirebaseAdmin();
  return admin.firestore();
}
