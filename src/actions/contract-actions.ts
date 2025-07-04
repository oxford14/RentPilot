
'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const adminDb = getFirestore();

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
    // The contractUrl is a public download URL with a token. We can fetch it directly.
    const response = await fetch(contractUrl);
    if (!response.ok) {
        // Log the error for more detailed debugging if needed
        const errorBody = await response.text();
        console.error(`Failed to fetch contract file with status ${response.status}: ${errorBody}`);
        throw new Error(`Failed to fetch contract file. Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error("Error downloading file from storage URL:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to retrieve contract file: ${error.message}`);
    }
    throw new Error("Failed to retrieve contract file due to an unknown error.");
  }
}
