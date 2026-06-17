import { SaveSystem, LearnerProfile, SessionRecord, ProgressRecord } from './SaveSystem';
import { HintManager } from './HintManager';
import { FeedbackManager } from './FeedbackManager';
import { Problem } from './ProblemGenerator';
import * as Speech from 'expo-speech';
import { SessionManager, MAX_ACTIVITIES_PER_SESSION } from './managers/SessionManager';
import { ProgressTracker } from './managers/ProgressTracker';
import { ActivityLevelManager } from './managers/ActivityLevelManager';
import { ActivityManager } from './managers/ActivityManager';

export { MAX_ACTIVITIES_PER_SESSION };

/**
 * GameManager now acts as a Facade to prevent breaking changes in the UI layer 
 * while the new architecture is fully adopted.
 * Ideally, UI components should migrate to using SessionManager and ActivityViewModel directly.
 */
export class GameManager {
  private static instance: GameManager;

  public saveSystem: SaveSystem;
  public hintManager: HintManager;
  public feedbackManager: FeedbackManager;
  
  public sessionManager: SessionManager;
  public progressTracker: ProgressTracker;
  public levelManager: ActivityLevelManager;

  public currentStrategy: string = 'COUNT_ALL';
  private sessionStartTime: number = 0;

  private constructor() {
    this.saveSystem = new SaveSystem();
    this.hintManager = new HintManager();
    this.feedbackManager = new FeedbackManager();
    
    this.progressTracker = new ProgressTracker(this.saveSystem);
    this.levelManager = new ActivityLevelManager();
    this.sessionManager = new SessionManager(this.saveSystem, this.progressTracker, this.levelManager);
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.saveSystem.initialize();
  }

  public startSession(strategy: string): void {
    this.currentStrategy = strategy;
    this.sessionStartTime = Date.now();
    this.sessionManager.startSession(strategy);
  }

  public generateProblem(): Problem {
    // Generate a problem using the new ActivityManager if a session is active
    try {
      return this.sessionManager.getActivityManager().startNewActivity();
    } catch(e) {
      // Fallback for legacy access without starting a session
      this.startSession(this.currentStrategy);
      return this.sessionManager.getActivityManager().startNewActivity();
    }
  }

  private getCurrentProgress(): ProgressRecord {
    return this.saveSystem.getProgress(this.currentStrategy);
  }

  public getSessionActivityCount(): number {
    return this.sessionManager.getSessionActivityCount();
  }

  public isSessionComplete(): boolean {
    return this.sessionManager.isSessionComplete();
  }

  public static starsForTry(tryNumber: number, isCorrect: boolean): number {
    if (!isCorrect) return 0;
    if (tryNumber === 1) return 3;
    if (tryNumber === 2) return 2;
    return 1;
  }

  public async submitAnswer(
    isCorrect: boolean,
    tryNumber: number,
    responseTimeMs: number
  ): Promise<{ feedback: string; starsEarned: number }> {
    // Determine the actual answer value based on what would be correct if isCorrect is true,
    // Since the original signature only passed 'isCorrect', we have to simulate passing an answer to the new system.
    const activityManager = this.sessionManager.getActivityManager();
    const problem = activityManager.getCurrentProblem();
    
    if (isCorrect) {
      this.playSuccessSound();
    }
    
    let answer = 0;
    if (problem) {
        answer = isCorrect ? problem.correctAnswer : problem.correctAnswer + 1; // dummy wrong answer
    }

    const result = await activityManager.submitAnswer(answer);
    
    return {
      feedback: result.feedback,
      starsEarned: result.starsEarned
    };
  }

  public getHint(problem: Problem): string {
    return this.hintManager.getHint(this.currentStrategy, problem);
  }

  private async playSuccessSound() {
    try {
      Speech.stop();
      // Sounds and voiceovers removed
    } catch (e) {
      console.log('Success sound failed', e);
    }
  }

  public async completeAndResetSession(): Promise<SessionRecord> {
    return await this.sessionManager.completeAndResetSession();
  }
}
