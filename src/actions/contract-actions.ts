
'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Ensure Firebase Admin is initialized
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Securely fetches an uploaded contract PDF from Firebase Storage as a Base64 string.
 * This function is designed to be called from the server-side components or pages.
 * @param contractUrl The full HTTPS download URL of the contract in Firebase Storage.
 * @returns A Base64 encoded string of the PDF, or null if an error occurs.
 */
export async function getUploadedContractAsBase64(contractUrl: string): Promise<string | null> {
  if (!contractUrl) {
    console.error("getUploadedContractAsBase64 received an empty contractUrl.");
    return null;
  }

  try {
    // Explicitly specify the CORRECT bucket name from the user's screenshot.
    const bucket = getStorage().bucket('tenanttracker-u4wuw.firebasestorage.app');

    // Use a regular expression to robustly extract the file path.
    // This looks for the content between `/o/` and `?alt=media`.
    const filePathRegex = /\/o\/(.+)\?alt=media/;
    const match = contractUrl.match(filePathRegex);

    if (!match || match.length < 2) {
      console.error("Invalid Firebase Storage URL format. Could not extract file path using regex.", { contractUrl });
      return null;
    }
    
    // The captured group is URL-encoded, so we need to decode it.
    const filePath = decodeURIComponent(match[1]);

    const file = bucket.file(filePath);
    const [fileExists] = await file.exists();

    if (!fileExists) {
      console.error(`File does not exist at path: ${filePath}`);
      return null;
    }

    const [pdfBuffer] = await file.download();

    // Convert the buffer to a Base64 string to be sent to the client.
    return pdfBuffer.toString('base64');

  } catch (error: any) {
    console.error("Error downloading contract from Firebase Storage:", error);
    if (error.code) {
      console.error(`Firebase Storage Error Code: ${error.code}`);
    }
    return null;
  }
}
