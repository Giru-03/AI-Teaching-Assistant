import React, { useState } from "react";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

export default function TimeSummarizerPage() {
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [proficiencyNotes, setProficiencyNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [refinement, setRefinement] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  const callSummarize = async (isRefinement = false) => {
    if (!isRefinement && (!topic || !gradeLevel)) { setError("Topic and Grade Level are required."); return; }
    if (isRefinement && !refinement.trim()) { setError("Please enter a refinement instruction."); return; }

    setError(""); setLoading(true); 
    if (!isRefinement) setResult(null);

    let currentHistory = conversationHistory;
    if (isRefinement) {
      const userMessage = { role: 'user', parts: [{ text: `Refinement instruction: ${refinement}` }] };
      currentHistory = [...conversationHistory, userMessage];
    }

    try {
      let data;
      if (file && !isRefinement) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("topic", topic);
        fd.append("gradeLevel", gradeLevel);
        fd.append("durationMinutes", durationMinutes);
        fd.append("proficiencyNotes", proficiencyNotes);
        fd.append("conversationHistory", JSON.stringify(currentHistory));
        
        const resp = await fetch(`${API_BASE}/api/summarize-from-pdf`, { method: "POST", body: fd });
        data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || "Summarization failed");
      } else {
        // For refinement or text-only, we use the JSON endpoint (or PDF endpoint if we want to keep context, but usually text is enough)
        // Actually, if we started with a PDF, we might want to keep using the PDF endpoint or just pass the history.
        // But the PDF endpoint expects a file for the initial load.
        // If it's refinement, we can just use the text endpoint /api/summarize because the context is in conversationHistory.
        // However, /api/summarize calls generateTeachingContent directly.
        
        const resp = await fetch(`${API_BASE}/api/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              topic, 
              gradeLevel, 
              reference, 
              durationMinutes, 
              proficiencyNotes,
              conversationHistory: currentHistory
          })
        });
        data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || "Summarization failed");
      }
      setResult(data);

      // Update history
      const modelResponse = { role: 'model', parts: [{ text: JSON.stringify(data) }] };
      if (isRefinement) {
        setConversationHistory([...currentHistory, modelResponse]);
      } else {
        const userMessageText = `Topic: ${topic}\nGrade Level: ${gradeLevel}\nDuration: ${durationMinutes}\nReference: ${reference}`;
        const userMessage = { role: 'user', parts: [{ text: userMessageText }] };
        setConversationHistory([...currentHistory, userMessage, modelResponse]);
      }
      setRefinement("");

    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">⏱️ Time-Boxed Summarizer</h1>
        <fieldset disabled={!!result && !refinement}>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Topic</label><input className="w-full border rounded p-2" value={topic} onChange={(e)=>setTopic(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Grade Level(1-10)</label><input className="w-full border rounded p-2" value={gradeLevel} onChange={(e)=>setGradeLevel(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Duration (minutes)</label><input type="number" className="w-full border rounded p-2" value={durationMinutes} onChange={(e)=>setDurationMinutes(Number(e.target.value)||0)} /></div>
          <div><label className="block text-sm font-medium mb-1">Learner Profile</label><input className="w-full border rounded p-2" value={proficiencyNotes} onChange={(e)=>setProficiencyNotes(e.target.value)} placeholder="e.g., weak in math basics"/></div>
        </div>

        <div className="mt-3"><label className="block text-sm font-medium mb-1">Subject / References / Other Information</label><textarea className="w-full border rounded p-2" rows={5} value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="Paste notes here (or upload a PDF below)"/></div>

        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Upload PDF (Optional)</label>
          <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full border rounded p-2" />
        </div>
        </fieldset>

        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        
        {!result && (
            <button onClick={() => callSummarize(false)} disabled={loading} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-70">{loading?"Summarizing...":"Summarize"}</button>
        )}

{result && (
  <div className="mt-6">
    <h2 className="text-xl font-semibold mb-2">Lesson Summary</h2>

    {/* Prefer HTML if available */}
    {result.lesson_summary_html ? (
      <div
        className="prose max-w-none bg-gradient-to-b from-gray-50 to-white p-6 rounded-lg border"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: result.lesson_summary_html }}
      />
    ) : (
      <div className="mt-2 bg-gray-50 p-4 rounded whitespace-pre-wrap">
        {result.lesson_summary}
      </div>
    )}

    {Array.isArray(result.pacing_plan) && result.pacing_plan.length > 0 && (
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Pacing Plan</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {result.pacing_plan.map((c, i) => (
            <div key={i} className="rounded-lg border p-3 bg-white shadow-sm">
              <div className="text-sm text-gray-500">Segment</div>
              <div className="font-semibold">{c.chunk}</div>
              <div className="mt-1 text-blue-700 font-medium">{c.minutes} min</div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="mt-6 border-t pt-6">
        <h3 className="font-semibold text-lg mb-2 text-gray-700">Refine the Summary</h3>
        <textarea placeholder="e.g., 'Make it shorter' or 'Focus more on the key concepts'." className="w-full p-3 border rounded mb-3" rows="3" value={refinement} onChange={(e) => setRefinement(e.target.value)} />
        <button onClick={() => callSummarize(true)} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-60">
            {loading ? "Refining..." : "Submit Refinement"}
        </button>
    </div>
  </div>
)}

      </div>
    </div>
  );
}