import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LearnerProfile {
  name: string;
  totalStars: number;
  overallProgress: number;
  currentDifficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  createdAt: number;
}

export interface ProgressRecord {
  strategy: string;
  unlockedLevel: number;
  completedActivities: number; // total ever answered correctly (any try)
  starsEarned: number;
  totalCorrect: number;        // activities answered correctly (any try)
  totalAttempts: number;       // total activities attempted (resolved, not try presses)
  // --- Persistent session state (survives app exit) ---
  sessionActivitiesCount: number; // position in current 10-activity batch (0–10)
  sessionStarsCount: number;      // stars earned so far in this batch
  sessionCorrectCount: number;    // correct so far in this batch
}

export interface SessionRecord {
  strategy: string;
  totalActivities: number;
  totalStars: number;
  totalCorrect: number;
  totalAttempts: number;
  startedAt: number;
}

interface SaveData {
  profile: LearnerProfile;
  progressRecords: ProgressRecord[];
}

export class SaveSystem {
  private static readonly SAVE_KEY = '@addventure_save';
  private data: SaveData;

  constructor() {
    this.data = this.createFreshSave();
  }

  private createFreshSave(): SaveData {
    return {
      profile: {
        name: 'Learner',
        totalStars: 0,
        overallProgress: 0,
        currentDifficulty: 1,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        createdAt: Date.now()
      },
      progressRecords: [
        { strategy: 'COUNT_ALL', unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0, sessionActivitiesCount: 0, sessionStarsCount: 0, sessionCorrectCount: 0 },
        { strategy: 'COUNT_ON', unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0, sessionActivitiesCount: 0, sessionStarsCount: 0, sessionCorrectCount: 0 },
        { strategy: 'NUMBER_BONDS', unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0, sessionActivitiesCount: 0, sessionStarsCount: 0, sessionCorrectCount: 0 }
      ]
    };
  }

  public async initialize(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(SaveSystem.SAVE_KEY);
      if (json) {
        const loaded = JSON.parse(json) as SaveData;
        // Migrate old records missing session fields
        loaded.progressRecords = loaded.progressRecords.map((r: any) => ({
          ...r,
          sessionActivitiesCount: r.sessionActivitiesCount ?? 0,
          sessionStarsCount: r.sessionStarsCount ?? 0,
          sessionCorrectCount: r.sessionCorrectCount ?? 0,
        }));
        this.data = loaded;
      } else {
        this.data = this.createFreshSave();
        await this.save();
      }
    } catch (e) {
      console.warn('[SaveSystem] Failed to load save, starting fresh.', e);
      this.data = this.createFreshSave();
    }
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(SaveSystem.SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('[SaveSystem] Failed to save data.', e);
    }
  }

  public getProfile(): LearnerProfile {
    return this.data.profile;
  }

  public async saveProfile(profile: LearnerProfile): Promise<void> {
    this.data.profile = profile;
    await this.save();
  }

  public getProgress(strategy: string): ProgressRecord {
    const record = this.data.progressRecords.find(r => r.strategy === strategy);
    return record || {
      strategy, unlockedLevel: 1, completedActivities: 0, starsEarned: 0,
      totalCorrect: 0, totalAttempts: 0,
      sessionActivitiesCount: 0, sessionStarsCount: 0, sessionCorrectCount: 0
    };
  }

  public getAllProgress(): ProgressRecord[] {
    return this.data.progressRecords;
  }

  /** Accuracy = % of activities eventually answered correctly (any try), 0–100 */
  public getAccuracy(strategy: string): number {
    const r = this.getProgress(strategy);
    if (r.totalAttempts === 0) return 0;
    // Calculate accuracy based on stars (3 stars = 100%, 2 stars = 66%, 1 star = 33%)
    return Math.round((r.starsEarned / (r.totalAttempts * 3)) * 100);
  }

  /** Count On unlocks when Count All: accuracy >= 60% AND totalAttempts >= 10 */
  public isCountOnUnlocked(): boolean {
    const r = this.getProgress('COUNT_ALL');
    return r.totalAttempts >= 10 && this.getAccuracy('COUNT_ALL') >= 60;
  }

  /** Number Bonds unlocks when Count On: accuracy >= 60% AND totalAttempts >= 10 */
  public isNumberBondsUnlocked(): boolean {
    const r = this.getProgress('COUNT_ON');
    return r.totalAttempts >= 10 && this.getAccuracy('COUNT_ON') >= 60;
  }

  /**
   * Called each time an activity is resolved (correct or all tries exhausted).
   * Updates cumulative totals AND the persistent session counters.
   */
  public async recordActivity(
    strategy: string,
    isCorrect: boolean,
    stars: number,
    tryNumber: number
  ): Promise<void> {
    const record = this.getProgress(strategy);

    // Cumulative totals
    record.totalAttempts++;
    if (isCorrect) {
      record.totalCorrect++;
      record.starsEarned += stars;
      record.completedActivities++;
      if (record.completedActivities % 3 === 0) record.unlockedLevel++;
    }

    // Persistent session counters
    record.sessionActivitiesCount++;
    record.sessionStarsCount += stars;
    if (isCorrect) record.sessionCorrectCount++;

    this.upsertRecord(record);
    await this.save();
  }

  /**
   * Called when the learner completes the 10-activity session.
   * Resets session counters so the next session starts fresh.
   */
  public async completeAndResetSession(strategy: string): Promise<void> {
    const record = this.getProgress(strategy);
    record.sessionActivitiesCount = 0;
    record.sessionStarsCount = 0;
    record.sessionCorrectCount = 0;
    this.upsertRecord(record);
    await this.save();
  }

  private upsertRecord(record: ProgressRecord): void {
    const index = this.data.progressRecords.findIndex(r => r.strategy === record.strategy);
    if (index !== -1) {
      this.data.progressRecords[index] = record;
    } else {
      this.data.progressRecords.push(record);
    }
  }
}
