import { Problem } from './ProblemGenerator';

export class HintManager {
  private countAllHints = [
    "Try dragging each item into the basket and counting out loud.",
    "Count the first group, then continue counting the second group.",
    "Make sure you've dragged all the fruits before you find the answer!"
  ];

  private countOnHints = [
    "Start with the bigger number and count on from there.",
    "Put the bigger number in your head, then use your fingers for the smaller one.",
    "For example, if it's 5 + 3, say 'Five', then count 'Six, Seven, Eight'."
  ];

  private numberBondsHints = [
    "A number bond has two parts that make a whole.",
    "You know the whole and one part. What do you need to add to the part to get the whole?",
    "Try subtracting the known part from the whole to find the missing part."
  ];

  public getHint(strategy: string, problem: Problem): string {
    // We could provide specific hints based on the exact problem values
    let pool: string[];
    switch(strategy) {
      case 'COUNT_ALL': pool = this.countAllHints; break;
      case 'COUNT_ON': pool = this.countOnHints; break;
      case 'NUMBER_BONDS': pool = this.numberBondsHints; break;
      default: pool = ["Take your time and try again!"];
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }
}
