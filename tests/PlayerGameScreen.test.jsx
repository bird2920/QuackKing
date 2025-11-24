import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PlayerGameScreen from '../src/screens/PlayerGameScreen.jsx';

vi.mock('firebase/firestore', () => {
  const doc = vi.fn((db, path) => ({ db, path }));
  const collection = vi.fn((db, path) => ({ db, path }));
  return {
    updateDoc: vi.fn(),
    doc,
    collection,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlayerGameScreen pre-start countdown', () => {
  it('shows countdown and enables answering once it finishes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const lobbyState = {
      status: 'PLAYING',
      hostUserId: 'host-1',
      currentQuestionIndex: 0,
      currentQuestionStartTime: Date.now(),
      answerRevealed: false,
      questions: [{ question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' }],
    };

    const players = [
      { id: 'user-1', name: 'User', score: 0, lastAnswer: null, isHost: false },
    ];

    render(
      <PlayerGameScreen
        db={{}}
        gameCode="ABCD"
        lobbyState={lobbyState}
        players={players}
        currentQuestion={lobbyState.questions[0]}
        userId="user-1"
      />,
    );

    expect(screen.getByText(/Game starting in/i)).toBeInTheDocument();
    const answerBtn = screen.getByRole('button', { name: 'A' });
    expect(answerBtn).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.queryByText(/Game starting in/i)).not.toBeInTheDocument();
    expect(answerBtn).not.toBeDisabled();
  });
});
