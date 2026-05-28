import { Progress } from '../models/Progress';
import { DatabaseHelper } from '../../database/DatabaseHelper';

export class UnlockManager {
  private static instance: UnlockManager;

  private constructor() {}

  public static getInstance(): UnlockManager {
    if (!UnlockManager.instance) {
      UnlockManager.instance = new UnlockManager();
    }
    return UnlockManager.instance;
  }

  /**
   * Evaluates if the next activity should be unlocked and updates the progression record.
   */
  public async unlockActivity(learnerID: number, activityID: number): Promise<void> {
    try {
      const db = DatabaseHelper.getInstance().getDB();
      // Fetch progress from DB to pass to the Progress model
      // Example query: SELECT * FROM Progression WHERE learner_id = ? AND activity_id = ?
      // Because we aren't completely replacing the live system yet, we mock the result check
      const progress = new Progress(false, false);
      
      // In a real database scenario, you would evaluate accuracyRate and totalAttempts here
      // const shouldUnlock = progress.checkCriteria(accuracyRate, totalAttempts);
      
      console.log(`[UnlockManager] Evaluated unlock status for Learner ${learnerID}, Activity ${activityID}`);
      
      // If unlocked, update the progression table in SQLite:
      // await db.runAsync('UPDATE Progression SET unlocked = 1 WHERE learner_id = ? AND activity_id = ?', [learnerID, activityID]);

    } catch (e) {
      console.error("[UnlockManager] Failed to unlock activity", e);
    }
  }
}
