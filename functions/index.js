
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { runNotificationChecks } = require("./src/notifications");
const crypto = require('crypto');


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


exports.paymongoWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
  
    // It's recommended to store secrets in environment configuration
    // For this example, we'll assume it's set up in Firebase Functions config
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("PayMongo webhook secret is not set in function config.");
      res.status(500).send("Webhook configuration error.");
      return;
    }
  
    // --- Signature Verification ---
    const signatureHeader = req.get("Paymongo-Signature") || "";
    const signatureParts = signatureHeader.split(',').reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[key.trim()] = value;
        return acc;
    }, {});
    
    const timestamp = signatureParts.t;
    const liveSignature = signatureParts.li;
    const testSignature = signatureParts.te;
    const signature = liveSignature || testSignature; // Use live or test signature
  
    if (!timestamp || !signature) {
      console.error("Missing signature parts.");
      res.status(400).send("Invalid signature header.");
      return;
    }
  
    const payload = JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');
  
    if (signature !== expectedSignature) {
      console.error("Signature verification failed.");
      res.status(403).send("Signature verification failed.");
      return;
    }
    
    // --- Handle Event ---
    const event = req.body.data;
  
    if (event.attributes.type === 'payment.paid') {
      const payment = event.attributes.data;
      const source = payment.attributes.source;
  
      if (source && source.type === 'source' && payment.attributes.status === 'paid') {
        const metadata = source.attributes.metadata;
        
        if (metadata && metadata.paymentType === 'subscription') {
            const { clientId, clientName, planName, amount: amountStr } = metadata;
            const amount = parseFloat(amountStr);

            if (!clientId) {
                console.error("Subscription webhook received without clientId in metadata.");
                res.status(400).send("Missing clientId for subscription.");
                return;
            }

            try {
                const clientRef = admin.firestore().collection('clients').doc(clientId);
                
                await admin.firestore().runTransaction(async (transaction) => {
                    const clientDoc = await transaction.get(clientRef);
                    if (!clientDoc.exists) {
                        throw new Error(`Client ${clientId} not found.`);
                    }

                    const clientData = clientDoc.data();
                    
                    // For any subscription payment (new or renewal), we add 1 month.
                    const monthsPaid = 1;

                    const currentEndDate = clientData.subscriptionEndDate ? new Date(clientData.subscriptionEndDate) : new Date();
                    // If subscription is expired, start new period from today. Otherwise, extend from the current end date.
                    const newBaseDate = new Date(Math.max(currentEndDate.getTime(), Date.now()));
                    
                    newBaseDate.setMonth(newBaseDate.getMonth() + monthsPaid);

                    transaction.update(clientRef, {
                        subscriptionEndDate: newBaseDate.toISOString(),
                        subscriptionStatus: 'active',
                        subscriptionPlanName: planName, // Set the new plan name from metadata
                        subscriptionRate: amount, // Set the new rate from metadata
                    });
                });
                
                console.log(`Subscription for client ${clientId} (${clientName}) updated to ${planName} and extended successfully.`);
                
            } catch (dbError) {
                console.error("Error updating client subscription:", dbError);
                res.status(500).send("Internal server error while processing subscription.");
                return;
            }

        } else {
            const { tenantId, clientId } = metadata;
            const amountPaid = payment.attributes.amount / 100; // Convert back from centavos
    
            if (!tenantId || !clientId) {
              console.error("Webhook received without tenantId or clientId in metadata.");
              res.status(400).send("Missing metadata.");
              return;
            }
            
            try {
              const paymentData = {
                tenantId,
                clientId,
                date: new Date(payment.attributes.paid_at * 1000).toISOString(),
                amount: amountPaid,
                paymentMethod: 'Paymongo',
                checkNumber: `Paymongo Source: ${source.id}`,
                discountApplied: 0,
                discountDescription: '',
              };
      
              const paymentsRef = admin.firestore().collection('payments');
              const q = paymentsRef.where('checkNumber', '==', `Paymongo Source: ${source.id}`).limit(1);
              const existingPayment = await q.get();
      
              if (existingPayment.empty) {
                  await paymentsRef.add(paymentData);
                  console.log(`Payment of ${amountPaid} for tenant ${tenantId} successfully recorded.`);
              } else {
                  console.log(`Duplicate webhook for source ${source.id} ignored.`);
              }
            } catch (dbError) {
              console.error("Error writing payment to Firestore:", dbError);
              res.status(500).send("Internal server error while processing payment.");
              return;
            }
        }
      }
    }
  
    res.status(200).send("Webhook received.");
});
