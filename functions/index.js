
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

exports.generateContract = functions.https.onRequest(async (req, res) => {
    // Set CORS headers for preflight and actual requests
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { contractText, signatureDataUrl, outputPath } = req.body;
        if (!contractText || !signatureDataUrl || !outputPath) {
            return res.status(400).send("Missing required parameters.");
        }

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const fontSize = 10;
        const margin = 50;
        const lineHeight = fontSize * 1.5;

        // Simple text wrapping logic
        const textWidth = width - 2 * margin;
        let y = height - margin;
        const paragraphs = contractText.split('\n');
        
        for (const paragraph of paragraphs) {
            if (y < margin + lineHeight) {
                page = pdfDoc.addPage();
                y = height - margin;
            }

            if (paragraph.trim() === '') {
                y -= lineHeight;
                continue;
            }
            
            const words = paragraph.split(' ');
            let line = '';
            for (const word of words) {
                const testLine = line + word + ' ';
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);
                if (testWidth > textWidth) {
                    page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
                    y -= lineHeight;
                    if (y < margin) {
                        page = pdfDoc.addPage();
                        y = height - margin;
                    }
                    line = word + ' ';
                } else {
                    line = testLine;
                }
            }
            page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
            y -= lineHeight;
        }

        // Add signature
        const signatureImageBytes = Buffer.from(signatureDataUrl.split(',')[1], 'base64');
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        const sigDims = signatureImage.scale(0.25);

        if (y < margin + sigDims.height + lineHeight) {
            page = pdfDoc.addPage();
            y = height - margin;
        }
        
        page.drawText('Tenant Signature:', { x: margin, y: y - 20, font, size: fontSize });
        page.drawImage(signatureImage, {
            x: margin,
            y: y - 25 - sigDims.height,
            width: sigDims.width,
            height: sigDims.height,
        });

        const pdfBytes = await pdfDoc.save();
        const outputFile = bucket.file(outputPath);
        await outputFile.save(Buffer.from(pdfBytes), { metadata: { contentType: "application/pdf" } });
        
        // Generate a long-lived signed URL for read access instead of making the file public
        const [signedUrl] = await outputFile.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // A far-future date
        });

        res.status(200).send({
            message: "Contract generated successfully!",
            downloadURL: signedUrl,
        });

    } catch (error) {
        console.error("Error generating contract:", error);
        res.status(500).send(`An internal error occurred.`);
    }
});
