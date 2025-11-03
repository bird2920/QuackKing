/** Generates a 4-character uppercase alphanumeric game code. */
export const generateGameCode = () =>
  Math.random().toString(36).substring(2, 6).toUpperCase();