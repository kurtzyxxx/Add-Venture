import { Problem } from './ProblemGenerator';

export interface HintContext {
  fruitEmoji?: string;
  selectedAnswer?: number | null;
  // Count All
  droppedCount?: number;
  totalToDrop?: number;
  // Count On
  baseN?: number;
  extraM?: number;
  extraDropped?: number;
  // Number Bonds
  whole?: number;
  knownPart?: number;
  missingPart?: number;
  currentPart?: number;
}

const FRUIT_NAMES: Record<string, { singular: string; plural: string }> = {
  '🍎': { singular: 'apple', plural: 'apples' },
  '🍏': { singular: 'green apple', plural: 'green apples' },
  '🍊': { singular: 'orange', plural: 'oranges' },
  '🍋': { singular: 'lemon', plural: 'lemons' },
  '🍌': { singular: 'banana', plural: 'bananas' },
  '🍉': { singular: 'watermelon', plural: 'watermelons' },
  '🍇': { singular: 'grape', plural: 'grapes' },
  '🍓': { singular: 'strawberry', plural: 'strawberries' },
  '🍒': { singular: 'cherry', plural: 'cherries' },
  '🍑': { singular: 'peach', plural: 'peaches' },
  '🥭': { singular: 'mango', plural: 'mangoes' },
  '🍍': { singular: 'pineapple', plural: 'pineapples' },
  '🥥': { singular: 'coconut', plural: 'coconuts' },
  '🥝': { singular: 'kiwi', plural: 'kiwis' },
  '🍐': { singular: 'pear', plural: 'pears' },
};

function getFruitLabel(emoji?: string, count: number = 2): string {
  if (!emoji) return count === 1 ? 'fruit' : 'fruits';
  const entry = FRUIT_NAMES[emoji];
  if (!entry) return count === 1 ? 'fruit' : 'fruits';
  return count === 1 ? entry.singular : entry.plural;
}

export class HintManager {
  public getHint(strategy: string, problem: Problem, context?: HintContext): string {
    switch (strategy) {
      case 'COUNT_ALL':
        return this.getCountAllHint(problem, context);
      case 'COUNT_ON':
        return this.getCountOnHint(problem, context);
      case 'NUMBER_BONDS':
        return this.getNumberBondsHint(problem, context);
      default:
        return 'Take your time and count step by step!';
    }
  }

  // ── Count All State-Aware Hints ──────────────────────────────────────────
  private getCountAllHint(problem: Problem, context?: HintContext): string {
    const total = problem.correctAnswer || (problem.num1 + problem.num2);
    const fruitWord = getFruitLabel(context?.fruitEmoji, total);

    if (!context) {
      return `Count all ${problem.num1} from the first group and ${problem.num2} from the second group to find the total of ${total} ${fruitWord}!`;
    }

    const { droppedCount = 0, selectedAnswer = null } = context;

    // State 1: Nothing in the basket yet
    if (droppedCount === 0) {
      return `Let's count all the ${fruitWord}! Drag the ${problem.num1} from the first group and ${problem.num2} from the second group into the basket.`;
    }

    // State 2: Some fruits in basket, but still some left outside
    if (droppedCount < total) {
      const remaining = total - droppedCount;
      const remWord = getFruitLabel(context.fruitEmoji, remaining);
      return `You have ${droppedCount} in the basket. There ${remaining === 1 ? 'is' : 'are'} still ${remaining} ${remWord} left! Drag all of them into the basket.`;
    }

    // State 3: All fruits in basket, no answer selected yet
    if (selectedAnswer === null) {
      return `All ${total} ${fruitWord} are in the basket! Tap them to count, then choose ${total} below!`;
    }

    // State 4: Answer selected
    if (selectedAnswer === total) {
      return `You chose ${total}, which matches all the ${fruitWord} in the basket! Tap the green Check button to submit!`;
    } else {
      return `You chose ${selectedAnswer}, but counting all the ${fruitWord} gives ${total}. Try picking ${total}!`;
    }
  }

