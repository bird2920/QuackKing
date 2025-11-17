import { describe, it, expect, vi } from 'vitest';
import { AchievementBus } from '../src/services/achievements/AchievementBus.ts';

describe('AchievementBus', () => {
  it('delivers events to listeners registered for the emitted type', () => {
    const bus = new AchievementBus();
    const handler = vi.fn();
    const payload = { userId: 'user-1', gameId: 'game-1' };

    bus.on('GAME_CREATED', handler);
    const event = { type: 'GAME_CREATED', data: payload } as const;
    bus.emit(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('does not notify listeners registered under other event types', () => {
    const bus = new AchievementBus();
    const handler = vi.fn();

    bus.on('GAME_JOINED', handler);
    bus.emit({ type: 'GAME_CREATED', data: { userId: 'u', gameId: 'g' } });

    expect(handler).not.toHaveBeenCalled();
  });

  it('notifies all listeners and forwards event specific payloads', () => {
    const bus = new AchievementBus();
    const first = vi.fn();
    const second = vi.fn();
    const payload = {
      userId: 'player-1',
      gameId: 'game-abc',
      correct: true,
      answerTimeMs: 450,
    };

    bus.on('QUESTION_ANSWERED', first);
    bus.on('QUESTION_ANSWERED', second);

    const event = { type: 'QUESTION_ANSWERED', data: payload } as const;
    bus.emit(event);

    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
  });
});
