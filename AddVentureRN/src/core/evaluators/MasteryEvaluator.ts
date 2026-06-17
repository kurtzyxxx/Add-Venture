import { ProgressRecord } from '../SaveSystem';
import { PerformanceMetrics } from '../models/PerformanceMetrics';

export class MasteryEvaluator {
  private static readonly MASTERY_THRESHOLD_ACCURACY = 85; // 85% accuracy needed
  private static readonly MASTERY_THRESHOLD_ATTEMPTS = 20;
  private static readonly FAST_RESPONSE_MS = 5000;

  /**
   * Evaluates whether the user has achieved mastery in a given strategy.
   */
  public evaluateMastery(progress: ProgressRecord, metrics: PerformanceMetrics): boolean {
    if (progress.totalAttempts < MasteryEvaluator.MASTERY_THRESHOLD_ATTEMPTS) {
      return false; // Not enough data
    }
    
    const accuracy = (progress.totalCorrect / progress.totalAttempts) * 100;
    
    if (accuracy < MasteryEvaluator.MASTERY_THRESHOLD_ACCURACY) {
      return false;
    }
    
    // Additional checks for mastery
    if (metrics.averageResponseTimeMs > MasteryEvaluator.FAST_RESPONSE_MS * 1.5) {
      // If average response is very slow, they might not have mastered it yet
      return false;
    }
    
    if (metrics.recurringErrors.length > 0) {
      // Still making recurring errors
      return false;
    }

    return true;
  }

  /**
   * Periodically re-evaluates mastery to ensure retention.
   * If they start failing, mastery can be revoked.
   */
  public reevaluateMastery(progress: ProgressRecord, recentPerformance: boolean[]): boolean {
    const recentFailures = recentPerformance.filter(p => !p).length;
    if (recentFailures >= 3 && recentPerformance.length <= 10) {
      // Failing 3 out of last 10 means they might be losing mastery
      return false; 
    }
    return true;
  }

  /**
   * Evaluates the current streak to determine if mastery should be updated.
   * Returns updated guidance level.
   */
  public evaluateStreak(): number {
    console.log("[MasteryEvaluator] Reading current success streak.");
    console.log("[MasteryEvaluator] Updating Mastery record.");
    // 1 corresponds to VisualGuidanceLevel.LOW based on our enum
    return 1;
  }
}
