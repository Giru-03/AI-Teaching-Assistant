import { generateTeachingContent } from "./agenticAI.js";

export async function generateQuiz(body) {
  const {
    topic,
    gradeLevel,
    reference,
    blooms,
    difficultySplit,
    questionTypes,
    proficiencyNotes,
    conversationHistory,
  } = body || {};

  const data = await generateTeachingContent({
    topic,
    gradeLevel,
    reference,
    blooms,
    difficultySplit,
    questionTypes,
    proficiencyNotes,
    conversationHistory,
  });

  if (data.error) return data;
  return { quiz: data.quiz };
}
