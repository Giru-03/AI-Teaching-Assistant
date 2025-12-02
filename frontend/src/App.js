import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GenerateContentPage from "./pages/GenerateContentPage"; // keep if you want all-in-one
import TaxonomyQuizPage from "./pages/TaxonomyQuizPage";
import TimeSummarizerPage from "./pages/TimeSummarizerPage";
import PptInfographicPage from "./pages/PptInfographicPage";
import InteractiveQuizPage from "./pages/InteractiveQuizPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/generate-content" element={<GenerateContentPage />} />
        <Route path="/taxonomy-quiz" element={<TaxonomyQuizPage />} />
        <Route path="/time-summarizer" element={<TimeSummarizerPage />} />
        <Route path="/ppt-infographic" element={<PptInfographicPage />} />
        <Route path="/interactive-quiz" element={<InteractiveQuizPage />} />
      </Routes>
    </Router>
  );
}