  // ── Count On State-Aware Hints ───────────────────────────────────────────
  private getCountOnHint(problem: Problem, context?: HintContext): string {
    const baseN = context?.baseN ?? problem.num1;
    const extraM = context?.extraM ?? problem.num2;
    const total = problem.correctAnswer || (baseN + extraM);
    const fruitWord = getFruitLabel(context?.fruitEmoji, total);

    if (!context) {
      return `Start with ${baseN} ${fruitWord} in the basket, then count on ${extraM} more: ${baseN + 1}... to reach ${total}!`;
    }

    const { extraDropped = 0, selectedAnswer = null } = context;

    // State 1: Haven't started counting on yet
    if (extraDropped === 0) {
      return `Start with the ${baseN} ${fruitWord} in the basket! Keep ${baseN} in your head, then count on from the branches: say '${baseN + 1}'!`;
    }

    // State 2: In the middle of counting on
    if (extraDropped < extraM) {
      const currentCount = baseN + extraDropped;
      const left = extraM - extraDropped;
      const leftWord = getFruitLabel(context.fruitEmoji, left);
      return `You've counted up to ${currentCount}! Keep counting on: add ${left} more ${leftWord} to reach ${total}!`;
    }

    // State 3: Counted all extra fruits, no answer selected
    if (selectedAnswer === null) {
      return `You counted on to ${total} ${fruitWord}! Choose the number ${total} in the choices below!`;
    }

    // State 4: Answer selected
    if (selectedAnswer === total) {
      return `You chose ${total}! That matches ${baseN} plus ${extraM}. Tap Check to confirm!`;
    } else {
      return `You picked ${selectedAnswer}, but counting on from ${baseN} gives ${total}. Select ${total} and tap Check!`;
    }
  }

  // ── Number Bonds State-Aware Hints ───────────────────────────────────────
  private getNumberBondsHint(problem: Problem, context?: HintContext): string {
    const whole = context?.whole ?? problem.num1;
    const knownPart = context?.knownPart ?? problem.num2;
    const missingPart = context?.missingPart ?? (problem.correctAnswer || (whole - knownPart));
    const fruitWord = getFruitLabel(context?.fruitEmoji, whole);

    if (!context) {
      return `The whole is ${whole} ${fruitWord} and one part is ${knownPart}. Count on from ${knownPart} to ${whole} to find the missing part!`;
    }

    const currentPart = context.currentPart ?? context.droppedCount ?? 0;

    // State 1: Nothing in the right basket yet
    if (currentPart === 0) {
      const missWord = getFruitLabel(context.fruitEmoji, missingPart);
      return `The trunk total is ${whole} ${fruitWord}, and the left basket has ${knownPart}. Count on from ${knownPart}: drag ${missingPart} more ${missWord} into the right basket!`;
    }

    // State 2: Too few fruits in right basket
    if (currentPart < missingPart) {
      const sum = knownPart + currentPart;
      const needed = missingPart - currentPart;
      const needWord = getFruitLabel(context.fruitEmoji, needed);
      return `You have ${knownPart} on the left and ${currentPart} on the right (${sum} in all). You need ${needed} more ${needWord} to reach the total of ${whole}!`;
    }

    // State 3: Too many fruits in right basket
    if (currentPart > missingPart) {
      const sum = knownPart + currentPart;
      const extra = currentPart - missingPart;
      const extraWord = getFruitLabel(context.fruitEmoji, extra);
      return `Oops! ${knownPart} plus ${currentPart} makes ${sum}, but the total on the trunk is only ${whole}! Long-press ${extra} ${extraWord} to remove ${extra === 1 ? 'it' : 'them'}.`;
    }

    // State 4: Exactly matches missingPart!
    return `Awesome! ${knownPart} and ${missingPart} make ${whole} ${fruitWord}! Tap the Check button below to verify your answer!`;
  }
}
