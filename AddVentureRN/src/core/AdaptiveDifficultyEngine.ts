export const TARGET_RESPONSE_MS = 20000; // 20 seconds — the pedagogical target

export class AdaptiveDifficultyEngine {

  /**
   * Adjusts difficulty based on the entire session's performance.
   * Increments exactly by 1 level if mastered.
   */
  public evaluateSession(
    currentDifficulty: number,
    accuracyPct: number,
    avgResponseTimeMs: number
  ): number {
    let newDifficulty = Math.floor(currentDifficulty); // Normalize to current integer level

    if (accuracyPct >= 70) {
      newDifficulty += 1; // Level up!
    } else if (accuracyPct < 40) {
      newDifficulty -= 1; // Level down!
    }
    // else stay the same

    // Clamp between 1.0 and 9.9
    return Math.max(1.0, Math.min(9.9, newDifficulty));
  }

  public getDifficultyLabel(level: number): string {
    const addPair = Math.floor(level);
    return `Adding ${addPair}s`;
  }
}
