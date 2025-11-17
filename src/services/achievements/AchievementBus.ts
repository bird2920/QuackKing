export type AchievementEventType =
  | 'GAME_CREATED'
  | 'GAME_JOINED'
  | 'QUESTION_ANSWERED'
  | 'GAME_FINISHED';

export interface BaseEventContext {
  userId: string;
  gameId: string;
}

export interface GameCreatedContext extends BaseEventContext {}

export interface GameJoinedContext extends BaseEventContext {}

export interface QuestionAnsweredContext extends BaseEventContext {
  correct: boolean;
  answerTimeMs: number;
}

export interface GameFinishedContext extends BaseEventContext {
  finalScore: number;
  players: Array<{ userId: string; score: number }>;
  hostUserId?: string;
  finalRank?: number;
  startingRank?: number;
  longFormAccuracy?: number;
  metadata?: Record<string, any>;
}

export type AchievementEvent =
  | { type: 'GAME_CREATED'; data: GameCreatedContext }
  | { type: 'GAME_JOINED'; data: GameJoinedContext }
  | { type: 'QUESTION_ANSWERED'; data: QuestionAnsweredContext }
  | { type: 'GAME_FINISHED'; data: GameFinishedContext };

export class AchievementBus {
  private listeners = new Map<
    AchievementEventType,
    Array<(event: AchievementEvent) => void>
  >();

  on<T extends AchievementEventType>(
    eventType: T,
    listener: (event: Extract<AchievementEvent, { type: T }>) => void,
  ): () => void {
    const bucket = this.listeners.get(eventType) ?? [];
    const wrappedListener = listener as (event: AchievementEvent) => void;
    bucket.push(wrappedListener);
    this.listeners.set(eventType, bucket);
    return () => {
      const listeners = this.listeners.get(eventType);
      if (!listeners) return;
      this.listeners.set(
        eventType,
        listeners.filter((existing) => existing !== wrappedListener),
      );
    };
  }

  emit(event: AchievementEvent): void {
    this.listeners.get(event.type)?.forEach((listener) => {
      listener(event);
    });
  }
}
