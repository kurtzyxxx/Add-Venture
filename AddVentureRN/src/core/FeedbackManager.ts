export class FeedbackManager {
  private correctMessages = [
    "Great job!",
    "You got it!",
    "Awesome counting!",
    "Correct!",
    "Fantastic!"
  ];

  private incorrectMessages = [
    "Oops, not quite.",
    "Let's try again!",
    "Almost there!",
    "Keep trying!"
  ];

  public getFeedback(isCorrect: boolean): string {
    const pool = isCorrect ? this.correctMessages : this.incorrectMessages;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  public displayFeedback(): void {
    console.log("[FeedbackManager] Displaying feedback UI.");
  }

  public triggerRetry(retryManager: any): void {
    console.log("[FeedbackManager] Triggering retry.");
    if (retryManager.retryAllowed) {
      retryManager.resetActivity();
    }
  }

  // --- UML Defined Methods ---
  public analyzeError(): void {
    console.log("[FeedbackManager] Analyzing error from recent activity attempt.");
    this.logErrorPattern();
  }

  public logErrorPattern(progressTracker: any): void {
    console.log("[FeedbackManager] Logging error pattern to database.");
    console.log("[FeedbackManager] Triggering evaluateMisconceptions on ProgressTracker.");
    if (progressTracker) {
      progressTracker.evaluateMisconceptions();
    }
  }
}
