
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

        await outputFile.makePublic();
        const publicUrl = outputFile.publicUrl();

        res.status(200).send({
            message: "Contract generated successfully!",
            downloadURL: publicUrl,
        });

    } catch (error) {
        console.error("Error generating contract:", error);
        res.status(500).send(`An internal error occurred.`);
    }
});


exports.addSignatureToPdf = functions.https.onRequest(async (req, res) => {
  // Set CORS headers for preflight and actual requests
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // End preflight request successfully
    res.status(204).send("");
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Validate request body for signature image
    const { inputPath, outputPath, signatureImage, x, y } = req.body;
    if (!inputPath || !outputPath || !signatureImage || x === undefined || y === undefined) {
      res.status(400).send("Missing required parameters: inputPath, outputPath, signatureImage, x, y.");
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
    
    // Embed the signature image
    const signatureImageBytes = Buffer.from(signatureImage.split(',')[1], 'base64');
    const embeddedImage = await pdfDoc.embedPng(signatureImageBytes);
    
    // Get the last page and add the signature image
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    lastPage.drawImage(embeddedImage, {
      x: parsedX,
      y: parsedY,
      width: 150, // Standard signature width
      height: 75, // Standard signature height
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
        if (key && value) {
            acc[key.trim()] = value;
        }
        return acc;
    }, {});
    
    const timestamp = signatureParts.t;
    const signature = signatureParts.li || signatureParts.te; // li for live, te for test
  
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
    const eventType = event.attributes.type;
    const eventData = event.attributes.data;

    // Handle Payment Intent Succeeded (Direct QR Ph)
    if (eventType === 'payment_intent.succeeded') {
        const paymentIntent = eventData;
        const metadata = paymentIntent.attributes.metadata;
        const paymentType = metadata?.paymentType;

        if (paymentType === 'subscription') {
            const { clientId, clientName, planName, amount: amountStr } = metadata;
            const amount = parseFloat(amountStr);

            if (!clientId) {
                console.error("Subscription webhook (payment_intent) received without clientId.");
                return res.status(400).send("Missing clientId for subscription.");
            }
             try {
                const clientRef = admin.firestore().collection('clients').doc(clientId);
                await admin.firestore().runTransaction(async (transaction) => {
                    const clientDoc = await transaction.get(clientRef);
                    if (!clientDoc.exists) throw new Error(`Client ${clientId} not found.`);
                    
                    const clientData = clientDoc.data();
                    const monthsPaid = 1; 
                    const currentEndDate = clientData.subscriptionEndDate ? new Date(clientData.subscriptionEndDate) : new Date();
                    const newBaseDate = new Date(Math.max(currentEndDate.getTime(), Date.now()));
                    newBaseDate.setMonth(newBaseDate.getMonth() + monthsPaid);

                    transaction.update(clientRef, {
                        subscriptionEndDate: newBaseDate.toISOString(),
                        subscriptionStatus: 'active',
                        subscriptionPlanName: planName,
                        subscriptionRate: amount,
                    });
                });
                console.log(`Subscription for client ${clientId} (${clientName}) updated successfully via Payment Intent.`);
            } catch (dbError) {
                console.error("Error updating client subscription from Payment Intent:", dbError);
                return res.status(500).send("Internal server error during subscription processing.");
            }
        } else if (paymentType === 'rent') {
            const { tenantId, clientId } = metadata;
            const amountPaid = paymentIntent.attributes.amount / 100;
    
            if (!tenantId || !clientId) {
              console.error("Rent webhook (payment_intent) received without tenantId or clientId.");
              return res.status(400).send("Missing metadata.");
            }
            
            try {
              const paymentRecord = {
                tenantId,
                clientId,
                date: new Date(paymentIntent.attributes.paid_at * 1000).toISOString(),
                amount: amountPaid,
                paymentMethod: 'Paymongo',
                checkNumber: `Paymongo QR: ${paymentIntent.id}`,
                discountApplied: 0,
                discountDescription: '',
              };
      
              const paymentsRef = admin.firestore().collection('payments');
              const q = paymentsRef.where('checkNumber', '==', `Paymongo QR: ${paymentIntent.id}`).limit(1);
              const existingPayment = await q.get();
      
              if (existingPayment.empty) {
                  await paymentsRef.add(paymentRecord);
                  console.log(`Payment of ${amountPaid} for tenant ${tenantId} successfully recorded via Payment Intent.`);
              } else {
                  console.log(`Duplicate webhook for Payment Intent ${paymentIntent.id} ignored.`);
              }
            } catch (dbError) {
              console.error("Error writing payment to Firestore from Payment Intent:", dbError);
              return res.status(500).send("Internal server error while processing payment.");
            }
        }
    } 
    // Handle Link Payment Paid (Click-to-Pay)
    else if (eventType === 'link.payment.paid') {
        const paymentLink = eventData;
        const payment = paymentLink.attributes.payments[0];
        if (!payment || payment.attributes.status !== 'paid') {
            console.log("Webhook received for payment link, but no successful payment found or status is not 'paid'.");
            return res.status(200).send("No successful payment to process.");
        }
        
        let metadata;
        try {
            metadata = JSON.parse(paymentLink.attributes.remarks);
        } catch (e) {
            console.error("Error parsing metadata from remarks:", paymentLink.attributes.remarks, e);
            return res.status(400).send("Invalid metadata format.");
        }
        
        const paymentType = metadata?.paymentType;

        if (paymentType === 'subscription') {
            const { clientId, clientName, planName, amount: amountStr } = metadata;
            const amount = parseFloat(amountStr);

            if (!clientId) {
                console.error("Subscription webhook (payment_link) received without clientId.");
                return res.status(400).send("Missing clientId for subscription.");
            }
             try {
                const clientRef = admin.firestore().collection('clients').doc(clientId);
                await admin.firestore().runTransaction(async (transaction) => {
                    const clientDoc = await transaction.get(clientRef);
                    if (!clientDoc.exists) throw new Error(`Client ${clientId} not found.`);
                    
                    const clientData = clientDoc.data();
                    const monthsPaid = 1;
                    const currentEndDate = clientData.subscriptionEndDate ? new Date(clientData.subscriptionEndDate) : new Date();
                    const newBaseDate = new Date(Math.max(currentEndDate.getTime(), Date.now()));
                    newBaseDate.setMonth(newBaseDate.getMonth() + monthsPaid);

                    transaction.update(clientRef, {
                        subscriptionEndDate: newBaseDate.toISOString(),
                        subscriptionStatus: 'active',
                        subscriptionPlanName: planName,
                        subscriptionRate: amount,
                    });
                });
                console.log(`Subscription for client ${clientId} (${clientName}) updated successfully via Payment Link.`);
            } catch (dbError) {
                console.error("Error updating client subscription from Payment Link:", dbError);
                return res.status(500).send("Internal server error while processing subscription.");
            }

        } else if (paymentType === 'rent') {
            const { tenantId, clientId } = metadata;
            const amountPaid = payment.attributes.amount / 100;
    
            if (!tenantId || !clientId) {
              console.error("Rent webhook (payment_link) received without tenantId or clientId.");
              return res.status(400).send("Missing metadata.");
            }
            
            try {
              const paymentRecord = {
                tenantId,
                clientId,
                date: new Date(payment.attributes.paid_at * 1000).toISOString(),
                amount: amountPaid,
                paymentMethod: 'Paymongo',
                checkNumber: `Paymongo Link: ${paymentLink.id}`,
                discountApplied: 0,
                discountDescription: '',
              };
      
              const paymentsRef = admin.firestore().collection('payments');
              const q = paymentsRef.where('checkNumber', '==', `Paymongo Link: ${paymentLink.id}`).limit(1);
              const existingPayment = await q.get();
      
              if (existingPayment.empty) {
                  await paymentsRef.add(paymentRecord);
                  console.log(`Payment of ${amountPaid} for tenant ${tenantId} successfully recorded via Payment Link.`);
              } else {
                  console.log(`Duplicate webhook for Payment Link ${paymentLink.id} ignored.`);
              }
            } catch (dbError) {
              console.error("Error writing payment to Firestore from Payment Link:", dbError);
              return res.status(500).send("Internal server error while processing payment.");
            }
        }
    }
  
    res.status(200).send("Webhook received.");
});
