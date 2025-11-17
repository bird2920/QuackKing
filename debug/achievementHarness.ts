/**
 * Minimal script for experimenting with the achievement service.
 * Run with: npx ts-node debug/achievementHarness.ts
 */
import {
  AchievementEvent,
  achievementBus,
  createInMemoryAchievementsService,
  registerAchievementEvaluators,
} from '../src/services/achievements';

interface UnlockLogEntry {
  userId: string;
  achievementId: string;
  timestamp: number;
}

class AchievementDebugHarness {
  private readonly bus = achievementBus;
  private readonly service = createInMemoryAchievementsService();
  private readonly unlockLog: UnlockLogEntry[] = [];
  private readonly knownUnlocks = new Map<string, Set<string>>();

  constructor() {
    registerAchievementEvaluators({ bus: this.bus, service: this.service });
  }

  emit(event: AchievementEvent): void {
    console.log(`\n>>> Emitting ${event.type}`, event.data);
    this.bus.emit(event);
    this.captureUnlocks(event.data.userId);
  }

  printUnlocks(): void {
    if (!this.unlockLog.length) {
      console.log('\nNo achievements unlocked yet.');
      return;
    }

    console.log('\nAchievements unlocked:');
    this.unlockLog.forEach((unlock) => {
      console.log(
        `  - ${unlock.userId} unlocked ${unlock.achievementId} at ${new Date(
          unlock.timestamp,
        ).toISOString()}`,
      );
    });
  }

  printUserStates(userId: string): void {
    const states = this.service.getAchievementsForUser(userId);
    console.log(`\n${userId} currently has ${states.length} unlocks:`);
    states.forEach((state) => {
      const timestamp = state.unlock
        ? new Date(state.unlock.timestamp).toISOString()
        : 'pending';
      console.log(`  - ${state.achievement.name} (${timestamp})`);
    });
  }

  private captureUnlocks(userId: string): void {
    if (!userId) return;
    const states = this.service.getAchievementsForUser(userId);
    const current = new Set(states.map((state) => state.achievement.id));
    const previous = this.knownUnlocks.get(userId) ?? new Set();

    current.forEach((achievementId) => {
      if (!previous.has(achievementId)) {
        const unlock = states.find(
          (state) => state.achievement.id === achievementId,
        )?.unlock;
        this.unlockLog.push({
          userId,
          achievementId,
          timestamp: unlock?.timestamp ?? Date.now(),
        });
        console.log(`  -> ${userId} unlocked ${achievementId}`);
      }
    });

    this.knownUnlocks.set(userId, current);
  }
}

const harness = new AchievementDebugHarness();

const fakeEvents: AchievementEvent[] = [
  {
    type: 'GAME_CREATED',
    data: { userId: 'host-1', gameId: 'game-1' },
  },
  {
    type: 'GAME_JOINED',
    data: { userId: 'player-1', gameId: 'game-1' },
  },
  {
    type: 'QUESTION_ANSWERED',
    data: { userId: 'player-1', gameId: 'game-1', correct: true, answerTimeMs: 800 },
  },
  {
    type: 'QUESTION_ANSWERED',
    data: { userId: 'player-1', gameId: 'game-1', correct: true, answerTimeMs: 1200 },
  },
  {
    type: 'QUESTION_ANSWERED',
    data: { userId: 'player-1', gameId: 'game-1', correct: true, answerTimeMs: 1100 },
  },
  {
    type: 'GAME_FINISHED',
    data: {
      userId: 'host-1',
      gameId: 'game-1',
      finalScore: 105,
      players: [
        { userId: 'host-1', score: 105 },
        { userId: 'player-1', score: 115 },
        { userId: 'player-2', score: 90 },
        { userId: 'player-3', score: 87 },
      ],
      hostUserId: 'host-1',
      finalRank: 2,
    },
  },
  {
    type: 'GAME_FINISHED',
    data: {
      userId: 'player-1',
      gameId: 'game-1',
      finalScore: 115,
      players: [
        { userId: 'host-1', score: 105 },
        { userId: 'player-1', score: 115 },
        { userId: 'player-2', score: 90 },
        { userId: 'player-3', score: 87 },
      ],
      hostUserId: 'host-1',
      finalRank: 1,
      startingRank: 4,
      longFormAccuracy: 1,
    },
  },
];

fakeEvents.forEach((event) => harness.emit(event));

harness.printUnlocks();
harness.printUserStates('host-1');
harness.printUserStates('player-1');
