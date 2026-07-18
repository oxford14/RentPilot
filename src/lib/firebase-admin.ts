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

function parseInlineServiceAccount(
  raw: string
): admin.ServiceAccount | null {
  let value = raw.trim();
  if (!value) {
    return null;
  }

  // Some hosts (or a careless copy/paste) wrap the value in surrounding
  // quotes. Strip a single matching pair so the JSON/base64 detection works.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  // Support both raw JSON and base64-encoded JSON (recommended on Vercel, where
  // multi-line secrets are easier to store base64-encoded).
  let jsonText = value;
  if (!value.startsWith('{')) {
    // Strip any whitespace/newlines that a textarea paste may have inserted
    // into the base64 blob before decoding.
    const compact = value.replace(/\s+/g, '');
    jsonText = Buffer.from(compact, 'base64').toString('utf8').trim();
  }

  if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
    console.error(
      '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY is set but is neither valid JSON nor base64-encoded JSON. ' +
        `Received a value of length ${raw.length} starting with "${raw.trim().slice(0, 12)}". ` +
        'Set it to the full service-account JSON, or its base64 encoding.'
    );
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as admin.ServiceAccount & {
      private_key?: string;
    };
    // Guard against `\n` in the private key not being unescaped (can happen if
    // the JSON was hand-edited). admin.credential.cert requires real newlines.
    if (parsed.private_key && parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (error) {
    console.error(
      '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY looked like JSON but failed to parse:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

function loadServiceAccountFromEnv(): admin.ServiceAccount | null {
  // 1) Prefer inline JSON from the environment. This is the reliable path on
  //    serverless hosts like Vercel, where the local service-account file is
  //    gitignored and therefore not deployed.
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inlineJson) {
    const parsed = parseInlineServiceAccount(inlineJson);
    if (parsed) {
      return parsed;
    }
  }

  // 2) Fall back to a credentials file, but only when it actually exists. On
  //    Vercel, GOOGLE_APPLICATION_CREDENTIALS may point to a file that was
  //    never deployed, so guard against that instead of throwing ENOENT.
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(process.cwd(), explicitPath);
    if (fs.existsSync(resolved)) {
      return loadServiceAccountFromFile(resolved);
    }
  }

  if (fs.existsSync(DEFAULT_SERVICE_ACCOUNT_FILE)) {
    return loadServiceAccountFromFile(DEFAULT_SERVICE_ACCOUNT_FILE);
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
    'Firebase Admin is not configured. Set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable to your service account JSON (Firebase Console → Project settings → Service accounts → Generate new private key). On Vercel, add it under Project → Settings → Environment Variables. Locally, you can instead save the JSON as firebase-service-account.json in the project root. This is required for username/password login and server-side Firestore writes.'
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
