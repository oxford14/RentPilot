
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

// Initialize Firebase Admin SDK
admin.initializeApp();

const storage = admin.storage();
const bucket = storage.bucket();

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

exports.viewContract = functions.https.onRequest(async (req, res) => {
  // Set CORS headers to allow requests from any origin
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    // Pre-flight request. Reply successfully:
    res.status(204).send("");
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  let filePath = req.query.path;
  if (!filePath || typeof filePath !== 'string') {
    res.status(400).send("File path is required.");
    return;
  }

  try {
    // FIX: Remove query parameters from the file path string
    const queryIndex = filePath.indexOf('?');
    if (queryIndex !== -1) {
        filePath = filePath.substring(0, queryIndex);
    }

    const file = bucket.file(decodeURIComponent(filePath));
    const [exists] = await file.exists();
    if (!exists) {
        res.status(404).send('File not found in Firebase Storage.');
        return;
    }
    
    // Download the file into a buffer
    const [pdfBytes] = await file.download();

    // Set headers to display the PDF inline in the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.status(200).send(pdfBytes);

  } catch (error) {
    console.error("Error getting PDF:", error);
    res.status(500).send("An internal server error occurred while retrieving the PDF.");
  }
});
