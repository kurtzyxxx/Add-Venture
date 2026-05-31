export const TARGET_RESPONSE_MS = 20000; // 20 seconds — the pedagogical target

export class DifficultyEngine {

  /**
   * Adjusts difficulty based on correctness and response time.
   * Returns a number between 1 (easiest) and 5 (hardest).
   */
  public evaluatePerformance(
    currentDifficulty: number,
    isCorrect: boolean,
    responseTimeMs: number
  ): number {
    let newDifficulty = currentDifficulty;

    if (isCorrect) {
      if (responseTimeMs < 10000) {
        // Very fast and correct → increase difficulty faster
        newDifficulty += 0.5;
      } else if (responseTimeMs < TARGET_RESPONSE_MS) {
        // Correct and within the 20-second target → moderate increase
        newDifficulty += 0.2;
      } else {
        // Correct but slow → tiny increase (still progressing)
        newDifficulty += 0.1;
      }
    } else {
      newDifficulty -= 0.5; // Incorrect → easier
    }

    // Clamp between 1 and 5
    return Math.max(1, Math.min(5, Math.floor(newDifficulty)));
  }

  public getDifficultyLabel(level: number): string {
    switch (Math.floor(level)) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      case 4: return 'Expert';
      case 5: return 'Master';
      default: return 'Easy';
    }
  }
}
