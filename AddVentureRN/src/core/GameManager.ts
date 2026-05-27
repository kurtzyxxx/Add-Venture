import { SaveSystem, LearnerProfile, SessionRecord } from './SaveSystem';
import { DifficultyEngine } from './DifficultyEngine';
import { HintManager } from './HintManager';
import { FeedbackManager } from './FeedbackManager';
import { ProblemGenerator, CountAllGenerator, CountOnGenerator, NumberBondsGenerator, Problem } from './ProblemGenerator';

export class GameManager {
  private static instance: GameManager;

  public saveSystem: SaveSystem;
  public difficultyEngine: DifficultyEngine;
  public hintManager: HintManager;
  public feedbackManager: FeedbackManager;

  private generators: Record<string, ProblemGenerator>;

  public currentStrategy: string = 'COUNT_ALL';
  public currentSession: SessionRecord | null = null;
  private sessionStartTime: number = 0;

  private constructor() {
    this.saveSystem = new SaveSystem();
    this.difficultyEngine = new DifficultyEngine();
    this.hintManager = new HintManager();
    this.feedbackManager = new FeedbackManager();

    this.generators = {
      'COUNT_ALL': new CountAllGenerator(),
      'COUNT_ON': new CountOnGenerator(),
      'NUMBER_BONDS': new NumberBondsGenerator()
    };
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.saveSystem.initialize();
  }

  public startSession(strategy: string): void {
    this.currentStrategy = strategy;
    this.sessionStartTime = Date.now();
    this.currentSession = {
      strategy,
      totalActivities: 0,
      totalStars: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      startedAt: this.sessionStartTime
    };
  }

  public generateProblem(): Problem {
    const profile = this.saveSystem.getProfile();
    const generator = this.generators[this.currentStrategy];
    if (!generator) throw new Error("Invalid strategy: " + this.currentStrategy);

    return generator.generateProblem(profile.currentDifficulty);
  }

  public async submitAnswer(isCorrect: boolean, responseTimeMs: number): Promise<{ feedback: string, starsEarned: number }> {
    if (!this.currentSession) throw new Error("Session not started");

    const profile = this.saveSystem.getProfile();
    
    let starsEarned = 0;
    if (isCorrect) {
      starsEarned = profile.currentDifficulty * 10;
      profile.consecutiveCorrect++;
      profile.consecutiveWrong = 0;
      profile.totalStars += starsEarned;
      
      this.currentSession.totalCorrect++;
      this.currentSession.totalStars += starsEarned;
    } else {
      profile.consecutiveCorrect = 0;
      profile.consecutiveWrong++;
    }

    this.currentSession.totalActivities++;
    this.currentSession.totalAttempts++;

    // Adjust difficulty
    profile.currentDifficulty = this.difficultyEngine.evaluatePerformance(profile.currentDifficulty, isCorrect, responseTimeMs);
    
    await this.saveSystem.saveProfile(profile);
    await this.saveSystem.recordActivity(this.currentStrategy, isCorrect, starsEarned);

    return {
      feedback: this.feedbackManager.getFeedback(isCorrect),
      starsEarned
    };
  }

  public getHint(problem: Problem): string {
    return this.hintManager.getHint(this.currentStrategy, problem);
  }

  public endSession(): SessionRecord | null {
    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }
}
