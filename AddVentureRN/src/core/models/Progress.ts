export class Progress {
  public completionStatus: boolean;
  public unlockStatus: boolean;
  public currentLevel: number;
  public accuracy: number;

  constructor(
    completionStatus: boolean = false, 
    unlockStatus: boolean = false,
    currentLevel: number = 1,
    accuracy: number = 0.0
  ) {
    this.completionStatus = completionStatus;
    this.unlockStatus = unlockStatus;
    this.currentLevel = currentLevel;
    this.accuracy = accuracy;
  }

  /**
   * Updates the progress state and optionally synchronizes with the database.
   */
  public updateProgress(): void {
    console.log(`[Progress] Progress updated. Level: ${this.currentLevel}, Accuracy: ${this.accuracy}%`);
  }

  /**
   * Evaluates if criteria to unlock the next activity are met.
   * This is generally called by the UnlockManager.
   */
  public checkCriteria(accuracyRate: number, totalAttempts: number): boolean {
    return totalAttempts >= 10 && accuracyRate >= 60;
  }
}
