import { Problem } from '../ProblemGenerator';

export class RetryManager {
  private static readonly MAX_TRIES = 3;
  private currentTries: number = 0;
  private repeatSameProblemOnFailure: boolean = true;
  private lastProblem: Problem | null = null;
  private failedActivity: boolean = false;

  constructor(repeatSameProblemOnFailure: boolean = true) {
    this.repeatSameProblemOnFailure = repeatSameProblemOnFailure;
  }

  public reset(problem?: Problem): void {
    this.currentTries = 0;
    this.failedActivity = false;
    if (problem) {
      this.lastProblem = problem;
    }
  }

  public recordAttempt(isCorrect: boolean): void {
    this.currentTries++;
    if (!isCorrect && this.currentTries >= RetryManager.MAX_TRIES) {
      this.failedActivity = true;
    }
  }

  public getCurrentTries(): number {
    return this.currentTries;
  }

  public getStarsEarned(isCorrect: boolean): number {
    if (!isCorrect) return 0;
    if (this.currentTries === 1) return 3;
    if (this.currentTries === 2) return 2;
    return 1;
  }

  public isActivityResolved(isCorrect: boolean): boolean {
    return isCorrect || this.currentTries >= RetryManager.MAX_TRIES;
  }

  /**
   * Determine if we should present the exact same problem again (e.g. they failed completely, 
   * so give them another activity with the same numbers).
   */
  public shouldRepeatProblem(): boolean {
    return this.failedActivity && this.repeatSameProblemOnFailure;
  }

  public getLastProblem(): Problem | null {
    return this.lastProblem;
  }

  // --- UML Defined Properties and Methods ---
  public retryAllowed: boolean = true;

  public resetActivity(): void {
    console.log("[RetryManager] Resetting activity state.");
    this.reset();
  }

  public provideHintBeforeRetry(hintManager: any): void {
    console.log("[RetryManager] Providing hint before retry.");
    hintManager.triggerHint();
  }

  public allowReattempt(): void {
    console.log("[RetryManager] Allowing reattempt.");
    this.retryAllowed = true;
  }

  public triggerRetry(): void {
    console.log("[RetryManager] Triggering retry.");
    this.resetActivity();
  }
}
