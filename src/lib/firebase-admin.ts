import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tenanttracker-u4wuw';

function isCloudRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FIREBASE_CONFIG ||
      process.env.GCLOUD_PROJECT ||
      process.env.FUNCTIONS_EMULATOR
  );
}

const DEFAULT_SERVICE_ACCOUNT_FILE = path.join(
  process.cwd(),
  'firebase-service-account.json'
);

function loadServiceAccountFromFile(filePath: string): admin.ServiceAccount {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const fileContents = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(fileContents) as admin.ServiceAccount;
}

function loadServiceAccountFromEnv(): admin.ServiceAccount | null {
  const credentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    (fs.existsSync(DEFAULT_SERVICE_ACCOUNT_FILE)
      ? './firebase-service-account.json'
      : '');

  if (credentialsPath) {
    return loadServiceAccountFromFile(credentialsPath);
  }

  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (inlineJson && inlineJson.startsWith('{') && inlineJson.endsWith('}')) {
    return JSON.parse(inlineJson) as admin.ServiceAccount;
  }

  return null;
}

function initFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccount = loadServiceAccountFromEnv();
  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID,
    });
  }

  if (isCloudRuntime()) {
    return admin.initializeApp({ projectId: PROJECT_ID });
  }

  throw new Error(
    'Firebase Admin is not configured for local PayMongo subscription updates. Save your service account JSON as firebase-service-account.json in the project root (same JSON from Firebase Console → Service accounts). This is not used for username/password login — only for the server to update subscription status in Firestore after payment.'
  );
}

export function getAdminDb() {
  initFirebaseAdmin();
  return admin.firestore();
}

export function getAdminAuth() {
  initFirebaseAdmin();
  return admin.auth();
}
