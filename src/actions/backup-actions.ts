
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
        const mimeType = 'application/json';

        // Google Apps Script web apps handle POST data differently. We need to construct a form data payload.
        // Using fetch with application/x-www-form-urlencoded header will make the parameters
        // available in the `e.parameter` object of the `doPost(e)` function.
        const formData = new URLSearchParams();
        formData.append('file', fileContent);
        formData.append('filename', filename);
        formData.append('mimeType', mimeType);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            // Apps Script web apps often perform a redirect, which fetch handles automatically.
            // The final response body is what we need to parse.
        });
        
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || `Request failed with status ${response.status}`);
        }

        return { success: true, fileUrl: result.fileUrl };

    } catch (error: any) {
        console.error("Error pushing backup to Google Drive:", error);
        return { success: false, error: error.message };
    }
}
