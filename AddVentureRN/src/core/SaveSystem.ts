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
  completedActivities: number;
  starsEarned: number;
  totalCorrect: number;
  totalAttempts: number;
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
        { strategy: 'COUNT_ALL', unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0 },
        { strategy: 'COUNT_ON', unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0 },
        { strategy: 'NUMBER_BONDS', unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0 }
      ]
    };
  }

  public async initialize(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(SaveSystem.SAVE_KEY);
      if (json) {
        this.data = JSON.parse(json);
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
    return record || { strategy, unlockedLevel: 1, completedActivities: 0, starsEarned: 0, totalCorrect: 0, totalAttempts: 0 };
  }

  public getAllProgress(): ProgressRecord[] {
    return this.data.progressRecords;
  }

  public async recordActivity(strategy: string, isCorrect: boolean, stars: number): Promise<void> {
    const record = this.getProgress(strategy);
    record.totalAttempts++;
    if (isCorrect) {
      record.totalCorrect++;
      record.starsEarned += stars;
      record.completedActivities++;
      if (record.completedActivities % 3 === 0) {
        record.unlockedLevel++;
      }
    }
    
    const index = this.data.progressRecords.findIndex(r => r.strategy === strategy);
    if (index !== -1) {
      this.data.progressRecords[index] = record;
    } else {
      this.data.progressRecords.push(record);
    }
    await this.save();
  }
}
