# 🎓 Agentic AI Teaching Assistant

An advanced, **Agentic AI-powered** platform designed to assist educators in creating high-quality, curriculum-aligned teaching materials. This application leverages **Groq (Llama 3.3)** for reasoning and content generation, and **AssemblyAI** for multi-modal perception (audio/video processing).

Unlike simple generative tools, this assistant exhibits **agentic behavior**: it perceives input (text, PDF, audio, video), plans its approach (identifying learning objectives and analogies), validates content relevance, and then executes the task to generate lesson plans, quizzes, and presentations.

---

## 🚀 Key Features

### 🤖 Agentic Capabilities
*   **Multi-Modal Perception**: "Reads" PDFs and "Listens" to Audio/Video lectures (mp3, mp4, wav) to extract source material.
*   **Cognitive Planning**: Performs an internal "Reasoning Step" to analyze learning objectives and select appropriate analogies before generating content.
*   **Relevance Validation**: Automatically checks if uploaded files are relevant to the user-provided topic to prevent hallucinations and content mismatches.
*   **Hallucination Prevention**: Strictly adheres to provided references or generates factual content based on internal knowledge when no reference is provided.

### 🛠️ Tools & Modules
1.  **All-in-One Content Generator**: Generates a Lesson Summary, Adaptive Quiz, and PowerPoint Presentation in one go.
2.  **Bloom’s Taxonomy Quiz Builder**: Creates quizzes tailored to specific Bloom's Taxonomy levels (Remember, Analyze, Create, etc.) and difficulty splits.
3.  **Time-Boxed Summarizer**: Condenses content into a specific duration (e.g., a 15-minute lesson plan) with a pacing guide.
4.  **Interactive AI Tutor**: A student-facing module where an AI tutor evaluates answers and provides pedagogical hints instead of direct answers.
5.  **Auto PPT & Infographic**: Generates downloadable `.pptx` files with structured slides.

---

## 🏗️ Tech Stack

### Frontend
*   **React.js**: UI Library.
*   **Tailwind CSS**: Styling.
*   **Axios**: API communication.
*   **React Router**: Navigation.

### Backend
*   **Node.js & Express**: Server framework.
*   **Groq SDK**: Access to **Llama-3.3-70b-versatile** for high-speed, high-intelligence inference.
*   **AssemblyAI**: Speech-to-Text for audio and video processing.
*   **PDF.js**: Text extraction from PDF documents.
*   **PptxGenJS**: Programmatic PowerPoint generation.
*   **Multer**: File upload handling.

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v16 or higher)
*   npm or yarn
*   API Keys for **Groq** and **AssemblyAI**.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "AI Teaching Assistant"
```

### 2. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# backend/.env
GROQ_API_KEY=your_groq_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

Start the backend server:
```bash
npm start
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
# frontend/.env
REACT_APP_API_BASE_URL=http://localhost:5000
```

Start the React application:
```bash
npm start
# App runs on http://localhost:3000
```

---

## 📖 Usage Guide

### 1. Generating Content (All-in-One)
*   Go to **"All-in-One"**.
*   **Topic & Grade**: Required. (e.g., "Photosynthesis", "Grade 5").
*   **Reference**: Optional. You can paste text OR upload a file (PDF, Audio, Video).
*   **Click Generate**: The AI will validate relevance, plan the lesson, and output a Summary, Quiz, and PPT.

### 2. Creating a Quiz
*   Go to **"Bloom's Quiz"**.
*   Select specific **Bloom's Taxonomy** levels (e.g., only "Analyze" and "Evaluate").
*   Set the **Difficulty Split** (e.g., 5 Easy, 5 Hard).
*   The AI generates a quiz with rationales for every answer.

### 3. Interactive Tutor
*   Go to **"Interactive Tutor"**.
*   This simulates a student taking a quiz.
*   When a student answers incorrectly, the AI **Tutor Agent** provides a helpful hint based on the rationale, rather than giving the answer away.

---

## 📂 Project Structure

```
AI Teaching Assistant/
├── backend/                 # Node.js Express Server
│   ├── agent/
│   │   ├── agenticAI.js     # Main Agent Logic (Groq, Reasoning, Validation)
│   │   ├── audioUtils.js    # AssemblyAI integration
│   │   ├── pdfUtils.js      # PDF text extraction
│   │   ├── pptGenerator.js  # PowerPoint creation logic
│   │   ├── quizGenerator.js # Quiz specific logic
│   │   └── tutorAgent.js    # Interactive Tutor logic
│   ├── downloads/           # Temp folder for generated PPTs
│   ├── uploads/             # Temp folder for uploaded files
│   ├── server.js            # API Routes
│   └── package.json
│
├── frontend/                # React Application
│   ├── public/
│   ├── src/
│   │   ├── pages/           # Page Components (Dashboard, Generate, etc.)
│   │   ├── App.js           # Main Router
│   │   └── index.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## 🧠 Agentic Workflow

1.  **Input Perception**: The system accepts text, documents, or media.
2.  **Relevance Check**: `validateContentRelevance()` uses a small LLM call to ensure the input matches the requested topic.
3.  **Reasoning & Planning**: The Agent analyzes the input to determine the best pedagogical approach (analogy, pacing, key concepts).
4.  **Generation**: The Agent generates the structured JSON content (HTML summary, Quiz array, PPT structure).
5.  **Artifact Creation**: Helper modules convert the JSON into usable artifacts (PPTX files, rendered HTML).

---

## 🛡️ License
This project is open-source and available for educational purposes.
