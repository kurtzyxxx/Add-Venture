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
    const maxVal = Math.min(10, difficulty * 3 + 2);
    const minVal = 1;
    
    let n1 = Math.floor(Math.random() * maxVal) + minVal;
    let n2 = Math.floor(Math.random() * maxVal) + minVal;

    // Keep totals within 20 for simple counting
    while(n1 + n2 > 20) {
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
    const maxBase = Math.min(20, difficulty * 5 + 5);
    const n1 = Math.floor(Math.random() * maxBase) + 5; // The base number to count on from
    const n2 = Math.floor(Math.random() * Math.min(5, difficulty + 1)) + 1; // Small number to count on

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
    const maxTotal = Math.min(20, difficulty * 4 + 4);
    const total = Math.floor(Math.random() * maxTotal) + 2; // At least 2
    
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
