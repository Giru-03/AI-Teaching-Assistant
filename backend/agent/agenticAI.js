import Groq from "groq-sdk";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

dotenv.config();
const GROQ_API_KEY = process.env.GROQ_API_KEY;

let groqInstance = null;
function getGroqClient() {
    if (!groqInstance) {
        if (!process.env.GROQ_API_KEY) {
            console.error("GROQ_API_KEY is missing from environment variables!");
            throw new Error("GROQ_API_KEY is missing");
        }
        groqInstance = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }
    return groqInstance;
}

function stripCodeFences(s = "") {
  return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}
function extractJsonSubstring(s = "") {
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return s;
  return s.slice(first, last + 1);
}
function safeParseJson(rawText = "") {
  const text = extractJsonSubstring(stripCodeFences(rawText))
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*(\}|\])/g, "$1");
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(jsonrepair(text));
    } catch (e2) {
      return { __parse_error: true, cleaned: text, raw: rawText, error: String(e2) };
    }
  }
}

export async function callAI(messages) {
  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "";
    if (!raw) return { error: "AI returned no content", raw: completion };

    const parsed = safeParseJson(raw);
    if (parsed?.__parse_error) {
      return { error: "Malformed JSON from model", cleaned: parsed.cleaned };
    }
    return parsed;
  } catch (e) {
    console.error("Groq API Error:", e);
    return { error: "Groq API Error", details: e.message };
  }
}


export async function validateContentRelevance(topic, content) {
  if (!content || content.length < 50) return true; 
  
  const prompt = `
    You are a strict content validator.
    Topic: "${topic}"
    Content Snippet: "${content.slice(0, 2000)}..."

    Task: Determine if the provided content is RELEVANT to the topic.
    - If the content is about a completely different subject (e.g., Topic is "Photosynthesis" but content is about "The Civil War"), return {"relevant": false, "reason": "Content mismatch"}.
    - If it is related, even loosely, return {"relevant": true}.
    
    Return JSON ONLY: {"relevant": boolean, "reason": string}
  `;

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = safeParseJson(raw);
    return parsed;
  } catch (e) {
    console.error("Relevance check failed:", e);
    return { relevant: true }; 
  }
}


function mdToHtml(md = "") {
  let s = (md || "").trim();

  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.*?)__/g, "<strong>$1</strong>");
  s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");

  s = s.replace(/^###\s?(.*)$/gm, "<h3>$1</h3>");
  s = s.replace(/^##\s?(.*)$/gm, "<h3>$1</h3>");
  s = s.replace(/^#\s?(.*)$/gm, "<h3>$1</h3>");

  s = s.replace(
    /(^|\n)(?:\s*[-*]\s.+\n?)+/g,
    (block) => {
      const items = block
        .trim()
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[-*]\s?/, "").trim())
        .filter(Boolean)
        .map((li) => `<li>${li}</li>`)
        .join("");
      return `\n<ul>${items}</ul>\n`;
    }
  );
  s = s.replace(
    /(^|\n)(?:\s*\d+\.\s.+\n?)+/g,
    (block) => {
      const items = block
        .trim()
        .split(/\n+/)
        .map((line) => line.replace(/^\s*\d+\.\s?/, "").trim())
        .filter(Boolean)
        .map((li) => `<li>${li}</li>`)
        .join("");
      return `\n<ol>${items}</ol>\n`;
    }
  );

  s = s
    .split(/\n{2,}/)
    .map((para) =>
      /^<(h3|ul|ol|li|\/ul|\/ol|blockquote)/.test(para.trim())
        ? para
        : `<p>${para.trim()}</p>`
    )
    .join("\n");

  s = s.replace(/\*\*/g, "");
  return s;
}

