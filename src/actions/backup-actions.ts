
'use server';

import { format } from 'date-fns';

export async function pushBackupToGoogleDrive(backupData: any): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    const url = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

    if (!url) {
        console.error("Google Apps Script URL is not configured in .env");
        return { success: false, error: "Server configuration error: Google Apps Script URL is missing. Please set it in your .env file." };
    }

    try {
        const filename = `rentpilot-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
        const fileContent = JSON.stringify(backupData, null, 2);
        const base64Content = Buffer.from(fileContent).toString('base64');
        const mimeType = 'application/json';

        const payload = {
            file: base64Content,
            filename: filename,
            mimeType: mimeType,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const result = await response.json();

            if (!response.ok || !result.success) {
                // If the script returned success: false, use its error message.
                throw new Error(result.error || `Request failed with status ${response.status}`);
            }

            return { success: true, fileUrl: result.fileUrl };
        } else {
            // The response is not JSON, so it's likely a Google auth page or some other HTML error.
            const textResponse = await response.text();
            console.error("Non-JSON response from Google Apps Script:", textResponse);
            throw new Error("Received an unexpected response from the backup server. This often happens due to incorrect Apps Script permissions. Please ensure it's deployed to be accessible by 'Anyone' (even anonymous).");
        }

    } catch (error: any) {
        console.error("Error pushing backup to Google Drive:", error);
        return { success: false, error: error.message };
    }
}
