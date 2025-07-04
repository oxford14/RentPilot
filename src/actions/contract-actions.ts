
'use server';

// This action no longer needs firebase-admin, simplifying the logic.

/**
 * Securely fetches an uploaded contract PDF from its public Firebase Storage URL as a Base64 string.
 * This function is designed to be called from the server-side components or pages.
 * It acts as a proxy to fetch the file, avoiding client-side CORS issues.
 * @param contractUrl The full HTTPS download URL of the contract in Firebase Storage.
 * @returns A Base64 encoded string of the PDF, or null if an error occurs.
 */
export async function getUploadedContractAsBase64(contractUrl: string): Promise<string | null> {
  if (!contractUrl) {
    console.error("getUploadedContractAsBase64 received an empty contractUrl.");
    return null;
  }

  try {
    // Use a standard fetch request to download the file from its public URL.
    // This bypasses the need for Admin SDK authentication on the server for this specific task.
    const response = await fetch(contractUrl);

    if (!response.ok) {
      console.error(`Failed to fetch contract from URL. Status: ${response.status}`, { contractUrl });
      return null;
    }

    // Get the response body as an ArrayBuffer.
    const pdfArrayBuffer = await response.arrayBuffer();

    // Convert the ArrayBuffer to a Buffer, then to a Base64 string to be sent to the client.
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    return pdfBuffer.toString('base64');

  } catch (error: any) {
    console.error("Error fetching contract via URL:", error);
    return null;
  }
}
