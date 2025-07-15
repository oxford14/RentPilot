
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


// Scheduled function to run every 5 minutes for timely notifications
exports.timelyNotificationRunner = onSchedule("every 5 minutes", async (event) => {
    console.log("Running timely notification checks...");
    try {
        await runNotificationChecks();
        console.log("Successfully completed timely notification checks.");
    } catch (error) {
        console.error("Error running timely notification checks:", error);
    }
    return null;
});


exports.addSignatureToPdf = functions.https.onRequest(async (req, res) => {
  // Set CORS headers for preflight and actual requests
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Validate request body
    const { inputPath, outputPath, signatureText, x, y } = req.body;
    if (!inputPath || !outputPath || !signatureText || x === undefined || y === undefined) {
      res.status(400).send("Missing required parameters: inputPath, outputPath, signatureText, x, y.");
      return;
    }
    
    const parsedX = parseFloat(x);
    const parsedY = parseFloat(y);
    if (isNaN(parsedX) || isNaN(parsedY)) {
        res.status(400).send("Invalid coordinates: x and y must be numbers.");
        return;
    }

    // Download the original PDF from Firebase Storage
    const inputFile = bucket.file(inputPath);
    const [pdfBytes] = await inputFile.download();

    // Load the PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Embed a standard font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Get the first page and add the signature text
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    firstPage.drawText(signatureText, {
      x: parsedX,
      y: parsedY,
      font: helveticaFont,
      size: 12,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Save the modified PDF to a new buffer
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Upload the new PDF back to Firebase Storage
    const outputFile = bucket.file(outputPath);
    await outputFile.save(Buffer.from(modifiedPdfBytes), {
        metadata: {
            contentType: "application/pdf",
        },
    });

    // Send a success response
    res.status(200).send({
      message: "PDF signed successfully!",
      outputPath: outputPath,
    });

  } catch (error) {
    console.error("Error processing PDF:", error);
    if (error.code === 404) {
        res.status(404).send("Input file not found in Firebase Storage.");
    } else {
        res.status(500).send("An internal error occurred while processing the PDF.");
    }
  }
});
