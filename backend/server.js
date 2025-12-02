import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

import { generateTeachingContent } from "./agent/agenticAI.js";
import { generateQuiz } from "./agent/quizGenerator.js";
import { extractPdfText } from "./agent/pdfUtils.js";
import { transcribeAudio } from "./agent/audioUtils.js";
import { createPresentation } from "./agent/pptGenerator.js";
import { createPdfSummary } from "./agent/pdfGenerator.js";
import { evaluateAnswerAsTutor } from './agent/tutorAgent.js';
import { ragEngine } from "./agent/ragEngine.js";


const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadsDir = path.join(__dirname, "downloads");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use("/downloads", express.static(downloadsDir));
const upload = multer({ dest: uploadsDir });

/** 1) All-in-one: summary + quiz + PPT */
app.post("/api/generate-content", upload.single("file"), async (req, res) => {
  try {
    // Get all parameters from the form data
    const {
      topic,
      gradeLevel,
      content, // Text from the textarea
      conversationHistory, // Conversation history for refinement
    } = req.body || {};

    let referenceText = content; // Default to the textarea content

    // --- NEW LOGIC: Check for uploaded files (PDF or Audio/Video) ---
    if (req.file) {
      console.log(`File detected: ${req.file.originalname} (${req.file.mimetype})`);
      let extractedText = "";
      
      const mime = req.file.mimetype.toLowerCase();
      if (mime.includes("pdf")) {
         console.log("Processing PDF...");
         extractedText = await extractPdfText(req.file.path);
      } else if (mime.includes("audio") || mime.includes("video") || mime.includes("mp4") || mime.includes("mp3") || mime.includes("wav") || mime.includes("mpeg")) {
         console.log("Processing Audio/Video...");
         extractedText = await transcribeAudio(req.file.path);
      } else {
         // Fallback for other text-based files if needed, or just ignore
         console.log("Unsupported file type for extraction, ignoring.");
      }

      if (extractedText) {
        // --- RAG INTEGRATION ---
        console.log("Indexing document for RAG...");
        await ragEngine.addDocument(extractedText, req.file.originalname);
        
        console.log("Retrieving relevant context...");
        const ragContext = await ragEngine.retrieve(`${topic} ${gradeLevel}`, 5); // Retrieve top 5 chunks

        // Prioritize the extracted text, using the textarea for additional notes
        referenceText = `Primary source text (RAG Retrieved Context from ${req.file.originalname}):\n${ragContext}\n\nAdditional teacher notes:\n${content}`;
      }
    }
    // --- END OF NEW LOGIC ---

    const result = await generateTeachingContent({
      topic,
      gradeLevel,
      reference: referenceText, // Use the potentially combined reference text
      // We need to parse the history as it comes from FormData as a string
      conversationHistory: JSON.parse(conversationHistory || '[]'),
    });
    if (result.error) return res.status(400).json(result);

    const pptFile = await createPresentation(result.ppt);
    const pdfFile = await createPdfSummary(topic, result.lesson_summary_html || result.lesson_summary);
    
    res.json({ ...result, pptFile, pdfFile });

  } catch (e) {
    console.error("Content generation error:", e);
    res.status(500).json({ error: "Server crashed", details: e.message });
  } finally {
    // **IMPORTANT**: Clean up the uploaded file after processing
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

/** 2) Quiz only (Bloom’s + difficulty + rationale) */
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { conversationHistory, ...body } = req.body;
    const data = await generateQuiz({
        ...body,
        conversationHistory: conversationHistory || []
    });
    if (data.error) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Server error", details: e.message });
  }
});

/** 3) Summarize (duration-aware) from pasted text */
app.post("/api/summarize", async (req, res) => {
  try {
    const data = await generateTeachingContent({ ...req.body });
    if (data.error) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Summarize failed", details: e.message });
  }
});

/** 4) Summarize from PDF upload */
app.post("/api/summarize-from-pdf", upload.single("file"), async (req, res) => {
  try {
    const { topic, gradeLevel, durationMinutes, proficiencyNotes, conversationHistory } = req.body;
    const text = await extractPdfText(req.file?.path);
    
    // --- RAG INTEGRATION ---
    await ragEngine.addDocument(text, req.file?.originalname || "uploaded_pdf");
    const ragContext = await ragEngine.retrieve(`${topic} ${gradeLevel}`, 7); // More chunks for summarization

    const data = await generateTeachingContent({
      topic,
      gradeLevel,
      reference: ragContext, // Use RAG context instead of full text
      durationMinutes: Number(durationMinutes) || undefined,
      proficiencyNotes,
      conversationHistory: JSON.parse(conversationHistory || '[]'),
    });
    if (data.error) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "PDF summarization failed", details: e.message });
  } finally {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
  }
});

/** 5) Generate PPT & Infographic */
app.post("/api/generate-visuals", async (req, res) => {
    try {
        const { topic, gradeLevel, reference, conversationHistory } = req.body;
        const result = await generateTeachingContent({ 
            topic, 
            gradeLevel, 
            reference,
            conversationHistory: conversationHistory || []
        });
        if (result.error) return res.status(400).json(result);

        // Generate PPT from the 'ppt' field in the AI response
        const pptFile = await createPresentation(result.ppt);

        // Placeholder for infographic generation
        // For a real implementation, you would call an image generation API here.
        const infographicUrl = `https://via.placeholder.com/800x1200.png?text=Infographic+for:+${encodeURIComponent(topic)}`;

        res.json({ pptFile, infographicUrl });
    } catch (e) {
        console.error("Visuals generation error:", e);
        res.status(500).json({ error: "Visuals generation failed", details: e.message });
    }
});

/* ------------------- NEW INTERACTIVE TUTOR ENDPOINT ------------------- */
app.post("/api/evaluate-answer", async (req, res) => {
  try {
    const { questionData, userAnswer } = req.body;
    if (!questionData || !userAnswer) {
      return res.status(400).json({ error: "Question data and user answer are required." });
    }

    const result = await evaluateAnswerAsTutor(questionData, userAnswer);
    res.json(result);

  } catch (e) {
    console.error("Answer evaluation error:", e);
    res.status(500).json({ error: "Failed to evaluate the answer.", details: e.message });
  }
});

app.listen(5000, () =>
  console.log("✅ Backend running at http://localhost:5000")
);
