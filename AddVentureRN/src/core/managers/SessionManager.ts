import { ActivityManager, ActivityResult } from './ActivityManager';
import { ProblemGenerator, CountAllGenerator, CountOnGenerator, NumberBondsGenerator, Problem } from '../ProblemGenerator';
import { SaveSystem, SessionRecord } from '../SaveSystem';
import { ActivityLevelManager } from './ActivityLevelManager';
import { ProgressTracker } from './ProgressTracker';
import { MasteryEvaluator } from '../evaluators/MasteryEvaluator';
import { ProgressionEvaluator } from '../evaluators/ProgressionEvaluator';

export const MAX_ACTIVITIES_PER_SESSION = 10;

export class SessionManager {
  private saveSystem: SaveSystem;
  private progressTracker: ProgressTracker;
  private levelManager: ActivityLevelManager;
  private progressionEvaluator: ProgressionEvaluator;
  
  private generators: Record<string, ProblemGenerator>;
  
  private currentStrategy: string = 'COUNT_ALL';
  private sessionStartTime: number = 0;
  
  private activityManager: ActivityManager | null = null;

  constructor(
    saveSystem: SaveSystem,
    progressTracker: ProgressTracker,
    levelManager: ActivityLevelManager
  ) {
    this.saveSystem = saveSystem;
    this.progressTracker = progressTracker;
    this.levelManager = levelManager;
    
    const masteryEvaluator = new MasteryEvaluator();
    this.progressionEvaluator = new ProgressionEvaluator(masteryEvaluator);
    
    this.generators = {
      'COUNT_ALL': new CountAllGenerator(),
      'COUNT_ON': new CountOnGenerator(),
      'NUMBER_BONDS': new NumberBondsGenerator()
    };
  }

  public startSession(strategy: string): void {
    this.currentStrategy = strategy;
    this.sessionStartTime = Date.now();
    
    const generator = this.generators[this.currentStrategy];
    if (!generator) throw new Error("Invalid strategy: " + this.currentStrategy);
    
    this.activityManager = new ActivityManager(
      strategy,
      generator,
      this.levelManager,
      this.progressTracker,
      this.saveSystem
    );
  }

  public getActivityManager(): ActivityManager {
    if (!this.activityManager) throw new Error("Session not started");
    return this.activityManager;
  }

  public getSessionActivityCount(): number {
    return this.saveSystem.getProgress(this.currentStrategy).sessionActivitiesCount;
  }

  public isSessionComplete(): boolean {
    return this.getSessionActivityCount() >= MAX_ACTIVITIES_PER_SESSION;
  }

  public async completeAndResetSession(): Promise<SessionRecord> {
    const p = this.saveSystem.getProgress(this.currentStrategy);
    const summary: SessionRecord = {
      strategy: this.currentStrategy,
      totalActivities: p.sessionActivitiesCount,
      totalStars: p.sessionStarsCount,
      totalCorrect: p.sessionCorrectCount,
      totalAttempts: p.sessionActivitiesCount, // In a batch, attempts = activities
      startedAt: this.sessionStartTime
    };
    
    await this.saveSystem.completeAndResetSession(this.currentStrategy);
    return summary;
  }
  
  public isNextStrategyUnlocked(targetStrategy: string): boolean {
    const allProgress = this.saveSystem.getAllProgress();
    // Assuming metrics Map can be generated dynamically
    return this.progressionEvaluator.isStrategyUnlocked(targetStrategy, allProgress, {});
  }

  // --- UML Defined Methods for Session Summary ---
  public endSession(): void {
    console.log("[SessionManager] Ending session.");
    this.generateSummary();
  }

  public generateSummary(): void {
    console.log("[SessionManager] Generating session performance summary.");
  }
}
