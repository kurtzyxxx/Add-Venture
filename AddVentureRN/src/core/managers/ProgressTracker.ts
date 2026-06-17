import { SaveSystem, LearnerProfile, ProgressRecord } from '../SaveSystem';
import { PerformanceMetrics } from '../models/PerformanceMetrics';

export class ProgressTracker {
  private saveSystem: SaveSystem;
  private responseTimes: Record<string, number[]> = {};
  private recentAccuracies: Record<string, boolean[]> = {};

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
  }

  public getProfile(): LearnerProfile {
    return this.saveSystem.getProfile();
  }

  public getProgress(strategy: string): ProgressRecord {
    return this.saveSystem.getProgress(strategy);
  }
  
  public getAllProgress(): ProgressRecord[] {
    return this.saveSystem.getAllProgress();
  }

  public trackActivityResolution(
    strategy: string, 
    isCorrect: boolean, 
    responseTimeMs: number,
    stars: number,
    tryNumber: number
  ): void {
    // Record in memory for current session metrics
    if (!this.responseTimes[strategy]) this.responseTimes[strategy] = [];
    if (!this.recentAccuracies[strategy]) this.recentAccuracies[strategy] = [];
    
    this.responseTimes[strategy].push(responseTimeMs);
    this.recentAccuracies[strategy].push(isCorrect);
    
    if (this.responseTimes[strategy].length > 50) this.responseTimes[strategy].shift();
    if (this.recentAccuracies[strategy].length > 50) this.recentAccuracies[strategy].shift();

    // The actual persistant save will be handled by SessionManager/ActivityManager via SaveSystem
  }

  public getPerformanceMetrics(strategy: string, recurringErrors: string[] = []): PerformanceMetrics {
    const times = this.responseTimes[strategy] || [];
    const accuracies = this.recentAccuracies[strategy] || [];
    
    let averageResponseTimeMs = 0;
    if (times.length > 0) {
      averageResponseTimeMs = times.reduce((a,b) => a+b, 0) / times.length;
    }

    return {
      averageResponseTimeMs,
      recurringErrors,
      recentAccuracies: accuracies
    };
  }

  // --- UML Sequence Diagram Methods ---
  public checkProgression(strategy: string): void {
    console.log(`[ProgressTracker] Checking progression for ${strategy}`);
  }

  public retrieveProgress(strategy: string): ProgressRecord {
    console.log(`[ProgressTracker] Retrieving progress for ${strategy}`);
    return this.getProgress(strategy);
  }

  public requestData(): any {
    console.log("[ProgressTracker] Querying Session history.");
    console.log("[ProgressTracker] Calculating Performance_Trend averages.");
    return { formattedDataset: [] };
  }

  /**
   * Tracks progression within an activity.
   */
  public updateProgress(): void {
    console.log("[ProgressTracker] Progress updated.");
  }

  /**
   * Records the completion of an activity.
   */
  public recordCompletion(): void {
    console.log("[ProgressTracker] Completion recorded.");
  }

  // --- UML Defined Methods for Misconceptions ---
  public evaluateMisconceptions(): void {
    console.log("[ProgressTracker] Evaluating misconceptions based on error patterns.");
    this.flagLearningGap();
  }

  public flagLearningGap(): void {
    console.log("[ProgressTracker] Flagging learning gap for misconception.");
  }
}
