import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import PlayerGameScreen from '../src/screens/PlayerGameScreen.jsx';

const achievementEmit = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => {
  const doc = vi.fn((db, path) => ({ db, path }));
  const collection = vi.fn((db, path) => ({ db, path }));
  return {
    updateDoc: vi.fn(),
    doc,
    collection,
  };
});

vi.mock('../src/services/achievements', () => ({
  achievementBus: {
    emit: achievementEmit,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
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

describe('PlayerGameScreen answer updates', () => {
  it('allows changing answers before reveal and updates the timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const lobbyState = {
      status: 'PLAYING',
      hostUserId: 'host-1',
      currentQuestionIndex: 1,
      currentQuestionStartTime: Date.now(),
      answerRevealed: false,
      questions: [
        { question: 'Q1', options: ['A', 'B', 'C'], correctAnswer: 'A' },
      ],
    };

    const players = [
      { id: 'user-1', name: 'User', score: 0, lastAnswer: 'A', isHost: false },
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

    fireEvent.click(screen.getByRole('button', { name: 'B' }));

    const { updateDoc } = await import('firebase/firestore');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc.mock.calls[0][1]).toMatchObject({
      lastAnswer: 'B',
      answerTimestamp: Date.now(),
    });

    act(() => {
      vi.setSystemTime(new Date('2024-01-01T00:00:05Z'));
    });

    fireEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(updateDoc).toHaveBeenCalledTimes(2);
    expect(updateDoc.mock.calls[1][1]).toMatchObject({
      lastAnswer: 'C',
      answerTimestamp: Date.now(),
    });
  });

  it('locks answers after reveal and avoids updating', async () => {
    const lobbyState = {
      status: 'PLAYING',
      hostUserId: 'host-1',
      currentQuestionIndex: 1,
      currentQuestionStartTime: Date.now(),
      answerRevealed: true,
      questions: [
        { question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
      ],
    };

    const players = [
      { id: 'user-1', name: 'User', score: 0, lastAnswer: 'A', isHost: false },
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

    const answerBtn = screen.getByRole('button', { name: 'B' });
    expect(answerBtn).toBeDisabled();

    fireEvent.click(answerBtn);

    const { updateDoc } = await import('firebase/firestore');
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('emits achievement data once when the answer is revealed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:03Z'));

    const lobbyState = {
      status: 'PLAYING',
      hostUserId: 'host-1',
      currentQuestionIndex: 1,
      currentQuestionStartTime: Date.now() - 2000,
      answerRevealed: false,
      questions: [
        { question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
      ],
    };

    const players = [
      {
        id: 'user-1',
        name: 'User',
        score: 0,
        lastAnswer: 'A',
        answerTimestamp: Date.now(),
        isHost: false,
      },
    ];

    const { rerender } = render(
      <PlayerGameScreen
        db={{}}
        gameCode="ABCD"
        lobbyState={lobbyState}
        players={players}
        currentQuestion={lobbyState.questions[0]}
        userId="user-1"
      />,
    );

    expect(achievementEmit).not.toHaveBeenCalled();

    rerender(
      <PlayerGameScreen
        db={{}}
        gameCode="ABCD"
        lobbyState={{ ...lobbyState, answerRevealed: true }}
        players={players}
        currentQuestion={lobbyState.questions[0]}
        userId="user-1"
      />,
    );

    expect(achievementEmit).toHaveBeenCalledTimes(1);
    expect(achievementEmit.mock.calls[0][0]).toMatchObject({
      type: 'QUESTION_ANSWERED',
      data: {
        userId: 'user-1',
        gameId: 'ABCD',
        correct: true,
        answerTimeMs: 2000,
      },
    });
  });
});
