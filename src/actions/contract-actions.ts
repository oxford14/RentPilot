
'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This file's functions are deprecated in favor of a direct client-side fetch,
// but the file is kept to avoid breaking imports in other files if they exist.
// The functions will be removed in a future update.

if (getApps().length === 0) {
  initializeApp();
}

const adminDb = getFirestore();

/**
 * @deprecated This function is no longer recommended. The client should fetch the public URL directly.
 */
export async function getUploadedContractAsBase64(tenantId: string): Promise<string | null> {
  console.warn("getUploadedContractAsBase64 is deprecated and should not be used.");
  return null;
}
