export class GuidedHint {
  public hintMessage: string;
  public hintType: string;

  constructor(hintMessage: string, hintType: string) {
    this.hintMessage = hintMessage;
    this.hintType = hintType;
  }

  /**
   * Displays the hint to the learner.
   */
  public displayHint(): void {
    console.log(`[GuidedHint] Displaying hint: ${this.hintMessage}`);
  }
}
