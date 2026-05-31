import { SaveSystem, LearnerProfile, SessionRecord } from './SaveSystem';
import { DifficultyEngine, TARGET_RESPONSE_MS } from './DifficultyEngine';
import { HintManager } from './HintManager';
import { FeedbackManager } from './FeedbackManager';
import {
  ProblemGenerator,
  CountAllGenerator,
  CountOnGenerator,
  NumberBondsGenerator,
  Problem,
} from './ProblemGenerator';
import * as Speech from 'expo-speech';

export { TARGET_RESPONSE_MS };
export const MAX_ACTIVITIES_PER_SESSION = 10;

// ── Mastery Queue ─────────────────────────────────────────────────────────────
// Tracks problems the learner has failed. Each entry records how many consecutive
// correct answers they've given for that same concept since it was queued.
export interface MasteryItem {
  originalProblem: Problem;
  consecutiveCorrect: number;
  totalAttempts: number;
}

export class GameManager {
  private static instance: GameManager;

  public saveSystem: SaveSystem;
  public difficultyEngine: DifficultyEngine;
  public hintManager: HintManager;
  public feedbackManager: FeedbackManager;

  private generators: Record<string, ProblemGenerator>;

  public currentStrategy: string = 'COUNT_ALL';
  private sessionStartTime: number = 0;

  // Per-session mastery queue (not persisted; resets when the session ends)
  private masteryQueue: MasteryItem[] = [];

  private constructor() {
    this.saveSystem = new SaveSystem();
    this.difficultyEngine = new DifficultyEngine();
    this.hintManager = new HintManager();
    this.feedbackManager = new FeedbackManager();

    this.generators = {
      COUNT_ALL: new CountAllGenerator(),
      COUNT_ON: new CountOnGenerator(),
      NUMBER_BONDS: new NumberBondsGenerator(),
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
    this.masteryQueue = [];
  }

  public generateProblem(): Problem {
    const profile = this.saveSystem.getProfile();
    const generator = this.generators[this.currentStrategy];
    if (!generator) throw new Error('Invalid strategy: ' + this.currentStrategy);
    return generator.generateProblem(profile.currentDifficulty);
  }

  /**
   * Generate a "similar" problem to the original — same concept, operands shifted by ±1.
   * Ensures the new problem has a different answer to avoid exact repetition.
   */
  public generateSimilarProblem(original: Problem): Problem {
    const generator = this.generators[this.currentStrategy];
    const profile = this.saveSystem.getProfile();
    let attempt = 0;
    while (attempt < 10) {
      const candidate = generator.generateProblem(profile.currentDifficulty);
      // Accept if it targets the same approximate range but has a different answer
      const diff = Math.abs(candidate.correctAnswer - original.correctAnswer);
      if (diff <= 2 && diff >= 0 && candidate.correctAnswer !== original.correctAnswer) {
        return candidate;
      }
      attempt++;
    }
    // Fallback: return a fresh problem
    return generator.generateProblem(profile.currentDifficulty);
  }

  // ── Mastery Queue API ────────────────────────────────────────────────────

  /** Call when a learner fails a problem (all tries exhausted). Adds it to the mastery queue. */
  public addToMasteryQueue(problem: Problem): void {
    // Don't double-add the same problem
    const exists = this.masteryQueue.find(
      item =>
        item.originalProblem.num1 === problem.num1 &&
        item.originalProblem.num2 === problem.num2 &&
        item.originalProblem.correctAnswer === problem.correctAnswer
    );
    if (!exists) {
      this.masteryQueue.push({ originalProblem: problem, consecutiveCorrect: 0, totalAttempts: 0 });
    }
  }

  /** Returns the next problem from the mastery queue (as a similar variant), or null if empty. */
  public getNextMasteryProblem(): Problem | null {
    if (this.masteryQueue.length === 0) return null;
    const item = this.masteryQueue[0];
    item.totalAttempts++;
    // Serve similar variants (not identical) to keep it educational
    return this.generateSimilarProblem(item.originalProblem);
  }

  /** True if the mastery queue has pending items. */
  public hasMasteryItems(): boolean {
    return this.masteryQueue.length > 0;
  }

  /**
   * Records a correct answer on a mastery item.
   * If the item reaches 3 consecutive correct answers, it is removed (mastered).
   * Returns true if the item was just mastered.
   */
  public recordMasteryCorrect(problem: Problem): boolean {
    const idx = this.masteryQueue.findIndex(
      item =>
        Math.abs(item.originalProblem.correctAnswer - problem.correctAnswer) <= 2
    );
    if (idx === -1) return false;
    this.masteryQueue[idx].consecutiveCorrect++;
    if (this.masteryQueue[idx].consecutiveCorrect >= 3) {
      this.masteryQueue.splice(idx, 1);
      return true; // mastered!
    }
    return false;
  }

  /** Records an incorrect answer on a mastery item (resets its consecutive counter). */
  public recordMasteryIncorrect(problem: Problem): void {
    const idx = this.masteryQueue.findIndex(
      item =>
        Math.abs(item.originalProblem.correctAnswer - problem.correctAnswer) <= 2
    );
    if (idx !== -1) {
      this.masteryQueue[idx].consecutiveCorrect = 0;
    }
  }

  /** Returns the consecutive-correct count for the current front-of-queue mastery item. */
  public getMasteryProgress(): { consecutiveCorrect: number; needed: number } | null {
    if (this.masteryQueue.length === 0) return null;
    return { consecutiveCorrect: this.masteryQueue[0].consecutiveCorrect, needed: 3 };
  }

  // ── Session State ────────────────────────────────────────────────────────

  private getCurrentProgress() {
    return this.saveSystem.getProgress(this.currentStrategy);
  }

  public getSessionActivityCount(): number {
    return this.getCurrentProgress().sessionActivitiesCount;
  }

  public isSessionComplete(): boolean {
    return this.getSessionActivityCount() >= MAX_ACTIVITIES_PER_SESSION;
  }

  public static starsForTry(tryNumber: number, isCorrect: boolean): number {
    if (!isCorrect) return 0;
    if (tryNumber === 1) return 3;
    if (tryNumber === 2) return 2;
    return 1;
  }

  // ── Answer Submission ────────────────────────────────────────────────────

  public async submitAnswer(
    isCorrect: boolean,
    tryNumber: number,
    responseTimeMs: number,
    problem: Problem,
    givenAnswer: number,
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
      await this.saveSystem.recordActivity(
        this.currentStrategy,
        isCorrect,
        starsEarned,
        tryNumber,
        responseTimeMs,
        problem.num1,
        problem.num2,
        givenAnswer,
        problem.correctAnswer,
      );
    } else {
      await this.saveSystem.saveProfile(profile);
    }

    return {
      feedback: this.feedbackManager.getFeedback(isCorrect),
      starsEarned,
    };
  }

  public getHint(problem: Problem): string {
    return this.hintManager.getHint(this.currentStrategy, problem);
  }

  private async playSuccessSound() {
    try {
      Speech.stop();
    } catch (e) {
      console.log('Success sound failed', e);
    }
  }

  /**
   * Call ONLY when finishing a full 10-activity session.
   * Returns stats for the summary screen, then resets the batch counters.
   */
  public async completeAndResetSession(): Promise<SessionRecord> {
    this.masteryQueue = [];
    return this.saveSystem.completeAndResetSession(this.currentStrategy);
  }

  /** Fast response streak (< 20 s consecutive) from the persisted profile. */
  public getFastResponseStreak(): number {
    return this.saveSystem.getProfile().fastResponseStreak;
  }
}
