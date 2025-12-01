import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HostGameScreen from '../src/screens/HostGameScreen.jsx';

vi.mock('firebase/firestore', () => {
  const doc = vi.fn((db, path) => ({ db, path }));
  const collection = vi.fn((db, path) => ({ db, path }));
  return {
    updateDoc: vi.fn(),
    getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      commit: vi.fn(async () => { }),
    })),
    doc,
    collection,
  };
});
import { updateDoc } from 'firebase/firestore';

afterEach(() => {
  vi.clearAllMocks();
  window.__testMode = undefined;
});

describe('HostGameScreen', () => {
  const baseQuestions = [
    { question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
    { question: 'Q2', options: ['C', 'D'], correctAnswer: 'C' },
  ];

  const playersWithStaleAnswers = [
    { id: 'p1', name: 'One', lastAnswer: 'A', score: 0, answerTimestamp: Date.now() - 10_000 },
    { id: 'p2', name: 'Two', lastAnswer: 'B', score: 0, answerTimestamp: Date.now() - 10_000 },
  ];

  function Harness() {
    const [lobbyState, setLobbyState] = useState({
      status: 'PLAYING',
      hostUserId: 'host-1',
      currentQuestionIndex: 0,
      currentQuestionStartTime: Date.now(),
      answerRevealed: false,
      questions: baseQuestions,
    });
    const [players] = useState(playersWithStaleAnswers);
    const currentQuestion =
      lobbyState.questions[lobbyState.currentQuestionIndex];

    return (
      <>
        <HostGameScreen
          db={{}}
          gameCode="ABCD"
          lobbyState={lobbyState}
          players={players}
          currentQuestion={currentQuestion}
          userId="host-1"
        />
        <button
          data-testid="next-question"
          onClick={() =>
            setLobbyState((prev) => ({
              ...prev,
              currentQuestionIndex: prev.currentQuestionIndex + 1,
              currentQuestionStartTime: Date.now(),
              answerRevealed: false,
            }))
          }
        >
          Advance props
        </button>
      </>
    );
  }

  it('avoids auto-revealing immediately on a new question when auto-host is enabled but answers are stale', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('next-question'));

    await screen.findByText('Players Answered: 0 / 2');

    await act(async () => { });

    expect(updateDoc).not.toHaveBeenCalledWith(
      expect.anything(),
      { answerRevealed: true },
    );
  });

  it('auto-reveals when the timer has already expired in auto-host mode', async () => {
    function ExpiredTimerHarness() {
      const [lobbyState] = useState({
        status: 'PLAYING',
        hostUserId: 'host-1',
        currentQuestionIndex: 0,
        currentQuestionStartTime: Date.now() - 31_000,
        answerRevealed: false,
        questions: baseQuestions,
      });
      const players = [
        { id: 'p1', name: 'One', lastAnswer: null, score: 0 },
        { id: 'p2', name: 'Two', lastAnswer: null, score: 0 },
      ];
      const currentQuestion =
        lobbyState.questions[lobbyState.currentQuestionIndex];

      return (
        <HostGameScreen
          db={{}}
          gameCode="ABCD"
          lobbyState={lobbyState}
          players={players}
          currentQuestion={currentQuestion}
          userId="host-1"
        />
      );
    }

    render(<ExpiredTimerHarness />);

    await screen.findAllByText('Players Answered: 0 / 2');

    await screen.findByText(/correct answer/i);

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { answerRevealed: true },
    );
  });

  it('shows auto-host as off when lobbyState.autoHost is false', () => {
    const lobbyState = {
      status: 'PLAYING',
      hostUserId: 'host-1',
      currentQuestionIndex: 0,
      currentQuestionStartTime: Date.now(),
      answerRevealed: false,
      questions: baseQuestions,
      autoHost: false,
    };
    const players = [
      { id: 'p1', name: 'One', score: 0, lastAnswer: null },
      { id: 'p2', name: 'Two', score: 0, lastAnswer: null },
    ];

    render(
      <HostGameScreen
        db={{}}
        gameCode="ABCD"
        lobbyState={lobbyState}
        players={players}
        currentQuestion={lobbyState.questions[0]}
        userId="host-1"
      />,
    );

    expect(screen.getByText('Off')).toBeInTheDocument();
  });
});
