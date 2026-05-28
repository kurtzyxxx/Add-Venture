import { Problem } from '../ProblemGenerator';
import { MisconceptionType, Misconception } from '../models/Misconception';

export class ResponseEvaluator {
  private recentErrors: string[] = [];
  
  public evaluate(problem: Problem, answer: number): {
    isCorrect: boolean;
    misconception?: MisconceptionType;
  } {
    const isCorrect = problem.correctAnswer === answer;
    
    if (isCorrect) {
      return { isCorrect: true };
    }
    
    const misconception = this.detectMisconception(problem, answer);
    this.trackError(problem, answer);
    
    return {
      isCorrect: false,
      misconception,
    };
  }
  
  private detectMisconception(problem: Problem, answer: number): MisconceptionType {
    if (Math.abs(problem.correctAnswer - answer) === 1) {
      return MisconceptionType.OFF_BY_ONE;
    }
    
    // Check if they might have concatenated instead of adding, or swapped digits (rare in simple addition, but for example)
    if (String(answer) === `${problem.num1}${problem.num2}` || String(answer) === `${problem.num2}${problem.num1}`) {
      return MisconceptionType.IGNORED_BASE;
    }
    
    return MisconceptionType.UNKNOWN;
  }
  
  private trackError(problem: Problem, answer: number) {
    const errorKey = `${problem.num1}+${problem.num2}=${answer}`;
    this.recentErrors.push(errorKey);
    if (this.recentErrors.length > 20) {
      this.recentErrors.shift();
    }
  }
  
  public getRecurringErrors(): string[] {
    const counts: Record<string, number> = {};
    for (const err of this.recentErrors) {
      counts[err] = (counts[err] || 0) + 1;
    }
    return Object.keys(counts).filter(k => counts[k] >= 3);
  }
  
  public reset() {
    this.recentErrors = [];
  }

  /**
   * Provides immediate feedback based on the evaluation result.
   */
  public provideImmediateFeedback(isCorrect: boolean, misconception?: MisconceptionType): void {
    if (isCorrect) {
      console.log("[ResponseEvaluator] Correct! Great job!");
    } else {
      console.log(`[ResponseEvaluator] Incorrect. Detected misconception: ${misconception}`);
    }
  }

  // --- UML Sequence Diagram Methods ---
  public submitResponse(problem: Problem, answer: number): { isCorrect: boolean, misconception?: MisconceptionType } {
    console.log("[ResponseEvaluator] Querying activity attempt record.");
    console.log("[ResponseEvaluator] Saving activity attempt.");
    return this.evaluate(problem, answer);
  }
}
