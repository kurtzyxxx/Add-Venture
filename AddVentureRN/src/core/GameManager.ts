import { SaveSystem, LearnerProfile, SessionRecord, ProgressRecord } from './SaveSystem';
import { DifficultyEngine } from './DifficultyEngine';
import { HintManager } from './HintManager';
import { FeedbackManager } from './FeedbackManager';
import { ProblemGenerator, CountAllGenerator, CountOnGenerator, NumberBondsGenerator, Problem } from './ProblemGenerator';
import * as Speech from 'expo-speech';

export const MAX_ACTIVITIES_PER_SESSION = 10;

export class GameManager {
  private static instance: GameManager;

  public saveSystem: SaveSystem;
  public difficultyEngine: DifficultyEngine;
  public hintManager: HintManager;
  public feedbackManager: FeedbackManager;

  private generators: Record<string, ProblemGenerator>;

  public currentStrategy: string = 'COUNT_ALL';
  private sessionStartTime: number = 0;

  private constructor() {
    this.saveSystem = new SaveSystem();
    this.difficultyEngine = new DifficultyEngine();
    this.hintManager = new HintManager();
    this.feedbackManager = new FeedbackManager();

    this.generators = {
      'COUNT_ALL': new CountAllGenerator(),
      'COUNT_ON': new CountOnGenerator(),
      'NUMBER_BONDS': new NumberBondsGenerator()
    };
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
    // Session state is now pulled from SaveSystem, so we just set the strategy
  }

  public generateProblem(): Problem {
    const profile = this.saveSystem.getProfile();
    const generator = this.generators[this.currentStrategy];
    if (!generator) throw new Error("Invalid strategy: " + this.currentStrategy);
    return generator.generateProblem(profile.currentDifficulty);
  }

  private getCurrentProgress(): ProgressRecord {
    return this.saveSystem.getProgress(this.currentStrategy);
  }

  /** Returns how many activities have been completed in the current 10-activity batch */
  public getSessionActivityCount(): number {
    return this.getCurrentProgress().sessionActivitiesCount;
  }

  /** Returns true when the session has reached the 10-activity cap */
  public isSessionComplete(): boolean {
    return this.getSessionActivityCount() >= MAX_ACTIVITIES_PER_SESSION;
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
    const profile = this.saveSystem.getProfile();
    const starsEarned = GameManager.starsForTry(tryNumber, isCorrect);

    if (isCorrect) {
      this.playSuccessSound();
      profile.consecutiveCorrect++;
      profile.consecutiveWrong = 0;
      profile.totalStars += starsEarned;
    } else {
      profile.consecutiveCorrect = 0;
      profile.consecutiveWrong++;
    }

    const activityResolved = isCorrect || tryNumber >= 3;
    if (activityResolved) {
      profile.currentDifficulty = this.difficultyEngine.evaluatePerformance(
        profile.currentDifficulty,
        isCorrect,
        responseTimeMs
      );
      await this.saveSystem.saveProfile(profile);
      await this.saveSystem.recordActivity(this.currentStrategy, isCorrect, starsEarned, tryNumber);
    } else {
      await this.saveSystem.saveProfile(profile);
    }

    return {
      feedback: this.feedbackManager.getFeedback(isCorrect),
      starsEarned
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

  /** 
   * Call this ONLY when finishing a full 10-activity session.
   * Returns stats for the summary screen, then resets the batch counters.
   */
  public async completeAndResetSession(): Promise<SessionRecord> {
    const p = this.getCurrentProgress();
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
}
