/** Shuffles an array (Fisher-Yates). */
export const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Parse CSV into questions array. */
export const parseCSV = (csvText) => {
  const lines = csvText.split("\n").filter((l) => l.trim() !== "");
  return lines
    .map((line, i) => {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 2) return null;

      const [question, correctAnswer, ...distractors] = parts;
      const options = [correctAnswer, ...distractors].filter(Boolean).slice(0, 5);

      if (options.length < 2) return null;

      return {
        id: i,
        question,
        correctAnswer,
        options: shuffleArray(options),
      };
    })
    .filter(Boolean);
};