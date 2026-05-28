import { ProgressRecord } from '../SaveSystem';
import { MasteryEvaluator } from './MasteryEvaluator';
import { PerformanceMetrics } from '../models/PerformanceMetrics';

export class ProgressionEvaluator {
  private masteryEvaluator: MasteryEvaluator;

  constructor(masteryEvaluator: MasteryEvaluator) {
    this.masteryEvaluator = masteryEvaluator;
  }

  /**
   * Determines if a specific strategy is unlocked based on prior strategies' progress.
   */
  public isStrategyUnlocked(
    targetStrategy: string, 
    allProgress: ProgressRecord[],
    metricsMap: Record<string, PerformanceMetrics>
  ): boolean {
    if (targetStrategy === 'COUNT_ALL') {
      return true; // Always unlocked
    }

    if (targetStrategy === 'COUNT_ON') {
      const countAllProgress = allProgress.find(p => p.strategy === 'COUNT_ALL');
      if (!countAllProgress) return false;
      
      // Basic check from SaveSystem
      const accuracy = this.getAccuracy(countAllProgress);
      const basicUnlock = countAllProgress.totalAttempts >= 10 && accuracy >= 60;
      
      // We can also require mastery if we want a stricter progression
      // return basicUnlock && this.masteryEvaluator.evaluateMastery(countAllProgress, metricsMap['COUNT_ALL']);
      return basicUnlock;
    }

    if (targetStrategy === 'NUMBER_BONDS') {
      const countOnProgress = allProgress.find(p => p.strategy === 'COUNT_ON');
      if (!countOnProgress) return false;

      const accuracy = this.getAccuracy(countOnProgress);
      return countOnProgress.totalAttempts >= 10 && accuracy >= 60;
    }

    return false;
  }

  private getAccuracy(record: ProgressRecord): number {
    if (record.totalAttempts === 0) return 0;
    return Math.round((record.totalCorrect / record.totalAttempts) * 100);
  }
}
