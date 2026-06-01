import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LearnerProfile {
  name: string;
  totalStars: number;
  overallProgress: number;
  currentDifficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  fastResponseStreak: number; // consecutive answers under 20 s
  createdAt: number;
}

export interface ProgressRecord {
  strategy: string;
  unlockedLevel: number;
  completedActivities: number; // total ever answered correctly (any try)
  starsEarned: number;
  totalCorrect: number;        // activities answered correctly (any try)
  totalAttempts: number;       // total activities attempted (resolved)
  currentDifficulty: number;   // Independent difficulty per strategy
  // --- Persistent session state (survives app exit) ---
  sessionActivitiesCount: number; // position in current 10-activity batch (0–10)
  sessionStarsCount: number;
  sessionCorrectCount: number;
  sessionStartTime: number;    // epoch ms of when the current batch started
}

export interface SessionRecord {
  strategy: string;
  totalActivities: number;
  totalStars: number;
  totalCorrect: number;
  totalAttempts: number;
  accuracyPct: number;          // 0-100
  avgResponseTimeMs: number;    // average response time for the session
  startedAt: number;
  completedAt: number;
}

export interface ResponseRecord {
  strategy: string;
  num1: number;
  num2: number;
  givenAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  responseTimeMs: number;
  tryNumber: number;
  timestamp: number;
}

interface SaveData {
  profile: LearnerProfile;
  progressRecords: ProgressRecord[];
  sessionHistory: SessionRecord[];   // persisted across launches (last 20 sessions)
  responseLog: ResponseRecord[];     // persisted (last 200 responses)
}

const MAX_SESSION_HISTORY = 20;
const MAX_RESPONSE_LOG = 200;

export class SaveSystem {
  private static readonly SAVE_KEY = '@addventure_save_v2';
  private data: SaveData;

