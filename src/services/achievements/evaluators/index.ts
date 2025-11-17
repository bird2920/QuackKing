import { AchievementsService } from '../AchievementsService';
import { AchievementBus, AchievementEventType } from '../AchievementBus';
import { createComebackKidEvaluator } from './comebackKid';
import { createFirstGameCreatedEvaluator } from './firstGameCreated';
import { createFirstGameJoinedEvaluator } from './firstGameJoined';
import { createLightningRoundEvaluator } from './lightningRound';
import { createPartyStarterEvaluator } from './partyStarter';
import { createPerfectStreakEvaluator } from './perfectStreak';
import { createScholarEvaluator } from './scholar';
import { createUnder1sCorrectEvaluator } from './under1sCorrect';
import { AchievementEvaluator } from './evaluatorTypes';

type EvaluatorFactory = () => AchievementEvaluator<AchievementEventType>;

const evaluatorFactories: EvaluatorFactory[] = [
  createUnder1sCorrectEvaluator,
  createLightningRoundEvaluator,
  createFirstGameCreatedEvaluator,
  createFirstGameJoinedEvaluator,
  createPerfectStreakEvaluator,
  createPartyStarterEvaluator,
  createComebackKidEvaluator,
  createScholarEvaluator,
];

export interface RegisterAchievementEvaluatorsOptions {
  bus: AchievementBus;
  service: AchievementsService;
}

export function registerAchievementEvaluators({
  bus,
  service,
}: RegisterAchievementEvaluatorsOptions): void {
  evaluatorFactories.forEach((factory) => {
    const evaluator = factory();
    bus.on(evaluator.event, (event) => evaluator.handle({ event, service }));
  });
}

export type { AchievementEvaluator } from './evaluatorTypes';
