import { AdaptiveDifficultyEngine } from '../engines/AdaptiveDifficultyEngine';

export enum VisualGuidanceLevel {
  HIGH = 3,    // All manipulatives, outlines, hints
  MEDIUM = 2,  // Only some manipulatives or outlines
  LOW = 1,     // No manipulatives, abstract symbols only
}

export class ActivityLevelManager {
  private difficultyEngine: AdaptiveDifficultyEngine;

  constructor() {
    this.difficultyEngine = new AdaptiveDifficultyEngine();
  }

  public getDifficultyEngine(): AdaptiveDifficultyEngine {
    return this.difficultyEngine;
  }

  public calculateNewDifficulty(
    currentDifficulty: number, 
    isCorrect: boolean, 
    responseTimeMs: number
  ): number {
    return this.difficultyEngine.evaluatePerformance(currentDifficulty, isCorrect, responseTimeMs);
  }

  public getDifficultyLabel(level: number): string {
    return this.difficultyEngine.getDifficultyLabel(level);
  }

  /**
   * Determines the visual guidance level based on difficulty and recent accuracy.
   */
  public getVisualGuidanceLevel(currentDifficulty: number, consecutiveCorrect: number): VisualGuidanceLevel {
    if (currentDifficulty >= 4 || consecutiveCorrect > 5) {
      return VisualGuidanceLevel.LOW;
    } else if (currentDifficulty >= 2 || consecutiveCorrect > 2) {
      return VisualGuidanceLevel.MEDIUM;
    }
    return VisualGuidanceLevel.HIGH;
  }

  /**
   * Verifies if the criteria to advance the level are met.
   */
  public verifyCriteria(accuracy: number, responseTime: number): boolean {
    return accuracy >= 80 && responseTime < 5000;
  }

  // --- UML Sequence Diagram Methods ---
  public checkProgression(progress: any): void {
    console.log("[ActivityLevelManager] Checking progression.");
    this.checkLevel(progress);
  }

  public retrieveProgress(progressTracker: any, strategy: string): any {
    console.log("[ActivityLevelManager] Retrieving progress.");
    return progressTracker.retrieveProgress(strategy);
  }

  public verifyAccuracy(accuracy: number): boolean {
    console.log(`[ActivityLevelManager] Verifying accuracy: ${accuracy}%`);
    return accuracy >= 60;
  }
  // ------------------------------------

  /**
   * Checks the current level performance and determines if a level up is needed.
   */
  public checkLevel(progress: any): void {
    const shouldLevelUp = this.verifyCriteria(progress.accuracy, 4000); // Mock response time
    if (shouldLevelUp || this.verifyAccuracy(progress.accuracy)) {
      this.loadNextLevel(progress);
    }
  }

  /**
   * Loads the next difficulty level and updates the progress object.
   */
  public loadNextLevel(progress: any): void {
    if (progress.currentLevel !== undefined) {
      progress.currentLevel += 1;
      progress.updateProgress();
      console.log(`[ActivityLevelManager] Loaded Next Level: ${progress.currentLevel}`);
    }
  }
}
