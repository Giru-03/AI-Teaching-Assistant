import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fetch from "node-fetch";
const { getDocument } = pdfjs;

export async function extractPdfText(pdfPath) {
  let data;
  
  if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
      const response = await fetch(pdfPath);
      const arrayBuffer = await response.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
  } else {
      if (!fs.existsSync(pdfPath)) {
        throw new Error("PDF not found at path: " + pdfPath);
      }
      data = new Uint8Array(fs.readFileSync(pdfPath));
  }

  const loadingTask = getDocument(data);

  const pdf = await loadingTask.promise;
  let text = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    // **THE FIX IS HERE**: Changed 'page.getPage(p)' to 'pdf.getPage(p)'
    const page = await pdf.getPage(p); 
    
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    text += strings.join(" ") + "\n\n";
  }

  return text.trim();
}