import { callAIApi, getGeminiConfig } from "./geminiService";

const DEFAULT_SYSTEM_PROMPT =
  "Make 5 trivia Qs with 1 correct and 3 wrong. Keep answers concise (under 60 chars) and avoid commentary or parentheses. Return JSON [{question,correctAnswer,distractor1,distractor2,distractor3}]";
const MAX_ANSWER_LENGTH = 60;

const getProxyUrl = () => {
  const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  return (
    env.VITE_AI_PROXY_URL ||
    (typeof window !== "undefined" ? window.AI_PROXY_URL : "") ||
    ""
  );
};

export function getAIStatus() {
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    return { isEnabled: true, mode: "proxy", endpoint: proxyUrl };
  }

  const { hasKey } = getGeminiConfig();
  if (hasKey) {
    return { isEnabled: true, mode: "direct" };
  }

  return {
    isEnabled: false,
    mode: "disabled",
    reason: "missing-configuration",
  };
}

const cleanAnswer = (text) => {
  if (!text) return "";
  let result = text.replace(/\s+/g, " ").trim();
  if (result.length <= MAX_ANSWER_LENGTH) return result;

  // Strip anything after the first parenthetical/comment delimiter to keep it tight.
  const parentheticalIndex = result.indexOf(" (");
  if (parentheticalIndex > 0) {
    result = result.slice(0, parentheticalIndex).trim();
  }
  if (result.length <= MAX_ANSWER_LENGTH && result.length > 0) return result;

  const delimiterRegex = /[.,:;-]/;
  const delimiterMatch = result.match(delimiterRegex);
  if (delimiterMatch && delimiterMatch.index > 0) {
    result = result.slice(0, delimiterMatch.index).trim();
  }
  if (result.length <= MAX_ANSWER_LENGTH && result.length > 0) return result;

  return `${result.slice(0, MAX_ANSWER_LENGTH - 1).trim()}…`;
};

const normalizeAiPayload = (raw) => {
  const source = Array.isArray(raw) ? raw : raw?.questions || [];
  return source
    .map((item) => {
      const question = item?.question?.trim();
      const correctAnswer = cleanAnswer(item?.correctAnswer);
      const distractors = [
        cleanAnswer(item?.distractor1),
        cleanAnswer(item?.distractor2),
        cleanAnswer(item?.distractor3),
      ]
        .filter(Boolean);

      if (!question || !correctAnswer || distractors.length !== 3) return null;
      return {
        question,
        correctAnswer,
        options: [correctAnswer, ...distractors],
      };
    })
    .filter(Boolean);
};

export async function requestAiQuestions(topic) {
  const trimmedTopic = topic?.trim();
  if (!trimmedTopic) {
    const error = new Error("Topic is required");
    error.code = "TOPIC_REQUIRED";
    throw error;
  }

  const status = getAIStatus();
  if (!status.isEnabled) {
    const error = new Error("AI generator is disabled");
    error.code = "AI_DISABLED";
    throw error;
  }

  if (status.mode === "proxy") {
    const response = await fetch(status.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: trimmedTopic }),
    });

    if (!response.ok) {
      const error = new Error("AI proxy error");
      error.code = `AI_PROXY_${response.status}`;
      throw error;
    }

    const payload = await response.json();
    return normalizeAiPayload(payload);
  }

  const userQuery = `Generate 5 trivia questions about "${trimmedTopic}".`;
  const jsonString = await callAIApi(userQuery, DEFAULT_SYSTEM_PROMPT);
  const parsed = JSON.parse(jsonString);
  return normalizeAiPayload(parsed);
}
