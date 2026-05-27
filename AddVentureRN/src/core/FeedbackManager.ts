export class FeedbackManager {
  private correctMessages = [
    "Great job!",
    "You got it!",
    "Awesome counting!",
    "Correct!",
    "Fantastic!"
  ];

  private incorrectMessages = [
    "Oops, not quite.",
    "Let's try again!",
    "Almost there!",
    "Keep trying!"
  ];

  public getFeedback(isCorrect: boolean): string {
    const pool = isCorrect ? this.correctMessages : this.incorrectMessages;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
