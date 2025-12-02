import React from "react";
import { useNavigate } from "react-router-dom";
import { FaBook, FaRegClock } from "react-icons/fa";
import { GiBrain } from "react-icons/gi";
import { FaUserGraduate } from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();
  const Tile = ({ onClick, icon, title, desc }) => (
    <button onClick={onClick} className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center hover:bg-blue-50 transition">
      {icon}
      <h2 className="text-xl font-semibold mt-3">{title}</h2>
      <p className="text-gray-500 text-center mt-2">{desc}</p>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-blue-700 mb-8">🎓 Agentic AI — Teaching Assistant</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <Tile onClick={() => navigate("/generate-content")} icon={<FaBook className="text-blue-500 text-5xl"/>} title="All-in-One" desc="Summary + Quiz + PPT)." />
        <Tile onClick={() => navigate("/taxonomy-quiz")} icon={<GiBrain className="text-blue-500 text-5xl"/>} title="Bloom’s Quiz" desc="Taxonomy + Difficulty + Rationale" />
        <Tile onClick={() => navigate("/time-summarizer")} icon={<FaRegClock className="text-blue-500 text-5xl"/>} title="Time Summarizer" desc="Fit content into 15/20 mins with pacing" />
        <Tile 
          onClick={() => navigate("/interactive-quiz")} 
          icon={<FaUserGraduate className="text-blue-500 text-5xl"/>} 
          title="Interactive Tutor" 
          desc="Take a quiz with an AI tutor that gives hints and feedback." 
        />
      </div>
    </div>
  );
}