import { v2 as cloudinary } from "cloudinary";

/**
 * Generates a PDF file from the lesson summary HTML (converted to text/simple format).
 * @param {string} topic - The topic of the lesson.
 * @param {string} summaryHtml - The HTML summary content.
 * @returns {Promise<string>} - The Cloudinary URL to the generated PDF file.
 */
export async function createPdfSummary(topic, summaryHtml) {
  // Dynamic import for pdfkit
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      
      const uploadStream = cloudinary.uploader.upload_stream(
          { 
            resource_type: "auto", 
            type: "upload",
            folder: "ai-teaching-assistant", 
            format: "pdf"
          },
          (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
          }
      );

      doc.pipe(uploadStream);

      doc.fontSize(24).text(`Lesson Summary: ${topic}`, { align: 'center' });
      doc.moveDown();

      
      const lines = summaryHtml
        .replace(/<h3>/g, '\n\nHEADING: ')
        .replace(/<\/h3>/g, '\n')
        .replace(/<p>/g, '\n')
        .replace(/<\/p>/g, '\n')
        .replace(/<ul>/g, '\n')
        .replace(/<\/ul>/g, '\n')
        .replace(/<ol>/g, '\n')
        .replace(/<\/ol>/g, '\n')
        .replace(/<li>/g, '• ')
        .replace(/<\/li>/g, '\n')
        .replace(/<strong>/g, '')
        .replace(/<\/strong>/g, '')
        .replace(/<em>/g, '')
        .replace(/<\/em>/g, '')
        .replace(/<section>/g, '')
        .replace(/<\/section>/g, '')
        .replace(/<hr>/g, '\n--------------------------------\n')
        .split('\n');

      doc.fontSize(12);

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('HEADING: ')) {
            doc.moveDown();
            doc.fontSize(16).font('Helvetica-Bold').text(trimmed.replace('HEADING: ', ''));
            doc.fontSize(12).font('Helvetica');
        } else if (trimmed) {
            doc.text(trimmed, {
                align: 'justify',
                indent: trimmed.startsWith('•') ? 10 : 0
            });
            doc.moveDown(0.5);
        }
      });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}