  // Tracks response times for the current in-progress session (reset on completeAndResetSession)
  private currentSessionResponseTimes: number[] = [];

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
        fastResponseStreak: 0,
        createdAt: Date.now()
      },
      progressRecords: [
        this.freshProgress('COUNT_ALL'),
        this.freshProgress('COUNT_ON'),
        this.freshProgress('NUMBER_BONDS'),
      ],
      sessionHistory: [],
      responseLog: [],
    };
  }

  private freshProgress(strategy: string): ProgressRecord {
    return {
      strategy,
      unlockedLevel: 1,
      completedActivities: 0,
      starsEarned: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      currentDifficulty: 1,
      sessionActivitiesCount: 0,
      sessionStarsCount: 0,
      sessionCorrectCount: 0,
      sessionStartTime: Date.now(),
    };
  }

  public async initialize(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(SaveSystem.SAVE_KEY);
      if (json) {
        const loaded = JSON.parse(json) as SaveData;
        // Migrate progress records
        loaded.progressRecords = loaded.progressRecords.map((r: any) => ({
          ...this.freshProgress(r.strategy),
          ...r,
          sessionActivitiesCount: r.sessionActivitiesCount ?? 0,
          sessionStarsCount: r.sessionStarsCount ?? 0,
          sessionCorrectCount: r.sessionCorrectCount ?? 0,
          sessionStartTime: r.sessionStartTime ?? Date.now(),
          currentDifficulty: r.currentDifficulty ?? loaded.profile?.currentDifficulty ?? 1,
        }));
        // Migrate profile
        loaded.profile = {
          ...this.createFreshSave().profile,
          ...loaded.profile,
          fastResponseStreak: loaded.profile.fastResponseStreak ?? 0,
        };
        // Migrate new top-level arrays
        loaded.sessionHistory = loaded.sessionHistory ?? [];
        loaded.responseLog = loaded.responseLog ?? [];
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

  // ── Profile ───────────────────────────────────────────────────────────────

  public getProfile(): LearnerProfile {
    return this.data.profile;
  }

  public async saveProfile(profile: LearnerProfile): Promise<void> {
    this.data.profile = profile;
    await this.save();
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  public getProgress(strategy: string): ProgressRecord {
    return (
      this.data.progressRecords.find(r => r.strategy === strategy) ??
      this.freshProgress(strategy)
    );
  }

  public async updateStrategyDifficulty(strategy: string, newDifficulty: number): Promise<void> {
    const record = this.getProgress(strategy);
    record.currentDifficulty = newDifficulty;
    this.upsertRecord(record);
    await this.save();
  }

  public getAllProgress(): ProgressRecord[] {
    return this.data.progressRecords;
  }

  /** Accuracy = % of activities eventually answered correctly (any try), 0–100 */
  public getAccuracy(strategy: string): number {
    const r = this.getProgress(strategy);
    if (r.totalAttempts === 0) return 0;
    return Math.round((r.totalCorrect / r.totalAttempts) * 100);
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

  // ── Activity Recording ────────────────────────────────────────────────────

  /**
   * Called each time an activity is resolved (correct or all tries exhausted).
   * Updates cumulative totals, session counters, response log, and fast-streak.
   */
  public async recordActivity(
    strategy: string,
    isCorrect: boolean,
    stars: number,
    tryNumber: number,
    responseTimeMs: number,
    num1: number,
    num2: number,
    givenAnswer: number,
    correctAnswer: number,
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

    // Response log
    const entry: ResponseRecord = {
      strategy,
      num1,
      num2,
      givenAnswer,
      correctAnswer,
      isCorrect,
      responseTimeMs,
      tryNumber,
      timestamp: Date.now(),
    };
    this.data.responseLog.push(entry);
    if (this.data.responseLog.length > MAX_RESPONSE_LOG) {
      this.data.responseLog = this.data.responseLog.slice(-MAX_RESPONSE_LOG);
    }

    // Current-session response time (for session summary)
    this.currentSessionResponseTimes.push(responseTimeMs);

    // Fast response streak (< 20 s)
    const profile = this.data.profile;
    if (isCorrect && responseTimeMs < 20000) {
      profile.fastResponseStreak++;
    } else {
      profile.fastResponseStreak = 0;
    }
    this.data.profile = profile;

    await this.save();
  }

  /**
   * Called when the learner completes the 10-activity session.
   * Persists a SessionRecord, resets session counters.
   */
  public async completeAndResetSession(strategy: string): Promise<SessionRecord> {
    const record = this.getProgress(strategy);
    const accuracyPct =
      record.sessionActivitiesCount > 0
        ? Math.round((record.sessionCorrectCount / record.sessionActivitiesCount) * 100)
        : 0;
    const avgMs =
      this.currentSessionResponseTimes.length > 0
        ? Math.round(
            this.currentSessionResponseTimes.reduce((a, b) => a + b, 0) /
              this.currentSessionResponseTimes.length
          )
        : 0;

    const sessionRecord: SessionRecord = {
      strategy,
      totalActivities: record.sessionActivitiesCount,
      totalStars: record.sessionStarsCount,
      totalCorrect: record.sessionCorrectCount,
      totalAttempts: record.sessionActivitiesCount,
      accuracyPct,
      avgResponseTimeMs: avgMs,
      startedAt: record.sessionStartTime,
      completedAt: Date.now(),
    };

    // Persist to history
    this.data.sessionHistory.push(sessionRecord);
    if (this.data.sessionHistory.length > MAX_SESSION_HISTORY) {
      this.data.sessionHistory = this.data.sessionHistory.slice(-MAX_SESSION_HISTORY);
    }

    // Reset session counters
    record.sessionActivitiesCount = 0;
    record.sessionStarsCount = 0;
    record.sessionCorrectCount = 0;
    record.sessionStartTime = Date.now();
    this.upsertRecord(record);
    this.currentSessionResponseTimes = [];

    await this.save();
    return sessionRecord;
  }

  // ── Query Helpers ─────────────────────────────────────────────────────────

  public getSessionHistory(): SessionRecord[] {
    return [...this.data.sessionHistory].reverse(); // most recent first
  }

  public getSessionHistoryForStrategy(strategy: string): SessionRecord[] {
    return this.data.sessionHistory
      .filter(s => s.strategy === strategy)
      .slice()
      .reverse();
  }

  public getResponseLog(): ResponseRecord[] {
    return this.data.responseLog;
  }

  /** Average response time (ms) for a strategy, from the persisted response log. */
  public getAverageResponseTime(strategy: string): number {
    const entries = this.data.responseLog.filter(r => r.strategy === strategy);
    if (entries.length === 0) return 0;
    return Math.round(entries.reduce((s, r) => s + r.responseTimeMs, 0) / entries.length);
  }

  /**
   * Returns up to `limit` problem combos that have been failed the most times.
   * Key format: "num1+num2".
   */
  public getMisconceptionPatterns(
    strategy: string,
    limit = 3
  ): { combo: string; failCount: number }[] {
    const failures = this.data.responseLog.filter(
      r => r.strategy === strategy && !r.isCorrect
    );
    const counts: Record<string, number> = {};
    for (const r of failures) {
      const key = `${r.num1}+${r.num2}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([combo, failCount]) => ({ combo, failCount }))
      .filter(({ failCount }) => failCount >= 2)
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, limit);
  }

  /** Last session for a given strategy, or null. */
  public getLastSession(strategy: string): SessionRecord | null {
    const hist = this.getSessionHistoryForStrategy(strategy);
    return hist.length > 0 ? hist[0] : null;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private upsertRecord(record: ProgressRecord): void {
    const index = this.data.progressRecords.findIndex(r => r.strategy === record.strategy);
    if (index !== -1) {
      this.data.progressRecords[index] = record;
    } else {
      this.data.progressRecords.push(record);
    }
  }
}
