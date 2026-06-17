import { Activity } from './Activity';

export class CountAllActivity extends Activity {
  public objectGroups: any[] = [];
  public totalCount: number = 0;
  
  constructor(activityID: number) {
    super(activityID);
  }

  /**
   * Represents the logic to drag and group objects.
   * In the UI layer, this is handled by PanResponders, but this method
   * can be used to validate if the drag action fulfills the activity rule.
   */
  public dragObjects(): void {
    console.log(`[CountAllActivity ${this.activityID}] Objects dragged and grouped.`);
  }

  /**
   * Represents the logic to count all objects after they are grouped.
   */
  public countAllObjects(): void {
    console.log(`[CountAllActivity ${this.activityID}] Counting all objects.`);
  }

  public checkAnswer(answer: any): boolean {
    // Logic to verify if the count all total is correct
    return true; 
  }

  public submitResponse(response: any): void {
    console.log(`[CountAllActivity ${this.activityID}] Submitted response:`, response);
  }
}
