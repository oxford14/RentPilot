'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const adminDb = getFirestore();
const adminStorage = getStorage();

export async function getUploadedContractAsBase64(tenantId: string): Promise<string | null> {
  const tenantDocRef = adminDb.collection('tenants').doc(tenantId);
  const tenantDoc = await tenantDocRef.get();

  if (!tenantDoc.exists) {
    throw new Error('Tenant not found');
  }

  const tenantData = tenantDoc.data();
  const contractUrl = tenantData?.contractUrl;

  if (!contractUrl) {
    return null;
  }

  try {
    const decodedUrl = decodeURIComponent(contractUrl);
    const pathRegex = /\/o\/(.*?)\?alt=media/;
    const match = decodedUrl.match(pathRegex);
    if (!match || !match[1]) {
      throw new Error('Could not parse file path from URL.');
    }
    const filePath = match[1];
    
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);
    const [contents] = await file.download();
    
    return contents.toString('base64');
  } catch (error) {
    console.error("Error downloading file from storage:", error);
    throw new Error("Failed to retrieve contract file.");
  }
}
