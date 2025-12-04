import fs from "fs";
import fetch from "node-fetch";

export async function extractPdfText(pdfPath) {
  // Dynamic import for pdf-parse
  const pdf = (await import("pdf-parse")).default;
  let dataBuffer;
  
  if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
      const response = await fetch(pdfPath);
      const arrayBuffer = await response.arrayBuffer();
      dataBuffer = Buffer.from(arrayBuffer);
  } else {
      if (!fs.existsSync(pdfPath)) {
        throw new Error("PDF not found at path: " + pdfPath);
      }
      dataBuffer = fs.readFileSync(pdfPath);
  }

  try {
      const data = await pdf(dataBuffer);
      return data.text;
  } catch (error) {
      console.error("PDF Parse Error:", error);
      throw new Error("Failed to parse PDF content.");
  }
}