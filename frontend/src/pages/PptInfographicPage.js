import React, { useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function PptInfographicPage() {
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [refinement, setRefinement] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  const handleGenerate = async (isRefinement = false) => {
    if (!isRefinement && (!topic || !gradeLevel)) {
      setError("Topic and Grade Level are required.");
      return;
    }
    if (isRefinement && !refinement.trim()) {
      setError("Please enter a refinement instruction.");
      return;
    }

    setLoading(true);
    setError("");
    if (!isRefinement) setResult(null);

    let currentHistory = conversationHistory;
    if (isRefinement) {
      const userMessage = { role: 'user', parts: [{ text: `Refinement instruction: ${refinement}` }] };
      currentHistory = [...conversationHistory, userMessage];
    }

    try {
      const { data } = await axios.post(`${API_BASE}/api/generate-visuals`, {
        topic,
        gradeLevel,
        reference,
        conversationHistory: currentHistory
      });
      setResult(data);

      // Update history
      const modelResponse = { role: 'model', parts: [{ text: JSON.stringify(data) }] };
      if (isRefinement) {
        setConversationHistory([...currentHistory, modelResponse]);
      } else {
        const userMessageText = `Topic: ${topic}\nGrade Level: ${gradeLevel}\nReference: ${reference}`;
        const userMessage = { role: 'user', parts: [{ text: userMessageText }] };
        setConversationHistory([...currentHistory, userMessage, modelResponse]);
      }
      setRefinement("");

    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || "Failed to generate visuals.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">
          🖼️ Auto PPT & Infographic Generator
        </h1>

        <fieldset disabled={!!result && !refinement}>
        {/* Inputs */}
        <input
          type="text"
          placeholder="Enter Topic"
          className="w-full p-3 border rounded mb-3"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter Grade Level (e.g., Grade 5)"
          className="w-full p-3 border rounded mb-3"
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
        />
        <textarea
          placeholder="Paste your lesson content or key points here..."
          className="w-full p-3 border rounded mb-3"
          rows="6"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        </fieldset>

        {error && (
          <div className="mb-3 p-3 rounded bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!result && (
            <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 disabled:opacity-60"
            >
            {loading ? "Generating Visuals..." : "Generate"}
            </button>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 flex flex-col items-center gap-6">
            {/* PPT Download */}
            {result.pptFile && (
              <a
                href={`${API_BASE}/${result.pptFile}`}
                download
                className="w-full text-center bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 font-semibold"
              >
                ⬇️ Download Presentation (PPTX)
              </a>
            )}

            {/* Infographic Display */}
            {result.infographicUrl && (
              <div className="w-full">
                <h3 className="text-lg font-semibold mb-2 text-center">Infographic</h3>
                <img
                  src={result.infographicUrl}
                  alt="Generated Infographic"
                  className="w-full h-auto rounded-lg border shadow-md"
                />
              </div>
            )}

            <div className="w-full mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg mb-2 text-gray-700">Refine the Visuals</h3>
                <textarea placeholder="e.g., 'Add more slides about history' or 'Change the infographic style'." className="w-full p-3 border rounded mb-3" rows="3" value={refinement} onChange={(e) => setRefinement(e.target.value)} />
                <button onClick={() => handleGenerate(true)} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-60">
                  {loading ? "Refining..." : "Submit Refinement"}
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}