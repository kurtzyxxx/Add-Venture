import { SessionManager } from '../core/managers/SessionManager';
import { ActivityManager, ActivityResult } from '../core/managers/ActivityManager';
import { Problem } from '../core/ProblemGenerator';
import { VisualGuidanceLevel } from '../core/managers/ActivityLevelManager';

export class ActivityViewModel {
  private sessionManager: SessionManager;
  
  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }
  
  private getActivityManager(): ActivityManager {
    return this.sessionManager.getActivityManager();
  }

  public get currentProblem(): Problem | null {
    return this.getActivityManager().getCurrentProblem();
  }

  public get visualGuidanceLevel(): VisualGuidanceLevel {
    return this.getActivityManager().getVisualGuidanceLevel();
  }
  
  public get isSessionComplete(): boolean {
    return this.sessionManager.isSessionComplete();
  }

  public get sessionActivityCount(): number {
    return this.sessionManager.getSessionActivityCount();
  }

  public startNewActivity(): Problem {
    return this.getActivityManager().startNewActivity();
  }

  public async submitAnswer(answer: number): Promise<ActivityResult> {
    return await this.getActivityManager().submitAnswer(answer);
  }
}
