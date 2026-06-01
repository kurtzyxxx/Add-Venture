export interface Problem {
  num1: number;
  num2: number;
  correctAnswer: number;
  isMissingPart?: boolean; // Used for Number Bonds
}

export abstract class ProblemGenerator {
  public abstract generateProblem(difficulty: number): Problem;
  public abstract generateProblemFromPair(addPair: number, operand: number): Problem;
}

export class CountAllGenerator extends ProblemGenerator {
  public generateProblem(difficulty: number): Problem {
    const addPair = Math.floor(difficulty);
    const other = Math.floor(Math.random() * 9) + 1; // 1 to 9
    return this.generateProblemFromPair(addPair, other);
  }

  public generateProblemFromPair(addPair: number, operand: number): Problem {
    const isFirstLarger = Math.random() > 0.5;
    return {
      num1: isFirstLarger ? addPair : operand,
      num2: isFirstLarger ? operand : addPair,
      correctAnswer: addPair + operand
    };
  }
}

export class CountOnGenerator extends ProblemGenerator {
  public generateProblem(difficulty: number): Problem {
    const addPair = Math.floor(difficulty);
    const other = Math.floor(Math.random() * 9) + 1; // 1 to 9
    return this.generateProblemFromPair(addPair, other);
  }

  public generateProblemFromPair(addPair: number, operand: number): Problem {
    const isFirstLarger = Math.random() > 0.5;
    return {
      num1: isFirstLarger ? addPair : operand,
      num2: isFirstLarger ? operand : addPair,
      correctAnswer: addPair + operand
    };
  }
}

export class NumberBondsGenerator extends ProblemGenerator {
  public generateProblem(difficulty: number): Problem {
    const addPair = Math.floor(difficulty);
    const other = Math.floor(Math.random() * 9) + 1; // 1 to 9
    return this.generateProblemFromPair(addPair, other);
  }

  public generateProblemFromPair(addPair: number, operand: number): Problem {
    const total = addPair + operand;
    return {
      num1: total, 
      num2: addPair, 
      correctAnswer: operand,
      isMissingPart: true
    };
  }
}
