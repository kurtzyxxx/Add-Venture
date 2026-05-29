export class AdaptiveDifficultyEngine {
  
  /**
   * Adjusts the difficulty based on performance.
   * Returns a number between 1 (easiest) and 5 (hardest).
   */
  public evaluatePerformance(currentDifficulty: number, isCorrect: boolean, responseTimeMs: number): number {
    let newDifficulty = currentDifficulty;

    if (isCorrect) {
      if (responseTimeMs < 5000) {
        newDifficulty += 0.5; // Fast and correct -> harder
      } else {
        newDifficulty += 0.2; // Correct but slow -> slightly harder
      }
    } else {
      newDifficulty -= 0.5; // Incorrect -> easier
    }

    // Clamp difficulty between 1 and 5
    return Math.max(1, Math.min(5, Math.floor(newDifficulty)));
  }

  public getDifficultyLabel(level: number): string {
    switch(Math.floor(level)) {
      case 1: return "Easy";
      case 2: return "Medium";
      case 3: return "Hard";
      case 4: return "Expert";
      case 5: return "Master";
      default: return "Easy";
    }
  }

  // --- UML Sequence Diagram Methods ---
  /**
   * Reads historical metrics to evaluate performance.
   */
  public evaluatePerformanceMetrics(): void {
    console.log("[AdaptiveDifficultyEngine] Evaluating learner performance from historical metrics.");
  }

  /**
   * Evaluates and sets the difficulty level.
   */
  public adjustDifficulty(): void {
    console.log("[AdaptiveDifficultyEngine] Adjusting difficulty level based on performance evaluation.");
  }

  public requestNextModule(): any {
    console.log("[AdaptiveDifficultyEngine] Fetching recent Activity_Attempt metrics.");
    console.log("[AdaptiveDifficultyEngine] Calculating Difficulty_Level.");
    return { parameters: "Dynamic difficulty parameters" };
  }
}
