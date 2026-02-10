
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { runNotificationChecks } = require("./src/notifications");


// Initialize Firebase Admin SDK
admin.initializeApp();

const storage = admin.storage();
const bucket = storage.bucket("tenanttracker-u4wuw.appspot.com");

/**
 * Initializes Eventarc by deploying a simple Firestore-triggered function.
 * This function triggers when a document is created in the "dummy" collection.
 */
exports.initializeEventarc = onDocumentCreated("dummy/{docId}", (event) => {
  const docId = event.params.docId;
  console.log(`Eventarc initialized by trigger from dummy document: ${docId}`);
  return null;
});

// Expose the notification runner as a callable function
exports.notificationRunner = functions.https.onRequest(async (req, res) => {
    // Set CORS headers for preflight and actual requests
    res.set("Access-Control-Allow-Origin", "*"); 
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    console.log("Manual trigger of notification checks received.");
    try {
        await runNotificationChecks();
        console.log("Successfully completed manual notification checks.");
        res.status(200).json({ success: true, message: "Notification checks completed successfully." });
    } catch (error) {
        console.error("Error running manual notification checks:", error);
        res.status(500).json({ success: false, message: "An error occurred during notification checks." });
    }
});


// Scheduled function to run every 1 minute for timely notifications
exports.timelyNotificationRunner = onSchedule("every 1 minutes", async (event) => {
    console.log("Running timely notification checks...");
    try {
        await runNotificationChecks();
        console.log("Successfully completed timely notification checks.");
    } catch (error) {
        console.error("Error running timely notification checks:", error);
    }
    return null;
});
