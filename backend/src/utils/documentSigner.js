const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
const mammoth = require('mammoth');

/**
 * Format date/time for signature
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (Date: YYYY-MM-DD Time: HH:mm:ss)
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `Date: ${year}-${month}-${day} Time: ${hours}:${minutes}:${seconds}`;
}

/**
 * Format role name for display
 * @param {string} role - Role from database
 * @returns {string} Formatted role name
 */
function formatRoleName(role) {
  const roleMap = {
    'section_unit_head': 'Section Unit Head',
    'division_manager': 'Division Manager',
    'regional_director': 'Regional Director'
  };
  return roleMap[role] || role;
}

/**
 * Add signature to PDF document
 * @param {string} originalFilePath - Path to original PDF file
 * @param {string} approverName - Name of the approver
 * @param {string} approverRole - Role of the approver
 * @param {string} outputPath - Path where signed PDF will be saved
 * @param {number} existingSignatureCount - Number of existing signatures (for positioning)
 * @returns {Promise<string>} Path to signed PDF
 */
async function addSignatureToPDF(originalFilePath, approverName, approverRole, outputPath, existingSignatureCount = 0) {
  try {
    // Read the existing PDF
    const existingPdfBytes = fs.readFileSync(originalFilePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Format signature text
    const dateTime = formatDateTime(new Date());
    const roleName = formatRoleName(approverRole);
    const signatureText = `Signed by: ${approverName} - ${roleName} - ${dateTime}`;

    // Calculate position for signature (bottom of page with margin)
    // In PDF coordinates, y=0 is at the bottom, so we position from bottom up
    const margin = 50; // Distance from bottom of page
    const fontSize = 10;
    const lineHeight = 12; // Tight spacing between signature lines (reduced from 15 to 12)
    
    // Use the existingSignatureCount parameter to position this signature correctly
    // Each signature stacks above the previous one
    // The signatureIndex should be the number of existing signatures (0-based)
    // This ensures each new signature is positioned after all previous ones
    const signatureIndex = existingSignatureCount; // 0 for first signature, 1 for second, etc.
    
    // Calculate y position from bottom of page
    // Always start from a fixed position near the bottom and stack upward
    // This ensures signatures are always grouped together at the bottom with minimal gap
    const baseY = margin; // Base position for first signature
    const yPosition = baseY + (signatureIndex * lineHeight);
    
    // Cap the maximum height to ensure signatures don't go too high on the page
    // Allow up to 20 signatures (reasonable limit for a document approval chain)
    const maxSignatures = 20; // Maximum expected signatures per document
    const maxYFromBottom = margin + (maxSignatures * lineHeight);
    const finalY = Math.min(yPosition, maxYFromBottom);
    
    // Add signature text
    lastPage.drawText(signatureText, {
      x: margin,
      y: finalY,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // For debugging: log the position with detailed information
    console.log(`[PDF Signature] Added signature #${signatureIndex + 1} at y=${finalY} (index=${signatureIndex}, baseY=${baseY}, lineHeight=${lineHeight}, yPosition=${yPosition}, maxY=${maxYFromBottom}), page height=${height}, text="${signatureText}"`);

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    return outputPath;
  } catch (error) {
    console.error('Error adding signature to PDF:', error);
    throw error;
  }
}

/**
 * Add signature to DOCX document
 * @param {string} originalFilePath - Path to original DOCX file
 * @param {string} approverName - Name of the approver
 * @param {string} approverRole - Role of the approver
 * @param {string} outputPath - Path where signed DOCX will be saved
 * @param {number} existingSignatureCount - Number of existing signatures (for reference, DOCX always appends)
 * @returns {Promise<string>} Path to signed DOCX
 */
async function addSignatureToDOCX(originalFilePath, approverName, approverRole, outputPath, existingSignatureCount = 0) {
  try {
    // Read the existing DOCX file
    const existingDocxBuffer = fs.readFileSync(originalFilePath);
    
    // Format signature text
    const dateTime = formatDateTime(new Date());
    const roleName = formatRoleName(approverRole);
    const signatureText = `Signed by: ${approverName} - ${roleName} - ${dateTime}`;

    // Create signature paragraph
    const signatureParagraph = new Paragraph({
      children: [
        new TextRun({
          text: signatureText,
          bold: false,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: {
        after: 200,
      },
    });

    // Use mammoth to extract text content from existing DOCX
    // The docx library doesn't easily support reading/modifying existing documents,
    // so we use mammoth to extract text and recreate the document with signatures
    try {
      // Use mammoth to extract text content
      const result = await mammoth.extractRawText({ buffer: existingDocxBuffer });
      const existingText = result.value;
      
      // Create new document with existing text and signature
      // Split text into paragraphs (preserve line breaks)
      const textLines = existingText.split('\n').filter(line => line.trim() || line.length > 0);
      const paragraphs = textLines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) {
          // Empty line - create empty paragraph for spacing
          return new Paragraph({
            children: [new TextRun('')],
            spacing: { after: 100 },
          });
        }
        return new Paragraph({
          children: [new TextRun(trimmedLine)],
        });
      });
      
      // Add signature at the end
      paragraphs.push(signatureParagraph);
      
      const doc = new Document({
        sections: [{
          children: paragraphs,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
      return outputPath;
    } catch (mammothError) {
      console.error('Error with mammoth approach:', mammothError);
      // Final fallback: create minimal document with just signature
      // This preserves at least the signature even if we can't read the original
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun('Note: Original document content could not be fully preserved.')],
            }),
            signatureParagraph,
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
      return outputPath;
    }
  } catch (error) {
    console.error('Error adding signature to DOCX:', error);
    throw error;
  }
}

/**
 * Main function to add signature to document
 * Detects file type and calls appropriate handler
 * @param {string} filePath - Path to document file (original or existing signed version)
 * @param {string} approverName - Name of the approver
 * @param {string} approverRole - Role of the approver
 * @param {number} documentId - Document ID for generating unique output filename
 * @param {number} existingSignatureCount - Number of existing signatures (for positioning)
 * @returns {Promise<string>} Path to signed document
 */
async function addSignatureToDocument(filePath, approverName, approverRole, documentId, existingSignatureCount = 0) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Determine file type from extension
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // Generate output path
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const baseName = path.basename(filePath, fileExtension);
    const outputFileName = `${timestamp}-signed-${documentId}${fileExtension}`;
    const outputPath = path.join(uploadDir, outputFileName);

    // Call appropriate handler based on file type
    if (fileExtension === '.pdf') {
      await addSignatureToPDF(filePath, approverName, approverRole, outputPath, existingSignatureCount);
    } else if (fileExtension === '.docx') {
      await addSignatureToDOCX(filePath, approverName, approverRole, outputPath, existingSignatureCount);
    } else if (fileExtension === '.doc') {
      // For .doc files, we might need conversion or different handling
      // For now, throw error indicating unsupported format
      throw new Error(`Unsupported file format: ${fileExtension}. Please convert to DOCX or PDF.`);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}. Supported formats: PDF, DOCX`);
    }

    return outputPath;
  } catch (error) {
    console.error('Error in addSignatureToDocument:', error);
    throw error;
  }
}

module.exports = {
  addSignatureToDocument,
  addSignatureToPDF,
  addSignatureToDOCX,
  formatDateTime,
  formatRoleName
};

