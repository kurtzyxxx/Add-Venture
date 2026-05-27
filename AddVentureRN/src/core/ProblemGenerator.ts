export interface Problem {
  num1: number;
  num2: number;
  correctAnswer: number;
  isMissingPart?: boolean; // Used for Number Bonds
}

export abstract class ProblemGenerator {
  public abstract generateProblem(difficulty: number): Problem;
}

export class CountAllGenerator extends ProblemGenerator {
  public generateProblem(difficulty: number): Problem {
    const maxVal = Math.min(9, difficulty * 3 + 2); // Cap at 9
    const minVal = 1;
    
    let n1 = Math.floor(Math.random() * maxVal) + minVal;
    let n2 = Math.floor(Math.random() * maxVal) + minVal;

    // Keep totals within 18 for single digits (9+9)
    while(n1 + n2 > 18) {
      n1 = Math.max(1, Math.floor(n1 / 2));
      n2 = Math.max(1, Math.floor(n2 / 2));
    }

    return {
      num1: n1,
      num2: n2,
      correctAnswer: n1 + n2
    };
  }
}

export class CountOnGenerator extends ProblemGenerator {
  public generateProblem(difficulty: number): Problem {
    // Count on usually has one larger number and a small number to count on from.
    // Cap base at 9 for single digits
    const maxBase = Math.min(9, difficulty * 2 + 5);
    const n1 = Math.floor(Math.random() * (maxBase - 4)) + 5; // Base number (5 to 9)
    const n2 = Math.floor(Math.random() * Math.min(4, difficulty + 1)) + 1; // Small number (1 to 4)

    // Usually order doesn't matter, but sometimes we want the larger first
    const isFirstLarger = Math.random() > 0.5;

    return {
      num1: isFirstLarger ? n1 : n2,
      num2: isFirstLarger ? n2 : n1,
      correctAnswer: n1 + n2
    };
  }
}

export class NumberBondsGenerator extends ProblemGenerator {
  public generateProblem(difficulty: number): Problem {
    // Single digits bond: total cannot exceed 9
    const maxTotal = Math.min(9, difficulty * 3 + 4);
    const total = Math.floor(Math.random() * (maxTotal - 1)) + 2; // At least 2, max 9
    
    const knownPart = Math.floor(Math.random() * (total - 1)) + 1;
    const missingPart = total - knownPart;

    return {
      num1: total, // Usually num1 is used as total in bonds
      num2: knownPart, // The known part
      correctAnswer: missingPart,
      isMissingPart: true
    };
  }
}
