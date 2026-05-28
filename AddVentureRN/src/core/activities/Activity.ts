/**
 * Abstract Base Class for Activities as per the Object-Oriented Components Diagram.
 */
export abstract class Activity {
  public activityID: number;

  constructor(activityID: number) {
    this.activityID = activityID;
  }

  /**
   * Evaluates if the current state or response constitutes a correct answer.
   */
  public abstract checkAnswer(answer: any): boolean;

  /**
   * Commits the response to the persistent storage or state manager.
   */
  public abstract submitResponse(response: any): void;
}
