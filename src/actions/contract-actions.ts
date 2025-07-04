
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
    // Get a reference to the default bucket from the initialized app.
    const bucket = getStorage().bucket();

    // Extract the file path from the full HTTPS URL.
    // Example URL: https://firebasestorage.googleapis.com/v0/b/bucket-name/o/folder%2Ffile.pdf?alt=media&token=...
    const url = new URL(contractUrl);
    const pathName = url.pathname;
    
    // The actual file path is after the '/o/' part and is URL-encoded.
    const pathParts = pathName.split('/o/');
    if (pathParts.length < 2) {
      console.error("Invalid Firebase Storage URL format. Could not extract file path.", { contractUrl });
      return null;
    }
    const filePath = decodeURIComponent(pathParts[1]);

    // Download the file into a buffer
    const file = bucket.file(filePath);
    const [pdfBuffer] = await file.download();

    // Convert the buffer to a Base64 string to be sent to the client.
    return pdfBuffer.toString('base64');

  } catch (error: any) {
    console.error("Error downloading contract from Firebase Storage:", error);
    // Log the specific error code if available, which is helpful for debugging permissions.
    if (error.code) {
      console.error(`Firebase Storage Error Code: ${error.code}`);
    }
    // Return null to allow the frontend to handle the error gracefully.
    return null;
  }
}