export async function generateTeachingContent({
  topic,
  gradeLevel,
  reference,
  durationMinutes,
  proficiencyNotes,
  blooms = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"],
  difficultySplit = { easy: 4, medium: 4, hard: 2 },
  questionTypes = ["MCQ"],
  conversationHistory = [],
}) {

  if (!topic || !gradeLevel) {
      return { error: "Topic and Grade Level are required." };
  }

  if (reference && reference.length > 50) {
      const check = await validateContentRelevance(topic, reference);
      if (check && check.relevant === false) {
          return { error: `Content Mismatch: The uploaded file or text does not appear to be related to the topic '${topic}'. Reason: ${check.reason}` };
      }
  }

  const total =
    (difficultySplit.easy || 0) +
    (difficultySplit.medium || 0) +
    (difficultySplit.hard || 0);
  const tgt = 10;
  let split = { ...difficultySplit };
  if (total !== tgt) {
    const scaled = {
      easy: Math.max(0, Math.round((difficultySplit.easy || 0) * tgt / Math.max(1, total))),
      medium: Math.max(0, Math.round((difficultySplit.medium || 0) * tgt / Math.max(1, total))),
      hard: Math.max(0, Math.round((difficultySplit.hard || 0) * tgt / Math.max(1, total))),
    };
    let sum = scaled.easy + scaled.medium + scaled.hard;
    while (sum < tgt) { scaled.medium++; sum++; }
    while (sum > tgt) { if (scaled.hard > 0) scaled.hard--; else if (scaled.medium > 0) scaled.medium--; else scaled.easy--; sum--; }
    split = scaled;
  }
  
  let messages = [];

  const formattedHistory = conversationHistory.map(msg => {
      let role = msg.role;
      if (role === 'model') role = 'assistant';
      
      let content = '';
      if (msg.parts && msg.parts[0] && msg.parts[0].text) {
          content = msg.parts[0].text;
      } else if (msg.content) {
          content = msg.content;
      }
      
      return { role, content };
  });

  if (formattedHistory.length > 0) {

    const lastUserMessage = formattedHistory.pop(); 
    const refinementInstruction = `
      **CRITICAL REFINEMENT INSTRUCTION:**
      A user has requested a change to the previous JSON output. Their instruction is: "${lastUserMessage.content}"

      Your task is to regenerate the ENTIRE JSON object, incorporating the user's requested change.
      You MUST return the complete JSON structure with all original keys ("lesson_summary_html", "quiz", "ppt", etc.), even if some fields are unchanged.
      DO NOT respond with only the changed part or a simple text message. The output must be the full JSON object.
    `;
    
    const refinedUserMessage = { role: 'user', content: refinementInstruction };
    messages = [...formattedHistory, refinedUserMessage];

  }  else {
    const initialPrompt = `You are an advanced Agentic AI Teaching Assistant. Your goal is to generate high-quality educational materials by acting as an expert curriculum designer.

INPUT
- Topic: ${topic}
- Grade Level: ${gradeLevel}
- Learner Profile: ${proficiencyNotes || "general"}
- Duration Minutes: ${durationMinutes || "not specified"}
- Reference Content: ${reference ? reference.slice(0, 15000) : "NONE PROVIDED (Generate based on Topic)"}
- Bloom Levels Allowed: ${blooms.join(", ")}
- Difficulty Split (must sum to 10): ${JSON.stringify(split)}
- Preferred Question Types: ${questionTypes.join(", ")}

TASKS
**CRITICAL INSTRUCTION:**
1. **If Reference Content is provided:** Base your output STRICTLY on it. Do not include outside information unless it clarifies the reference.
2. **If Reference Content is "NONE PROVIDED":** Generate high-quality, FACTUAL content based on the Topic and Grade Level. **DO NOT HALLUCINATE.** If the topic is obscure or you are unsure, return {"error": "Topic is too obscure to generate reliable content without reference material."}.

**AGENTIC REASONING STEP:**
Before generating the final JSON, you must internally analyze the content.
1. Identify the core learning objectives.
2. Determine the best analogy for the grade level.
3. Select quiz questions that strictly align with the Bloom's taxonomy levels requested.
4. Structure the PPT to tell a coherent story.

1) LESSON SUMMARY (ADAPTIVE & TIME-BOXED)
Return the summary as CLEAN HTML (no Markdown). Use only: <section>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <hr>.
- ~700–1000 words in 4 sections: Introduction, Core Concepts, Applications, Wrap-up. Highlights the headings. Have a one line space before the heading.
- Make it engaging: 1 analogy, 1 short interactive prompt (think–pair–share), and 1 clear worked example.
- End with an "Exit Ticket" (1 quick question).
- Keep wording age-appropriate for the stated grade.
- No asterisks, no code fences, no Markdown.

2) PACING PLAN
Array of { "chunk": "Intro|Core|Practice|Wrap-up", "minutes": number } that sums to durationMinutes if provided; otherwise provide a reasonable 15–20 minute plan.

3) QUIZ (BLOOM'S + DIFFICULTY + RATIONALE)
Exactly 10 items. Each item must include: taxonomyLevel (one of ${blooms.join(
    ", "
  )}), difficulty ("easy"|"medium"|"hard"), and a 1–2 sentence rationale.
For MCQ: 4 options, single correct answer.

4) PRESENTATION CONTENT (MIN 8 SLIDES)
Array of { "slide_title": "...", "bullet_points": ["15–40 words(optional) each x5"] } — no Markdown characters. I pdf is uploaded i want every topic in the ppt not such few slides. in this it should contain explanations not questions.

STRICT JSON ONLY (no Markdown, comments, or trailing commas).
Include a "reasoning" field in the JSON where you briefly explain your design choices (e.g., "I chose the water analogy because...").

{
  "reasoning": "I analyzed the text and decided to focus on...",
  "lesson_summary_html": "<section>...</section>",
  "pacing_plan": [{"chunk":"Intro","minutes":3},{"chunk":"Core","minutes":10}],
  "quiz": [{"type":"MCQ","question":"...","options":["A","B","C","D"],"answer":"B","taxonomyLevel":"Analyze","difficulty":"medium","rationale":"..."}],
  "ppt": [{"slide_title":"...","bullet_points":["...","...","...","...","..."]}]
}`;
    messages = [{ role: 'user', content: initialPrompt }];
  }
  const parsed = await callAI(messages);
  if (parsed.error) return parsed;

  let {
    lesson_summary_html,
    lesson_summary,
    pacing_plan,
    quiz,
    ppt,
  } = parsed;

  let html = (lesson_summary_html || "").trim();
  if (!html && lesson_summary) html = mdToHtml(lesson_summary);
  if (html.includes("**")) html = html.replace(/\*\*/g, "");

  pacing_plan = Array.isArray(pacing_plan) ? pacing_plan : [];
  quiz = Array.isArray(quiz) ? quiz : [];
  ppt = Array.isArray(ppt) ? ppt : [];

  return {
    lesson_summary_html: html,
    lesson_summary: html ? undefined : (lesson_summary || ""),
    pacing_plan,
    quiz,
    ppt,
  };
}
