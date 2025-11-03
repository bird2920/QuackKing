const GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const GEMINI_API_KEY = ""; // injected by environment

export const QUESTION_SCHEMA = {
  type: "ARRAY",
  description: "List of trivia questions with one correct answer and three distractors.",
  items: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING" },
      correctAnswer: { type: "STRING" },
      distractor1: { type: "STRING" },
      distractor2: { type: "STRING" },
      distractor3: { type: "STRING" },
    },
    required: ["question", "correctAnswer", "distractor1", "distractor2", "distractor3"],
  },
};

export async function callGeminiApi(payload, model = MODEL_NAME, retries = 3) {
  const url = `${GEMINI_API_URL_BASE}${model}:generateContent?key=${GEMINI_API_KEY}`;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty or malformed Gemini response");
      return text;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}