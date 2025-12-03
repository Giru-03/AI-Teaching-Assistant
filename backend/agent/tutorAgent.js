import { callAI } from './agenticAI.js'; 

/**
 * Evaluates a student's answer using an AI tutor prompt.
 * @param {object} questionData - The full question object from your quiz.
 * @param {string} userAnswer - The student's submitted answer.
 * @returns {Promise<object>} - An object with the AI's feedback and correctness.
 */
export async function evaluateAnswerAsTutor({ question, options, answer, rationale }, userAnswer) {
  const prompt = `
    You are an AI Teaching Tutor. Your tone is encouraging, friendly, and helpful. Your goal is to help a student learn, not just give them the answer.

    CONTEXT:
    - The question is: "${question}"
    - The options are: ${options.join(", ")}
    - The correct answer is: "${answer}"
    - The reason it's correct is: "${rationale}"
    - The student's submitted answer is: "${userAnswer}"

    YOUR TASK:
    1.  Analyze if the student's answer is correct. It might be the letter (e.g., 'B') or the full text.
    2.  If the student is correct, congratulate them and briefly explain WHY their answer is right, using the provided rationale.
    3.  If the student is incorrect, DO NOT give them the correct answer. Instead, provide a gentle, encouraging hint to guide them. The hint should be based on the question and rationale. Give logical hint not like letter starting with this or that.
    4.  Your entire response must be in a JSON object format with two keys: "isCorrect" (boolean) and "feedback" (string).
  `;

  const messages = [{ role: 'user', content: prompt }];
  const result = await callAI(messages); 

  if (!result || typeof result.isCorrect === 'undefined') {
    if (userAnswer.toLowerCase().includes(answer.toLowerCase())) {
        return { isCorrect: true, feedback: `That's correct! The answer is ${answer} because ${rationale}.` };
    } else {
        return { isCorrect: false, feedback: `Not quite. Here's a hint: ${rationale}. Try again!` };
    }
  }

  return result;
}