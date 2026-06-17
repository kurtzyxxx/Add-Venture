import { ProblemGenerator, Problem } from '../ProblemGenerator';
import { RetryManager } from './RetryManager';
import { ResponseEvaluator } from '../evaluators/ResponseEvaluator';
import { ActivityLevelManager, VisualGuidanceLevel } from './ActivityLevelManager';
import { ProgressTracker } from './ProgressTracker';
import { SaveSystem } from '../SaveSystem';
import { FeedbackManager } from '../FeedbackManager';
import { MisconceptionType } from '../models/Misconception';

export interface ActivityResult {
  isCorrect: boolean;
  activityResolved: boolean;
  starsEarned: number;
  feedback: string;
  misconception?: MisconceptionType;
}

export class ActivityManager {
  private generator: ProblemGenerator;
  private retryManager: RetryManager;
  private responseEvaluator: ResponseEvaluator;
  private levelManager: ActivityLevelManager;
  private progressTracker: ProgressTracker;
  private saveSystem: SaveSystem;
  private feedbackManager: FeedbackManager;
  
  private currentStrategy: string;
  private currentProblem: Problem | null = null;
  private activityStartTime: number = 0;
  private _hasResolved: boolean = false;

  constructor(
    strategy: string,
    generator: ProblemGenerator,
    levelManager: ActivityLevelManager,
    progressTracker: ProgressTracker,
    saveSystem: SaveSystem
  ) {
    this.currentStrategy = strategy;
    this.generator = generator;
    this.levelManager = levelManager;
    this.progressTracker = progressTracker;
    this.saveSystem = saveSystem;
    
    this.retryManager = new RetryManager(true);
    this.responseEvaluator = new ResponseEvaluator();
    this.feedbackManager = new FeedbackManager();
  }

  public startNewActivity(): Problem {
    // If they completely failed the last one, we might want to repeat it
    if (this.retryManager.shouldRepeatProblem() && this.retryManager.getLastProblem()) {
      this.currentProblem = this.retryManager.getLastProblem() as Problem;
    } else {
      const profile = this.saveSystem.getProfile();
      this.currentProblem = this.generator.generateProblem(profile.currentDifficulty);
    }
    
    this.retryManager.reset(this.currentProblem);
    this._hasResolved = false;
    this.startTimer();
    return this.currentProblem;
  }

  // --- UML Defined Timer Methods ---
  public startTimer(): void {
    console.log("[ActivityManager] Timer started.");
    this.activityStartTime = Date.now();
  }

  public stopTimer(): void {
    console.log("[ActivityManager] Timer stopped.");
  }

  public calculateResponseTime(): number {
    return Date.now() - this.activityStartTime;
  }
  // ---------------------------------

  public getCurrentProblem(): Problem | null {
    return this.currentProblem;
  }
  
  public getVisualGuidanceLevel(): VisualGuidanceLevel {
    const profile = this.saveSystem.getProfile();
    return this.levelManager.getVisualGuidanceLevel(profile.currentDifficulty, profile.consecutiveCorrect);
  }

  // --- UML Defined Methods for Validation ---
  public async validateAnswer(answer: number): Promise<ActivityResult> {
    console.log("[ActivityManager] Validating answer.");
    return await this.submitAnswer(answer);
  }

  public async submitAnswer(answer: number): Promise<ActivityResult> {
    if (!this.currentProblem) throw new Error("No active problem");

    const evaluation = this.responseEvaluator.evaluate(this.currentProblem, answer);
    this.retryManager.recordAttempt(evaluation.isCorrect);
    
    const isResolved = this.retryManager.isActivityResolved(evaluation.isCorrect);
    const stars = this.retryManager.getStarsEarned(evaluation.isCorrect);
    this.stopTimer();
    const responseTime = this.calculateResponseTime();
    
    // Insert into Activity_Attempt Database Table
    let attemptId = 1;
    try {
      const { DatabaseHelper } = require('../../database/DatabaseHelper');
      const db = DatabaseHelper.getInstance().getDB();
      const profile = this.saveSystem.getProfile();
      
      const result = await db.runAsync(
        `INSERT INTO Activity_Attempt (progress_id, attempt_number, response, is_correct, response_time)
         VALUES (?, ?, ?, ?, ?)`,
        [profile.id || 1, this.retryManager.getCurrentTries(), answer.toString(), evaluation.isCorrect ? 1 : 0, responseTime]
      );
      attemptId = result.lastInsertRowId;
    } catch (e) {
      console.warn("[ActivityManager] Could not insert Activity_Attempt to DB:", e);
    }
    
    // UC-4.1 Analyze Error Patterns
    if (!evaluation.isCorrect) {
      this.feedbackManager.analyzeError(attemptId, this.currentStrategy, evaluation.misconception || "GENERAL_ERROR", this.progressTracker);
    }

    if (isResolved && !this._hasResolved) {
      this._hasResolved = true;
      await this.resolveActivity(evaluation.isCorrect, responseTime, stars, this.retryManager.getCurrentTries());
    }

    return {
      isCorrect: evaluation.isCorrect,
      activityResolved: isResolved,
      starsEarned: stars,
      feedback: this.feedbackManager.getFeedback(evaluation.isCorrect),
      misconception: evaluation.misconception,
      hintText: evaluation.hint?.hintMessage
    };
  }

  private async resolveActivity(isCorrect: boolean, responseTimeMs: number, stars: number, tries: number) {
    const profile = this.saveSystem.getProfile();
    
    if (isCorrect) {
      profile.consecutiveCorrect++;
      profile.consecutiveWrong = 0;
      profile.totalStars += stars;
    } else {
      profile.consecutiveCorrect = 0;
      profile.consecutiveWrong++;
    }

    // Adjust difficulty
    profile.currentDifficulty = this.levelManager.calculateNewDifficulty(
      profile.currentDifficulty, 
      isCorrect, 
      responseTimeMs
    );
    
    await this.saveSystem.saveProfile(profile);
    await this.saveSystem.recordActivity(this.currentStrategy, isCorrect, stars, tries);
    
    this.progressTracker.trackActivityResolution(this.currentStrategy, isCorrect, responseTimeMs, stars, tries);
  }
  
  public getRecurringErrors(): string[] {
    return this.responseEvaluator.getRecurringErrors();
  }
}
