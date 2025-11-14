import { describe, it, expect, vi } from "vitest";
import { calculateScoreUpdates } from "../src/helpers/scoringUtils.js";

describe("calculateScoreUpdates", () => {
  it("skips players who have not answered", () => {
    const players = [
      { id: "1", lastAnswer: null },
      { id: "2", lastAnswer: undefined },
    ];
    const result = calculateScoreUpdates({
      players,
      correctAnswer: "A",
      questionStartTime: 0,
    });
    expect(result).toEqual([]);
  });

  it("updates counts and score for correct answers", () => {
    const players = [
      {
        id: "p1",
        lastAnswer: "A",
        answeredCount: 2,
        correctCount: 1,
        answerTimestamp: 15_000,
        score: 50,
      },
      {
        id: "p2",
        lastAnswer: "B",
        answeredCount: 0,
        correctCount: 0,
        answerTimestamp: 25_000,
        score: 10,
      },
    ];
    const result = calculateScoreUpdates({
      players,
      correctAnswer: "A",
      questionStartTime: 0,
    });

    expect(result).toHaveLength(2);

    const correctPlayer = result.find((entry) => entry.id === "p1");
    expect(correctPlayer.updates).toMatchObject({
      answeredCount: 3,
      correctCount: 2,
    });
    expect(correctPlayer.updates.score).toBe(300); // 50 + base + bonus

    const incorrectPlayer = result.find((entry) => entry.id === "p2");
    expect(incorrectPlayer.updates).toEqual({
      answeredCount: 1,
      correctCount: 0,
    });
  });

  it("uses provided now fallback when answer timestamp missing", () => {
    const players = [{ id: "p1", lastAnswer: "A", score: 0 }];
    const now = 10_000;
    const spy = vi.spyOn(Date, "now").mockReturnValue(1234);

    const [result] = calculateScoreUpdates({
      players,
      correctAnswer: "A",
      questionStartTime: 0,
      now,
    });

    expect(result.updates.score).toBe(300);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
