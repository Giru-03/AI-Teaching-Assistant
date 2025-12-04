import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

import { generateTeachingContent } from "./agent/agenticAI.js";
import { generateQuiz } from "./agent/quizGenerator.js";
import { extractPdfText } from "./agent/pdfUtils.js";
import { transcribeAudio } from "./agent/audioUtils.js";
import { createPresentation } from "./agent/pptGenerator.js";
import { createPdfSummary } from "./agent/pdfGenerator.js";
import { evaluateAnswerAsTutor } from './agent/tutorAgent.js';
import { ragEngine } from "./agent/ragEngine.js";


const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "12mb" }));

app.get("/", (req, res) => {
    res.send("AI Teaching Assistant Backend is Running!");
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ai-teaching-assistant",
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });

app.post("/api/generate-content", upload.single("file"), async (req, res) => {
  try {

    const {
      topic,
      gradeLevel,
      content, 
      conversationHistory,
    } = req.body || {};

    let referenceText = content;


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
         console.log("Unsupported file type for extraction, ignoring.");
      }

      if (extractedText) {
        console.log("Indexing document for RAG...");
        await ragEngine.addDocument(extractedText, req.file.originalname);
        
        console.log("Retrieving relevant context...");
        const ragContext = await ragEngine.retrieve(`${topic} ${gradeLevel}`, 5); 

        referenceText = `Primary source text (RAG Retrieved Context from ${req.file.originalname}):\n${ragContext}\n\nAdditional teacher notes:\n${content}`;
      }
    }

    const result = await generateTeachingContent({
      topic,
      gradeLevel,
      reference: referenceText, 
      conversationHistory: JSON.parse(conversationHistory || '[]'),
    });
    if (result.error) return res.status(400).json(result);

    const pptFile = await createPresentation(result.ppt);
    const pdfFile = await createPdfSummary(topic, result.lesson_summary_html || result.lesson_summary);
    
    console.log("Generated PPT:", pptFile);
    console.log("Generated PDF:", pdfFile);

    res.json({ ...result, pptFile, pdfFile });

  } catch (e) {
    console.error("Content generation error:", e);
    res.status(500).json({ error: "Server crashed", details: e.message });
  }
});


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

app.post("/api/summarize", async (req, res) => {
  try {
    const data = await generateTeachingContent({ ...req.body });
    if (data.error) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Summarize failed", details: e.message });
  }
});

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

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () =>
      console.log(`✅ Backend running at http://localhost:${PORT}`)
    );
}

export default app;
