import { Activity } from './Activity';

export class CountOnActivity extends Activity {
  public startingQuantity: number = 0;
  public countOnAmount: number = 0;
  
  constructor(activityID: number) {
    super(activityID);
  }

  /**
   * Represents the logic to identify the starting quantity.
   */
  public identifyStartingQuantity(): void {
    console.log(`[CountOnActivity ${this.activityID}] Identifying the starting quantity.`);
  }

  /**
   * Represents the logic to start from a base number and count forward.
   */
  public countForward(): void {
    console.log(`[CountOnActivity ${this.activityID}] Counting forward from base number.`);
  }

  public checkAnswer(answer: any): boolean {
    return true; 
  }

  public submitResponse(response: any): void {
    console.log(`[CountOnActivity ${this.activityID}] Submitted response:`, response);
  }
}
