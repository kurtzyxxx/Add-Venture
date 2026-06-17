export class ActivityAttempt {
  public attempt_id: number;
  public is_correct: boolean;
  public response: string;

  constructor(attempt_id: number, is_correct: boolean, response: string) {
    this.attempt_id = attempt_id;
    this.is_correct = is_correct;
    this.response = response;
  }
}
