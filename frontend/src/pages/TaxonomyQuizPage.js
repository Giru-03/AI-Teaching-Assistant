import React, { useMemo, useState } from "react";
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const ALL_BLOOMS = ["Remember","Understand","Apply","Analyze","Evaluate","Create"];

export default function TaxonomyQuizPage() {
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [reference, setReference] = useState("");
  const [proficiencyNotes, setProficiencyNotes] = useState("");
  const [blooms, setBlooms] = useState(ALL_BLOOMS);
  const [split, setSplit] = useState({ easy: 4, medium: 4, hard: 2 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [refinement, setRefinement] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  const remaining = useMemo(() => 10 - (Number(split.easy)||0) - (Number(split.medium)||0) - (Number(split.hard)||0), [split]);
  const toggleBloom = (b) => setBlooms((prev) => prev.includes(b) ? prev.filter(x => x!==b) : [...prev, b]);
  const updateSplit = (k, v) => setSplit((s) => ({ ...s, [k]: Math.max(0, Math.min(10, Number(v)||0)) }));

  const handleGenerate = async (isRefinement = false) => {
    if (!isRefinement && (!topic.trim() || !gradeLevel.trim())) { setError("Topic and Grade Level are required."); return; }
    if (isRefinement && !refinement.trim()) { setError("Please enter a refinement instruction."); return; }

    setError(""); setLoading(true); 
    if (!isRefinement) setQuiz([]);

    let currentHistory = conversationHistory;
    if (isRefinement) {
      const userMessage = { role: 'user', parts: [{ text: `Refinement instruction: ${refinement}` }] };
      currentHistory = [...conversationHistory, userMessage];
    }

    try {
      const resp = await fetch(`${API_BASE}/api/generate-quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            topic, 
            gradeLevel, 
            reference, 
            blooms, 
            difficultySplit: split, 
            questionTypes: ["MCQ"], 
            proficiencyNotes,
            conversationHistory: currentHistory
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Generation failed");
      setQuiz(data.quiz || []);

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

    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">🧠 Bloom’s Taxonomy Quiz Builder</h1>
        <fieldset disabled={quiz.length > 0 && !refinement}>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Topic</label><input className="w-full border rounded p-2" value={topic} onChange={(e)=>setTopic(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Grade Level(1-10)</label><input className="w-full border rounded p-2" value={gradeLevel} onChange={(e)=>setGradeLevel(e.target.value)} /></div>
        </div>
        <div className="mt-3"><label className="block text-sm font-medium mb-1">Learner Profile</label><input className="w-full border rounded p-2" value={proficiencyNotes} onChange={(e)=>setProficiencyNotes(e.target.value)} placeholder="e.g., weak in math basics"/></div>
        <div className="mt-3"><label className="block text-sm font-medium mb-1">Reference</label><textarea className="w-full border rounded p-2" rows={5} value={reference} onChange={(e)=>setReference(e.target.value)} /></div>

        <div className="mt-4 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Bloom Levels</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_BLOOMS.map((b) => (
                <button key={b} onClick={()=>toggleBloom(b)} type="button" className={`px-3 py-1 rounded border ${blooms.includes(b)?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-700"}`}>{b}</button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Difficulty Split (10 total)</h2>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-sm">Easy</label><input type="number" min={0} max={10} className="w-full border rounded p-2" value={split.easy} onChange={(e)=>updateSplit("easy", e.target.value)} /></div>
              <div><label className="text-sm">Medium</label><input type="number" min={0} max={10} className="w-full border rounded p-2" value={split.medium} onChange={(e)=>updateSplit("medium", e.target.value)} /></div>
              <div><label className="text-sm">Hard</label><input type="number" min={0} max={10} className="w-full border rounded p-2" value={split.hard} onChange={(e)=>updateSplit("hard", e.target.value)} /></div>
            </div>
            <p className={`mt-1 text-sm ${remaining===0?"text-green-700":"text-orange-600"}`}>Remaining: {remaining}</p>
          </div>
        </div>
        </fieldset>

        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        
        {quiz.length === 0 && (
            <button onClick={() => handleGenerate(false)} disabled={loading} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-70">{loading?"Generating...":"Generate Quiz"}</button>
        )}

        {quiz.length>0 && (
          <div className="mt-6 space-y-4">
            {quiz.map((q, idx) => (
              <div key={idx} className="border rounded p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Q{idx+1}. {q.question}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{q.taxonomyLevel} • {q.difficulty}</span>
                </div>
                {Array.isArray(q.options) && (<ul className="list-disc ml-6 mt-2">{q.options.map((opt,i)=>(<li key={i}>{opt}</li>))}</ul>)}
                {q.answer && <p className="mt-2 text-green-700"><strong>Answer:</strong> {q.answer}</p>}
                {q.rationale && <p className="mt-1 text-gray-700 text-sm"><strong>Why:</strong> {q.rationale}</p>}
              </div>
            ))}
            
            <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg mb-2 text-gray-700">Refine the Quiz</h3>
                <textarea placeholder="e.g., 'Make the questions harder' or 'Focus more on analysis'." className="w-full p-3 border rounded mb-3" rows="3" value={refinement} onChange={(e) => setRefinement(e.target.value)} />
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
