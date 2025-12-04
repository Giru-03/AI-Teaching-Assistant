import React, { useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const GenerateContentPage = () => {
  // States for inputs
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null); // <-- 1. ADDED: State for the PDF file
  const [refinement, setRefinement] = useState("");

  // States for UI and results
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [error, setError] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  // 2. UPDATED: This function now handles file uploads
   const handleGenerate = async (isRefinement = false) => {
    // Updated validation: requires Topic and Grade Level
     if (!isRefinement && (!topic || !gradeLevel)) {
       alert("Topic and Grade Level are required!");
       return;
     }
     if (isRefinement && !refinement.trim()) {
       alert("Please enter a refinement instruction.");
       return;
     }

     setLoading(true);
     setError("");
    
    // We now use FormData to be able to send both text and a file
    const formData = new FormData();
    formData.append("topic", topic);
    formData.append("gradeLevel", gradeLevel);
    formData.append("content", content); // Text from textarea

    if (file && !isRefinement) {
      formData.append("file", file); // Add the file if it exists
    }

    let currentHistory = conversationHistory;
    if (isRefinement) {
      const userMessage = { role: 'user', parts: [{ text: `Refinement instruction: ${refinement}` }] };
      currentHistory = [...conversationHistory, userMessage];
    }
    
    // We must stringify the history to send it via FormData
    formData.append("conversationHistory", JSON.stringify(currentHistory));

     try {
      // The request now sends FormData with the correct headers
       const { data } = await axios.post(`${API_BASE}/api/generate-content`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
       setResult(data);
       setShowSummary(true);
       setShowQuiz(true);

      // Update history for the next turn
       const modelResponse = { role: 'model', parts: [{ text: JSON.stringify(data) }] };
      
      if (isRefinement) {
        setConversationHistory([...currentHistory, modelResponse]);
      } else {
        const userMessageText = `Topic: ${topic}\nGrade Level: ${gradeLevel}\nReference Content: ${content}${file ? ` (plus content from ${file.name})` : ''}`;
        const userMessage = { role: 'user', parts: [{ text: userMessageText }] };
        setConversationHistory([...currentHistory, userMessage, modelResponse]);
      }

       setRefinement("");

     } catch (e) {
       console.error(e);
       setError(e?.response?.data?.error || "Failed to generate content.");
     } finally {
       setLoading(false);
     }
   };  const renderPlainSummary = (text) => {
    const safe = (text || "").replace(/[*#]+/g, "");
    return safe.split(/\n+/).filter((line) => line.trim() !== "").map((line, idx) => (<p key={idx} className="text-gray-800">• {line.trim()}</p>));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">
          🎓 All-in-One Content Generator
        </h1>

        <fieldset disabled={!!result}>
          <input type="text" placeholder={file ? "Topic (Optional, will be inferred from PDF)" : "Enter Topic"} className="w-full p-3 border rounded mb-3" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <input type="text" placeholder={file ? "Grade Level (Optional, will be inferred from PDF)" : "Enter Grade Level"} className="w-full p-3 border rounded mb-3" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
          <textarea placeholder="Enter Reference Content or Notes" className="w-full p-3 border rounded mb-3" rows="4" value={content} onChange={(e) => setContent(e.target.value)} />
          
          {/* 3. ADDED: The optional PDF/Audio/Video Upload input field */}
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (PDF, Audio, Video)</label>
          <input
            type="file"
            accept=".pdf,audio/*,video/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-2 border rounded mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </fieldset>        {/* --- The rest of the file is unchanged --- */}
        {error && <div className="mb-3 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

        {!result && (
          <button onClick={() => handleGenerate(false)} disabled={loading} className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 disabled:opacity-60">
            {loading ? "Generating..." : "Generate Content"}
          </button>
        )}

        {result && (
          <div className="mt-6 border-t pt-6">
            {/* ... (Result display logic) ... */}
            <button onClick={() => setShowSummary(!showSummary)} className="w-full text-left bg-gray-200 px-4 py-2 rounded mb-2 hover:bg-gray-300 font-semibold">📚 Lesson Summary {showSummary ? "▲" : "▼"}</button>
            {showSummary && (
              <div className="bg-gray-50 p-4 rounded mb-4 leading-relaxed">
                {result.lesson_summary_html ? <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: result.lesson_summary_html }}/> : <div className="space-y-2">{renderPlainSummary(result.lesson_summary)}</div>}
              </div>
            )}
            <button onClick={() => setShowQuiz(!showQuiz)} className="w-full text-left bg-gray-200 px-4 py-2 rounded mb-2 hover:bg-gray-300 font-semibold">📝 Quiz {showQuiz ? "▲" : "▼"}</button>
            {showQuiz && Array.isArray(result.quiz) && (
              <ul className="space-y-4">
                {result.quiz.map((q, index) => (
                  <li key={index} className="p-4 border rounded bg-gray-50">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700">{q.taxonomyLevel || "—"}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700 capitalize">{q.difficulty || "—"}</span>
                        </div>
                        <p className="font-medium"><strong>Q{index + 1}:</strong> {q.question}</p>
                        {Array.isArray(q.options) && (<ul className="list-disc ml-6">{q.options.map((opt, i) => (<li key={i}>{opt}</li>))}</ul>)}
                        <div className="space-y-1">
                            {q.answer && (<p className="text-green-700">✅ Answer: <strong>{q.answer}</strong></p>)}
                            {q.rationale && (<p className="text-gray-600 text-sm"><em>Why:</em> {q.rationale}</p>)}
                        </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {result.pptFile && (<a href={result.pptFile.startsWith('http') ? result.pptFile : `${API_BASE}/${result.pptFile}`} download className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">⬇️ Download Presentation (PPTX)</a>)}
            {result.pdfFile && (<a href={result.pdfFile.startsWith('http') ? result.pdfFile : `${API_BASE}/${result.pdfFile}`} download className="mt-4 ml-4 inline-block bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">⬇️ Download Summary (PDF)</a>)}
          </div>
        )}
        {result && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-700">Refine the Content</h3>
            <textarea placeholder="e.g., 'Make the quiz harder' or 'Add more details to the introduction.'" className="w-full p-3 border rounded mb-3" rows="3" value={refinement} onChange={(e) => setRefinement(e.target.value)} />
            <button onClick={() => handleGenerate(true)} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-60">
              {loading ? "Refining..." : "Submit Refinement"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateContentPage;