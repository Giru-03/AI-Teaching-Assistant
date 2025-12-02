import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generates a PDF file from the lesson summary HTML (converted to text/simple format).
 * @param {string} topic - The topic of the lesson.
 * @param {string} summaryHtml - The HTML summary content.
 * @returns {Promise<string>} - The relative path to the generated PDF file.
 */
export async function createPdfSummary(topic, summaryHtml) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const downloadDir = path.resolve("downloads");
      if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);
      
      const fileName = `summary_${Date.now()}.pdf`;
      const filePath = path.join(downloadDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Title
      doc.fontSize(24).text(`Lesson Summary: ${topic}`, { align: 'center' });
      doc.moveDown();

      // Convert simple HTML to text (basic stripping)
      // Note: For robust HTML-to-PDF, we'd need puppeteer, but pdfkit is lighter.
      // We will strip tags and try to format headings.
      
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

      stream.on('finish', () => {
        resolve(`downloads/${fileName}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}
