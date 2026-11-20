import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Dimensions, Animated, PanResponder, Vibration,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { HintConfirmModal } from '../../components/HintConfirmModal';
import { HintBox } from '../../components/HintBox';
import { PulseView } from '../../components/animations/PulseView';
import { TimerBar } from '../../components/TimerBar';
import { AudioManager } from '../../core/AudioManager';
import { FiveStreakModal } from '../../components/FiveStreakModal';
import { IncorrectModal } from '../../components/IncorrectModal';
import { OliverSpeechBalloon } from '../../components/OliverSpeechBalloon';
import { DemonstrationBanner } from '../../components/tutorial/DemonstrationBanner';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'NumberBonds'>;

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];
const HINT_DISABLE_THRESHOLD = 5;
const MAX_WRONG_TRIES = 4;

interface TreeFruit {
  id: string;
  emoji: string;
  dropped: boolean;
}

const getBasketDimensions = (count: number) => {
  if (count >= 8) {
    return { width: 132, height: 164, emojiSize: 18, clusterMaxWidth: 110 };
  }
  if (count >= 6) {
    return { width: 126, height: 156, emojiSize: 20, clusterMaxWidth: 104 };
  }
  return { width: 120, height: 148, emojiSize: 22, clusterMaxWidth: 98 };
};

export default function NumberBondsScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedFruitId, setSelectedFruitId] = useState<string | null>(null);
  const [treeFruits, setTreeFruits] = useState<TreeFruit[]>([]);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(() => GameManager.getInstance().getSessionHintsRemaining());
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);

  // In-UI automated demonstration states & refs
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const isDemonstratingRef = useRef(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [highlightedFruitId, setHighlightedFruitId] = useState<string | null>(null);
  const [animatingFruitId, setAnimatingFruitId] = useState<string | null>(null);
  const [isTotalBadgeHighlighted, setIsTotalBadgeHighlighted] = useState(false);
  const [isLeftBasketHighlighted, setIsLeftBasketHighlighted] = useState(false);
  const [isRightBasketHighlighted, setIsRightBasketHighlighted] = useState(false);
  const [isCheckHighlighted, setIsCheckHighlighted] = useState(false);
  const [demoCountingIndex, setDemoCountingIndex] = useState<number | null>(null);
  const [demoMaxCountedIndex, setDemoMaxCountedIndex] = useState<number | null>(null);
  const [remediationCycle, setRemediationCycle] = useState(0);

  // User interactive fruit counting states
  const [userCountedIndices, setUserCountedIndices] = useState<Set<number>>(new Set());
  const [userActiveCountIndex, setUserActiveCountIndex] = useState<number | null>(null);
  const [countedFruits, setCountedFruits] = useState<Record<string, number>>({});

  // Fruit tap & glow animation tracking
  const fruitTapAnims = useRef<Record<string, Animated.Value>>({});
  const fruitGlowAnims = useRef<Record<string, Animated.Value>>({});

  const getFruitAnims = (id: string) => {
    if (!fruitTapAnims.current[id]) {
      fruitTapAnims.current[id] = new Animated.Value(1);
    }
    if (!fruitGlowAnims.current[id]) {
      fruitGlowAnims.current[id] = new Animated.Value(0);
    }
    return {
      tapAnim: fruitTapAnims.current[id],
      glowAnim: fruitGlowAnims.current[id],
    };
  };

  // Synchronized problem dictation
  const [highlightPhase, setHighlightPhase] = useState<'idle' | 'partA' | 'partB' | 'total'>('idle');
  const readingTokenRef = useRef(0);
  const currentProblemRef = useRef<Problem | null>(null);

  // In-game tutorial walkthrough mode
  const [isTutorialMode, setIsTutorialMode] = useState(true);
  const isTutorialModeRef = useRef(true);
  const [tutorialMessage, setTutorialMessage] = useState('');
  const [tutorialFinished, setTutorialFinished] = useState(false);
  const [roundKey, setRoundKey] = useState(0);

  const isDemoCancelled = useRef(false);

  // Layout measurement refs for exact coordinate targeting
  const contentYRef = useRef(0);
  const treeSectionLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const canopyLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const trunkLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const checkBtnLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [currentTry, setCurrentTry] = useState(1);
  const [activityCount, setActivityCount] = useState(0);
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  const [justMastered, setJustMastered] = useState(false);
  const [showFiveStreak, setShowFiveStreak] = useState(false);
  // Incorrect / Error feedback modal
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [lastWrongAnswer, setLastWrongAnswer] = useState<number | null>(null);

  // Pulse animation for the right basket drop zone when empty
  const basketPulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHintAction = useRef<(() => void) | null>(null);

  const waitMs = (ms: number) => new Promise(res => setTimeout(res, ms));

  const stopReadingAloud = () => {
    readingTokenRef.current++;
    AudioManager.stopSpeech();
    setHighlightPhase('idle');
  };

  const readProblemAloud = async (targetProblem: Problem | null = null) => {
    const p = targetProblem ?? currentProblemRef.current ?? problem;
    if (!p || isDemonstratingRef.current || isTutorialModeRef.current) return;

    const token = ++readingTokenRef.current;
    AudioManager.stopSpeech();

    const partA = p.num2;
    const total = p.num1;
    const partAFruitWord = partA === 1 ? 'fruit' : 'fruits';

    try {
      // Phase 1: Highlight Left Basket (Part A)
      setHighlightPhase('partA');
      await AudioManager.speakAsync(`The left basket has ${partA} ${partAFruitWord},`, {
        rate: 0.78,
        pitch: 1.25,
      });
      if (readingTokenRef.current !== token) return;

      await waitMs(200);
      if (readingTokenRef.current !== token) return;

      // Phase 2: Highlight Right Basket (?)
      setHighlightPhase('partB');
      await AudioManager.speakAsync(`what number goes with ${partA} to make ${total}?`, {
        rate: 0.78,
        pitch: 1.25,
      });
      if (readingTokenRef.current !== token) return;

      await waitMs(200);
      if (readingTokenRef.current !== token) return;

      // Phase 3: Highlight Total on the tree trunk
      setHighlightPhase('total');
      await AudioManager.speakAsync(`Find the missing part to make a total of ${total}!`, {
        rate: 0.78,
        pitch: 1.3,
      });
      if (readingTokenRef.current !== token) return;

      await waitMs(350);
      if (readingTokenRef.current !== token) return;
    } finally {
      if (readingTokenRef.current === token) {
        setHighlightPhase('idle');
      }
    }
  };

  const skipOrEndTutorial = async () => {
    isDemoCancelled.current = true;
    readingTokenRef.current++;
    AudioManager.stopSpeech();

    isTutorialModeRef.current = false;
    isDemonstratingRef.current = false;
    setIsTutorialMode(false);
    setTutorialFinished(false);
    setIsDemonstrating(false);
    setSelectedFruitId(null);
    setCountedFruits({});
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setIsTotalBadgeHighlighted(false);
    setIsLeftBasketHighlighted(false);
    setIsRightBasketHighlighted(false);
    setIsCheckHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setHighlightPhase('idle');

    const gm = GameManager.getInstance();
    setTimeLeft(gm.sessionTimerLimit);
    loadNewProblem(false);
  };

  const startTutorialWalkthrough = async () => {
    isTutorialModeRef.current = true;
    isDemonstratingRef.current = true;
    setIsTutorialMode(true);
    setTutorialFinished(false);
    setIsDemonstrating(true);
    isDemoCancelled.current = false;
    stopReadingAloud();

    const tutProblem: Problem = {
      num1: 5,
      num2: 3,
      correctAnswer: 2,
    };
    currentProblemRef.current = tutProblem;
    setProblem(tutProblem);
    setIsMasteryProblem(false);
    setActivityCount(0);
    setHintsDisabled(true);
    setRoundKey(k => k + 1);

    const fruitEmoji = '🍎';
    const tutFruits: TreeFruit[] = Array.from({ length: 10 }, (_, i) => ({
      id: `nb_fruit_${i}`,
      emoji: fruitEmoji,
      dropped: false,
    }));
    setTreeFruits(tutFruits);
    setSelectedFruitId(null);
    setCountedFruits({});
    setSelectedOption(null);
    setActiveHint(null);
    setCurrentTry(1);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setIsTotalBadgeHighlighted(false);
    setIsLeftBasketHighlighted(false);
    setIsRightBasketHighlighted(false);
    setIsCheckHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});

    setTutorialMessage('Welcome to Number Bonds! Watch Oliver show you how to play.');
    await AudioManager.speakAsync('Welcome to Number Bonds! Watch Oliver show you how to play.', {
      rate: 0.78,
      pitch: 1.25,
    });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Dictate equation with highlights (Left Basket, Right Basket, Total Badge)
    setTutorialMessage('The tree total is 5, and the left basket has 3.');
    setHighlightPhase('partA');
    setIsLeftBasketHighlighted(true);
    await AudioManager.speakAsync('The left basket has 3 fruits,', { rate: 0.78, pitch: 1.25 });
    if (isDemoCancelled.current) return;
    await waitMs(200);

    setHighlightPhase('partB');
    setIsLeftBasketHighlighted(false);
    setIsRightBasketHighlighted(true);
    await AudioManager.speakAsync('what number goes with 3 to make 5?', { rate: 0.78, pitch: 1.25 });
    if (isDemoCancelled.current) return;
    await waitMs(200);

    setHighlightPhase('total');
    setIsRightBasketHighlighted(false);
    setIsTotalBadgeHighlighted(true);
    await AudioManager.speakAsync('The total on the tree trunk is 5!', { rate: 0.78, pitch: 1.3 });
    if (isDemoCancelled.current) return;
    await waitMs(350);

    setHighlightPhase('idle');
    setIsTotalBadgeHighlighted(false);

    // Drag fruits to right basket
    setTutorialMessage('Let’s drag 2 fruits into the right basket to make 5!');
    await AudioManager.speakAsync('Let’s drag fruits from the branches into the right basket to make 5!', { rate: 0.78, pitch: 1.25 });
    await waitMs(300);
    if (isDemoCancelled.current) return;

    // Drag Fruit 1 (id: nb_fruit_0)
    setTutorialMessage('Fruit 1: Drag to right basket! (3 + 1 = 4)');
    setHighlightedFruitId('nb_fruit_0');
    setAnimatingFruitId('nb_fruit_0');
    await waitMs(480);
    if (isDemoCancelled.current) return;

    setTreeFruits(prev => prev.map(f => f.id === 'nb_fruit_0' ? { ...f, dropped: true } : f));
    setSelectedOption(1);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    await AudioManager.speakAsync('One! 3 plus 1 is 4.', { rate: 0.78, pitch: 1.3 });
    await waitMs(250);
    if (isDemoCancelled.current) return;

    // Drag Fruit 2 (id: nb_fruit_1)
    setTutorialMessage('Fruit 2: Drag to right basket! (3 + 2 = 5)');
    setHighlightedFruitId('nb_fruit_1');
    setAnimatingFruitId('nb_fruit_1');
    await waitMs(480);
    if (isDemoCancelled.current) return;

    setTreeFruits(prev => prev.map(f => f.id === 'nb_fruit_1' ? { ...f, dropped: true } : f));
    setSelectedOption(2);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    await AudioManager.speakAsync('Two! 3 plus 2 is 5!', { rate: 0.78, pitch: 1.3 });
    await waitMs(300);
    if (isDemoCancelled.current) return;

    // Double-check count across both baskets
    setTutorialMessage("Let's count both baskets together!");
    await AudioManager.speakAsync("Let's count all the fruits to double-check!", { rate: 0.78, pitch: 1.25 });
    await waitMs(250);
    if (isDemoCancelled.current) return;

    // Count Left basket (1, 2, 3)
    setIsLeftBasketHighlighted(true);
    for (let i = 0; i < 3; i++) {
      if (isDemoCancelled.current) return;
      const countNum = i + 1;
      setDemoCountingIndex(i);
      setDemoMaxCountedIndex(i);
      setTutorialMessage(`Left basket: Fruit #${countNum}!`);
      await AudioManager.speakAsync(`${countNum}`, { rate: 0.78, pitch: 1.35 });
      await waitMs(250);
    }
    setIsLeftBasketHighlighted(false);

    // Count Right basket (4, 5)
    setIsRightBasketHighlighted(true);
    for (let i = 0; i < 2; i++) {
      if (isDemoCancelled.current) return;
      const countNum = 3 + i + 1;
      const globalIdx = 3 + i;
      setDemoCountingIndex(globalIdx);
      setDemoMaxCountedIndex(globalIdx);
      setTutorialMessage(`Right basket: Fruit #${countNum}!`);
      await AudioManager.speakAsync(`${countNum}`, { rate: 0.78, pitch: 1.35 });
      await waitMs(250);
    }
    setIsRightBasketHighlighted(false);
    setDemoCountingIndex(null);

    // Recap equation
    setTutorialMessage('3 + 2 = 5! A total of 5!');
    await AudioManager.speakAsync('Double-checked! 3 plus 2 equals 5 in all!', { rate: 0.78, pitch: 1.3 });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Tap Check button
    setTutorialMessage('Then tap Check to finish!');
    setIsCheckHighlighted(true);
    await AudioManager.speakAsync('Then tap Check!', { rate: 0.78, pitch: 1.3 });
    await waitMs(450);
    if (isDemoCancelled.current) return;

    // Completion
    setIsCheckHighlighted(false);
    setTutorialMessage("Awesome! You're ready to play! 🚀");
    await AudioManager.speakAsync("Hooray! That's how Number Bonds work! Now you're ready to play!", {
      rate: 0.78,
      pitch: 1.3,
    });
    if (isDemoCancelled.current) return;
    setTutorialFinished(true);
  };

  useEffect(() => {
    if (isTutorialMode) {
      startTutorialWalkthrough();
    } else {
      loadNewProblem(false);
    }
    return () => {
      isDemoCancelled.current = true;
      stopReadingAloud();
    };
  }, [navigation]);

  const handleOpenTutorial = () => {
    stopReadingAloud();
    startTutorialWalkthrough();
  };

  // Timer only runs during active gameplay
  useEffect(() => {
    if (isTutorialMode || isDemonstrating || showGreatJob || showFiveStreak || showIncorrectModal || !problem) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTutorialMode, isDemonstrating, showGreatJob, showFiveStreak, showIncorrectModal, problem]);

  useEffect(() => {
    if (timeLeft === 0 && !isTutorialMode && !isDemonstrating && !showGreatJob && !showFiveStreak && !showIncorrectModal && problem && selectedOption === null) {
      handleTimeUp();
    }
  }, [timeLeft, isTutorialMode, isDemonstrating, showGreatJob, showFiveStreak, showIncorrectModal, problem, selectedOption]);

  // Pulse right basket when awaiting answers
  useEffect(() => {
    if (selectedOption === null && !isTutorialMode && !isDemonstrating) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(basketPulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(basketPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      basketPulse.setValue(1);
    }
  }, [selectedOption, isTutorialMode, isDemonstrating]);

  const handleTimeUp = async () => {
    if (!problem || isDemonstrating || showIncorrectModal) return;
    const gm = GameManager.getInstance();
    const responseTimeMs = gm.sessionTimerLimit * 1000;
    await gm.submitAnswer(false, currentTry, responseTimeMs, problem, -1, false);

    if (isMasteryProblem) {
      gm.recordMasteryIncorrect(problem);
    } else {
      gm.addToMasteryQueue(problem);
    }
    setLastWrongAnswer(null);
    setIsTimeoutError(true);
    setShowIncorrectModal(true);
  };

  const loadNewProblem = (silent = false) => {
    stopReadingAloud();
    const gm = GameManager.getInstance();
    let p: Problem;
    let isMastery = false;

    if (gm.hasMasteryItems()) {
      const mp = gm.getNextMasteryProblem();
      if (mp) { p = mp; isMastery = true; }
      else p = gm.generateProblem();
    } else {
      p = gm.generateProblem();
    }

    currentProblemRef.current = p;
    setIsMasteryProblem(isMastery);
    setProblem(p);
    setSelectedOption(null);
    setSelectedFruitId(null);
    setCountedFruits({});
    setActiveHint(null);
    setCurrentTry(1);
    setRemediationCycle(0);
    setTimeLeft(gm.sessionTimerLimit);
    setJustMastered(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setRoundKey(k => k + 1);

    const pCount = gm.getSessionActivityCount();
    setActivityCount(pCount);

    const profile = gm.saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD);

    // Generate 10 fruits hanging on the tree branches
    const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const newTreeFruits: TreeFruit[] = Array.from({ length: 10 }, (_, i) => ({
      id: `nb_fruit_${i}`,
      emoji,
      dropped: false,
    }));
    setTreeFruits(newTreeFruits);

    if (!silent) {
      setTimeout(() => {
        if (isMastery) {
          AudioManager.speak('Keep going! Practice makes perfect.', { rate: 0.78, pitch: 1.3 });
          setTimeout(() => readProblemAloud(p), 1800);
        } else {
          readProblemAloud(p);
        }
      }, 350);
    }
  };

  // Tap-to-select fruit from canopy (Hybrid interaction FR-NB-02)
  const handleSelectFruit = (fruitId: string) => {
    stopReadingAloud();
    if (isDemonstrating) return;
    try {
      Vibration.vibrate(30);
    } catch (_) {}

    if (selectedFruitId === fruitId) {
      setSelectedFruitId(null);
    } else {
      setSelectedFruitId(fruitId);
      AudioManager.stopSpeech();
      AudioManager.speak('Fruit selected! Tap the right basket to place it!', {
        rate: 0.95,
        pitch: 1.3,
      });
    }
  };

  // Tap-to-target placement into right basket (Hybrid interaction FR-NB-02)
  const handleRightBasketPress = () => {
    stopReadingAloud();
    if (isDemonstrating) return;
    if (selectedFruitId) {
      handleDropFruit(selectedFruitId);
    } else {
      // Direct tap helper: docks next available fruit from canopy
      const nextAvailable = treeFruits.find(f => !f.dropped);
      if (nextAvailable) {
        handleDropFruit(nextAvailable.id);
      }
    }
  };

  // Drag or Tap fruit from canopy into right basket with magnetic snap feedback
  const handleDropFruit = (fruitId: string) => {
    stopReadingAloud();
    try {
      Vibration.vibrate(40);
    } catch (_) {}
    setSelectedFruitId(null);
    setCountedFruits({});

    // Dynamic expand bounce feedback on the basket
    Animated.sequence([
      Animated.timing(basketPulse, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(basketPulse, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    setTreeFruits(prev => {
      const next = prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f));
      const droppedCount = next.filter(f => f.dropped).length;
      setSelectedOption(droppedCount);

      const profile = GameManager.getInstance().saveSystem.getProfile();
      if (profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD) {
        // Counting clue on drag starts from the next number of the left basket!
        const currentTotal = problem ? problem.num2 + droppedCount : droppedCount;
        AudioManager.stopSpeech();
        AudioManager.speak(`${currentTotal}`, { rate: 0.95, pitch: 1.3 });
      }
      return next;
    });
  };

  // Unified tap-to-count for any fruit in Left Basket or Right Basket (arbitrary order)
  const handleBasketFruitTap = (fruitId: string) => {
    if (isDemonstrating || !problem) return;
    stopReadingAloud();
    try {
      Vibration.vibrate(25);
    } catch (_) {}

    const profile = GameManager.getInstance().saveSystem.getProfile();
    const isFiveStreakActive = profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD;

    const totalFruitsInBaskets = problem.num2 + treeFruits.filter(f => f.dropped).length;
    const assignedCount = countedFruits[fruitId];
    let spokenNumber: number;

    if (assignedCount !== undefined) {
      spokenNumber = assignedCount;
    } else {
      const nextCount = Object.keys(countedFruits).length + 1;
      spokenNumber = nextCount;
      setCountedFruits(prev => ({
        ...prev,
        [fruitId]: nextCount,
      }));

      // When all fruits across both baskets are counted
      if (!isFiveStreakActive && nextCount === totalFruitsInBaskets) {
        setTimeout(() => {
          AudioManager.speak(`That's ${totalFruitsInBaskets} fruits in all!`, {
            rate: 0.92,
            pitch: 1.35,
          });
        }, 750);
      }
    }

    if (!isFiveStreakActive) {
      AudioManager.stopSpeech();
      AudioManager.speak(`${spokenNumber}`, { rate: 0.95, pitch: 1.35 });
    }

    const { tapAnim, glowAnim } = getFruitAnims(fruitId);
    Animated.sequence([
      Animated.spring(tapAnim, { toValue: 1.35, friction: 3, useNativeDriver: true }),
      Animated.spring(tapAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // User tap-to-count fruit in Left Basket
  const handleTapLeftFruit = (index: number) => {
    handleBasketFruitTap(`left_${index}`);
  };

  // User tap-to-count fruit in Right Basket
  const handleTapRightFruit = (fruitId: string) => {
    handleBasketFruitTap(fruitId);
  };

  // Tap fruit in right basket to return to tree (or long-press)
  const handleRemoveFruit = (fruitId: string) => {
    stopReadingAloud();
    try {
      Vibration.vibrate(25);
    } catch (_) {}
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setTreeFruits(prev => {
      const next = prev.map(f => (f.id === fruitId ? { ...f, dropped: false } : f));
      const droppedCount = next.filter(f => f.dropped).length;
      setSelectedOption(droppedCount > 0 ? droppedCount : null);

      const profile = GameManager.getInstance().saveSystem.getProfile();
      if (profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD && droppedCount > 0 && problem) {
        const currentTotal = problem.num2 + droppedCount;
        AudioManager.stopSpeech();
        AudioManager.speak(`${currentTotal}`, { rate: 0.95, pitch: 1.3 });
      }
      return next;
    });
  };

  // Reset right basket
  const handleResetRightBasket = () => {
    stopReadingAloud();
    try {
      Vibration.vibrate(25);
    } catch (_) {}
    setSelectedFruitId(null);
    setCountedFruits({});
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setRoundKey(k => k + 1);
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);
    AudioManager.stopSpeech();
    AudioManager.speak('Basket cleared.', { rate: 0.95, pitch: 1.25 });
  };

  // Reset all tree fruits and player answer selection
  const resetFruitsAndAnswer = () => {
    stopReadingAloud();
    setSelectedFruitId(null);
    setCountedFruits({});
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setRoundKey(k => k + 1);
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
  };

  const submitCheck = async () => {
    stopReadingAloud();
    if (selectedOption === null || !problem) return;
    const gm = GameManager.getInstance();
    const isCorrect = selectedOption === problem.correctAnswer;
    const responseTimeMs = (gm.sessionTimerLimit - timeLeft) * 1000;
    const { starsEarned } = await gm.submitAnswer(
      isCorrect, currentTry, responseTimeMs, problem, selectedOption, isCorrect
    );

    if (isCorrect) {
      let wasMastered = false;
      if (isMasteryProblem) wasMastered = gm.recordMasteryCorrect(problem);
      const newCount = gm.getSessionActivityCount();
      setActivityCount(newCount);
      setGreatJobStars(starsEarned);
      setJustMastered(wasMastered);
      setShowGreatJob(true);
    } else {
      if (isMasteryProblem) gm.recordMasteryIncorrect(problem);
      setLastWrongAnswer(selectedOption);
      setIsTimeoutError(false);
      setShowIncorrectModal(true);
    }
  };

  const handleContinueAfterIncorrect = () => {
    setShowIncorrectModal(false);
    startAutomatedDemonstration(isTimeoutError);
  };

  const handleContinueAfterGreatJob = async () => {
    setShowGreatJob(false);
    const gm = GameManager.getInstance();
    const profile = gm.saveSystem.getProfile();
    if (profile.consecutiveCorrect === 5) {
      setShowFiveStreak(true);
      return;
    }
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) await finishSession();
    else loadNewProblem();
  };

  const handleCloseFiveStreak = async () => {
    setShowFiveStreak(false);
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) await finishSession();
    else loadNewProblem();
  };

  const startAutomatedDemonstration = async (isTimeout = false) => {
    stopReadingAloud();
    if (!problem) return;
    isDemonstratingRef.current = true;
    setIsDemonstrating(true);
    isDemoCancelled.current = false;
    setRemediationCycle(c => c + 1);

    // Reset dropped fruits so demonstration starts clean
    setSelectedFruitId(null);
    setCountedFruits({});
    setRoundKey(k => k + 1);
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setIsTotalBadgeHighlighted(false);
    setIsLeftBasketHighlighted(false);
    setIsCheckHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});

    const missingCount = problem.correctAnswer;

    // Step 1: Highlight Trunk Total Badge
    setDemoMessage(`Total on the tree is ${problem.num1}!`);
    setIsTotalBadgeHighlighted(true);

    await AudioManager.speakAsync(`Look at the tree! The total number is ${problem.num1}!`, {
      rate: 0.78,
      pitch: 1.25,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;
    setIsTotalBadgeHighlighted(false);

    // Step 2: Highlight Left Basket (fixed part)
    setDemoMessage(`Left basket has ${problem.num2}. How many more make ${problem.num1}?`);
    setIsLeftBasketHighlighted(true);

    await AudioManager.speakAsync(`The left basket already has ${problem.num2}. How many more do we need to make ${problem.num1}?`, {
      rate: 0.78,
      pitch: 1.3,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;
    setIsLeftBasketHighlighted(false);

    // Step 3: Drag missing fruits from canopy to right basket with highlight & glide animation
    for (let i = 0; i < missingCount; i++) {
      if (isDemoCancelled.current) return;
      const count = i + 1;
      const currentSum = problem.num2 + count;
      const fruitId = `nb_fruit_${i}`;

      setDemoMessage(`Drag fruit to right basket: ${count} (${problem.num2} + ${count} = ${currentSum})`);
      setHighlightedFruitId(fruitId);
      setAnimatingFruitId(fruitId);

      // Slide-down animation into right basket
      await waitMs(480);
      if (isDemoCancelled.current) return;

      // Transfer into right basket
      setTreeFruits(prev => prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f)));
      setSelectedOption(count);
      setHighlightedFruitId(null);
      setAnimatingFruitId(null);

      await AudioManager.speakAsync(`${count}`, { rate: 0.78, pitch: 1.35 });
      await waitMs(250);
    }

    if (isDemoCancelled.current) return;

    // Step 4: Double-check all fruits across both baskets (Left basket + Right basket)
    setDemoMessage(`Let's count all the fruits to double-check!`);
    await AudioManager.speakAsync(`Now let's count all the fruits across both baskets to double-check our total!`, {
      rate: 0.92,
      pitch: 1.3,
    });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Count Left Basket fruits (1 up to problem.num2)
    setIsLeftBasketHighlighted(true);
    for (let i = 0; i < problem.num2; i++) {
      if (isDemoCancelled.current) return;
      const countNum = i + 1;
      setDemoCountingIndex(i);
      setDemoMaxCountedIndex(i);
      setDemoMessage(`Left Basket: Fruit #${countNum}!`);

      await AudioManager.speakAsync(`${countNum}`, { rate: 0.95, pitch: 1.35 });
      await waitMs(250);
    }
    setIsLeftBasketHighlighted(false);

    // Count Right Basket fruits (problem.num2 + 1 up to problem.num1)
    for (let i = 0; i < missingCount; i++) {
      if (isDemoCancelled.current) return;
      const countNum = problem.num2 + i + 1;
      const globalIdx = problem.num2 + i;
      setDemoCountingIndex(globalIdx);
      setDemoMaxCountedIndex(globalIdx);
      setDemoMessage(`Right Basket: Fruit #${countNum}!`);

      await AudioManager.speakAsync(`${countNum}`, { rate: 0.95, pitch: 1.35 });
      await waitMs(250);
    }

    if (isDemoCancelled.current) return;
    setDemoCountingIndex(null);

    // Step 5: Recap the bond
    setDemoMessage(`Double-checked! ${problem.num2} + ${problem.correctAnswer} = ${problem.num1}!`);
    await AudioManager.speakAsync(`Double-checked! ${problem.num2} plus ${problem.correctAnswer} equals ${problem.num1}! Both baskets make ${problem.num1} fruits in all!`, {
      rate: 0.92,
      pitch: 1.3,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Step 6: Highlight Check button
    setDemoMessage(`Tap Check to verify!`);
    setIsCheckHighlighted(true);

    await AudioManager.speakAsync(`Tap Check!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Step 7: Turn over to learner
    setDemoMessage(`🎯 Now it's your turn! Drag ${problem.correctAnswer} fruits to the right basket!`);
    await AudioManager.speakAsync(`Now it's your turn! Drag the fruits to make ${problem.num1}!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    endDemonstration();
  };

  const endDemonstration = () => {
    isDemoCancelled.current = true;
    isDemonstratingRef.current = false;
    setIsDemonstrating(false);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setIsTotalBadgeHighlighted(false);
    setIsLeftBasketHighlighted(false);
    setIsRightBasketHighlighted(false);
    setIsCheckHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setUserCountedIndices(new Set());
    setUserActiveCountIndex(null);
    setCountedFruits({});
    setCurrentTry(prev => prev + 1);

    // Clear right basket for the student
    setRoundKey(k => k + 1);
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);

    const gm = GameManager.getInstance();
    setTimeLeft(gm.sessionTimerLimit);
  };

  const useHint = () => {
    stopReadingAloud();
    if (!problem || hintsRemaining <= 0) return;
    const gm = GameManager.getInstance();
    const hint = gm.getHint(problem);
    setActiveHint(hint);
    gm.consumeSessionHint().then(setHintsRemaining);
  };

  const confirmUseHint = (beforeConfirm?: () => void) => {
    stopReadingAloud();
    if (!problem || hintsRemaining <= 0) return;
    pendingHintAction.current = beforeConfirm ?? null;
    setShowHintConfirm(true);
  };

  const handleConfirmHint = () => {
    setShowHintConfirm(false);
    pendingHintAction.current?.();
    pendingHintAction.current = null;
    useHint();
  };

  const handleCancelHint = () => {
    pendingHintAction.current = null;
    setShowHintConfirm(false);
  };

  const finishSession = async () => {
    const gm = GameManager.getInstance();
    const session = await gm.completeAndResetSession();
    navigation.replace('SessionSummary', {
      stars: session.totalStars,
      activities: session.totalActivities,
      correct: session.totalCorrect,
      strategy: 'NUMBER_BONDS',
      incorrectProblems: [],
    });
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const profile = GameManager.getInstance().saveSystem.getProfile();
  const masteryProgress = GameManager.getInstance().getMasteryProgress();
  const displayedActivityCount = Math.min(activityCount + 1, MAX_ACTIVITIES_PER_SESSION);

  const droppedFruits = treeFruits.filter(f => f.dropped);
  const droppedCount = droppedFruits.length;
  const showClues = profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD;
  const isFiveStreakActive = profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD;

  const leftDim = getBasketDimensions(problem.num2);
  const rightDim = getBasketDimensions(droppedCount);

  const sectionWidth = width - 24;
  const treeCenterX = sectionWidth / 2;

  return (
    <SafeAreaView style={[styles.container, isTutorialMode && styles.containerTutorial]}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      {/* Tutorial Banner */}
      {isTutorialMode && (
        <View style={styles.tutorialBanner}>
          <View style={styles.tutorialBannerLeft}>
            <Text style={styles.tutorialBannerIcon}>🎓</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tutorialBannerKicker}>TUTORIAL MODE</Text>
              <Text style={styles.tutorialBannerMessage} numberOfLines={2}>
                {tutorialMessage}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.tutorialSkipBtn} onPress={skipOrEndTutorial} activeOpacity={0.8}>
            <Text style={styles.tutorialSkipBtnText}>Skip ⏩</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Guided Remediation Banner (during normal game after mistake) */}
      {!isTutorialMode && isDemonstrating && (
        <DemonstrationBanner
          message={demoMessage}
          onSkip={endDemonstration}
          allowSkip={remediationCycle > 0 || currentTry > 1}
        />
      )}

      {/* Cloud Decors */}
      <Text style={[styles.cloud, { top: '8%', left: '-5%', fontSize: 80, opacity: 0.5 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '22%', right: '-8%', fontSize: 90, opacity: 0.5 }]}>☁️</Text>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton} activeOpacity={0.8}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          {isTutorialMode ? (
            <View style={styles.tutorialBadge}>
              <Text style={styles.tutorialBadgeText}>🌟 Practice Round</Text>
            </View>
          ) : (
            <>
              <TimerBar timeLeft={timeLeft} totalTime={GameManager.getInstance().sessionTimerLimit} />
              <Text style={styles.activityProgress}>{displayedActivityCount}/{MAX_ACTIVITIES_PER_SESSION}</Text>
            </>
          )}
        </View>

        <View style={styles.badgesContainer}>
          {!isTutorialMode && (
            <TouchableOpacity onPress={handleOpenTutorial} style={styles.helpCircleButton} activeOpacity={0.8}>
              <Text style={styles.helpIcon}>❓</Text>
            </TouchableOpacity>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ {isTutorialMode ? 'Practice' : profile.totalStars}</Text>
          </View>
        </View>
      </View>

      <View
        style={styles.content}
        onLayout={e => {
          contentYRef.current = e.nativeEvent.layout.y;
        }}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={styles.tryStarsRow}>
            {[1, 2, 3].map((t, i) => (
              <Text key={i} style={[styles.tryStar, { opacity: t >= currentTry ? 1 : 0.25 }]}>⭐</Text>
            ))}
          </View>
          <Text style={styles.title}>Number Bonds</Text>
          {!hintsDisabled && (
            <PulseView active={hintsRemaining > 0} maxScale={1.1} duration={800}>
              <TouchableOpacity
                style={[styles.smallHintBtn, { opacity: hintsRemaining <= 0 ? 0.5 : 1 }]}
                onPress={() => confirmUseHint()}
                disabled={hintsRemaining <= 0}
              >
                <Text style={styles.smallHintText}>💡 {hintsRemaining}</Text>
              </TouchableOpacity>
            </PulseView>
          )}
        </View>

        {isMasteryProblem && (
          <View style={styles.masteryBadge}>
            <Text style={styles.masteryBadgeText}>🔥 Keep Going! Practice Round</Text>
          </View>
        )}

        <View style={styles.hintBoxWrap}>
          <HintBox text={activeHint} onDismiss={() => setActiveHint(null)} />
        </View>

        {/* Instruction Card */}
        <View style={styles.instructionCard}>
          <View style={styles.owlPlaceholder}>
            <Text style={{ fontSize: 32 }}>🦉</Text>
            <OliverSpeechBalloon
              active={
                !isTutorialMode &&
                !isDemonstrating &&
                !showGreatJob &&
                !showFiveStreak &&
                !showHintConfirm &&
                problem !== null &&
                selectedOption === null
              }
            />
          </View>
          <Text style={styles.instructionText}>
            What number goes with {problem.num2} to make {problem.num1}? Tap or drag fruits to the right basket!
          </Text>
        </View>

        {/* Equation */}
        <View style={styles.equationContainer}>
          <Text
            style={[
              styles.equationNumber,
              { color: '#0288D1' },
              (highlightPhase === 'partA' || isLeftBasketHighlighted) && styles.equationNumberHighlighted,
            ]}
          >
            {problem.num2}
          </Text>
          <Text style={styles.equationSymbol}> + </Text>
          <Text
            style={[
              styles.equationNumber,
              { color: '#E65100' },
              (highlightPhase === 'partB' || isRightBasketHighlighted) && styles.equationNumberHighlighted,
            ]}
          >
            {selectedOption !== null ? selectedOption : '?'}
          </Text>
          <Text style={styles.equationSymbol}> = </Text>
          <Text
            style={[
              styles.equationNumber,
              { color: '#F57F17' },
              (highlightPhase === 'total' || isTotalBadgeHighlighted) && styles.equationNumberHighlighted,
            ]}
          >
            {problem.num1}
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            TREE, DUAL BASKETS & BOND DIAGRAM (Matching UI Draft)
        ═══════════════════════════════════════════════════════════════════ */}
        <View
          style={styles.treeSection}
          onLayout={e => {
            treeSectionLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          {/* 1. Leafy Canopy with 10 Hanging Fruits */}
          <View
            style={styles.canopyContainer}
            onLayout={e => {
              canopyLayoutRef.current = e.nativeEvent.layout;
            }}
          >
            {/* SVG Canopy Backing */}
            <Svg width={sectionWidth} height={140} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="canopyGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#81C784" />
                  <Stop offset="0.7" stopColor="#4CAF50" />
                  <Stop offset="1" stopColor="#2E7D32" />
                </SvgLinearGradient>
              </Defs>
              {/* Organic leafy clusters */}
              <Circle cx={sectionWidth * 0.18} cy={70} r={55} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.82} cy={70} r={55} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.36} cy={55} r={65} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.64} cy={55} r={65} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.50} cy={45} r={68} fill="url(#canopyGrad)" />
            </Svg>

            {/* Canopy Title / Prompt */}
            <View style={styles.canopyTitleBadge}>
              <Text style={styles.canopyTitleText}>Fruits here!</Text>
            </View>

            {/* 10 Hanging Fruits arranged across branches in 2 rows */}
            <View style={styles.canopyFruitsGrid}>
              <View style={styles.fruitRow}>
                {treeFruits.slice(0, 5).map((f, idx) => {
                  const col = idx;
                  const gridWidth = (width - 24) * 0.9;
                  const colSpacing = gridWidth / 5;
                  const fruitCenterX = ((width - 24) - gridWidth) / 2 + (col + 0.5) * colSpacing;
                  const demoTargetX = ((width - 24) / 2 + 75) - fruitCenterX;
                  const demoTargetY = 175;
                  return (
                    <DraggableFruit
                      key={`${f.id}_r${roundKey}_try${currentTry}`}
                      fruit={f}
                      disabled={f.dropped || isDemonstrating}
                      isSelected={selectedFruitId === f.id}
                      onSelect={() => handleSelectFruit(f.id)}
                      onDrop={() => handleDropFruit(f.id)}
                      isHighlighted={highlightedFruitId === f.id}
                      isDemoAnimating={animatingFruitId === f.id}
                      demoTargetX={demoTargetX}
                      demoTargetY={demoTargetY}
                    />
                  );
                })}
              </View>
              <View style={styles.fruitRow}>
                {treeFruits.slice(5, 10).map((f, idx) => {
                  const col = idx;
                  const gridWidth = (width - 24) * 0.9;
                  const colSpacing = gridWidth / 5;
                  const fruitCenterX = ((width - 24) - gridWidth) / 2 + (col + 0.5) * colSpacing;
                  const demoTargetX = ((width - 24) / 2 + 75) - fruitCenterX;
                  const demoTargetY = 145;
                  return (
                    <DraggableFruit
                      key={`${f.id}_r${roundKey}_try${currentTry}`}
                      fruit={f}
                      disabled={f.dropped || isDemonstrating}
                      isSelected={selectedFruitId === f.id}
                      onSelect={() => handleSelectFruit(f.id)}
                      onDrop={() => handleDropFruit(f.id)}
                      isHighlighted={highlightedFruitId === f.id}
                      isDemoAnimating={animatingFruitId === f.id}
                      demoTargetX={demoTargetX}
                      demoTargetY={demoTargetY}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* 2. Unified Tree Trunk (Extended to bottom) + Vertically Elongated Baskets */}
          <View
            style={styles.trunkAreaWrapper}
            onLayout={e => {
              trunkLayoutRef.current = e.nativeEvent.layout;
            }}
          >
            {/* Continuous SVG Trunk Illustration extending from under canopy all the way down to roots */}
            <Svg width={sectionWidth} height={310} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#3E2723" />
                  <Stop offset="0.2" stopColor="#5D4037" />
                  <Stop offset="0.5" stopColor="#795548" />
                  <Stop offset="0.8" stopColor="#5D4037" />
                  <Stop offset="1" stopColor="#3E2723" />
                </SvgLinearGradient>
              </Defs>

              {/* Main Trunk Body Path */}
              <Path
                d={`M ${treeCenterX - 45} 0 ` +
                   `C ${treeCenterX - 30} 18, ${treeCenterX - 24} 28, ${treeCenterX} 30 ` +
                   `C ${treeCenterX + 24} 28, ${treeCenterX + 30} 18, ${treeCenterX + 45} 0 ` +
                   `L ${treeCenterX + 36} 12 ` +
                   `C ${treeCenterX + 28} 25, ${treeCenterX + 25} 40, ${treeCenterX + 24} 50 ` +
                   `C ${treeCenterX + 24} 100, ${treeCenterX + 23} 150, ${treeCenterX + 24} 190 ` +
                   `C ${treeCenterX + 28} 218, ${treeCenterX + 46} 250, ${treeCenterX + 75} 278 ` +
                   `C ${treeCenterX + 92} 294, ${treeCenterX + 115} 302, ${treeCenterX + 128} 306 ` +
                   `C ${treeCenterX + 105} 306, ${treeCenterX + 85} 298, ${treeCenterX + 68} 299 ` +
                   `C ${treeCenterX + 48} 300, ${treeCenterX + 30} 306, ${treeCenterX + 10} 306 ` +
                   `L ${treeCenterX - 10} 306 ` +
                   `C ${treeCenterX - 30} 306, ${treeCenterX - 48} 300, ${treeCenterX - 68} 299 ` +
                   `C ${treeCenterX - 85} 298, ${treeCenterX - 105} 306, ${treeCenterX - 128} 306 ` +
                   `C ${treeCenterX - 115} 302, ${treeCenterX - 92} 294, ${treeCenterX - 75} 278 ` +
                   `C ${treeCenterX - 46} 250, ${treeCenterX - 28} 218, ${treeCenterX - 24} 190 ` +
                   `C ${treeCenterX - 23} 150, ${treeCenterX - 24} 100, ${treeCenterX - 24} 50 ` +
                   `C ${treeCenterX - 25} 40, ${treeCenterX - 28} 25, ${treeCenterX - 36} 12 ` +
                   `Z`}
                fill="url(#trunkGrad)"
              />

              {/* Bark Texture Grooves */}
              <Path
                d={`M ${treeCenterX - 10} 45 C ${treeCenterX - 12} 110, ${treeCenterX - 9} 185, ${treeCenterX - 35} 280`}
                stroke="#3E2723"
                strokeWidth="2.5"
                strokeOpacity="0.4"
                fill="none"
              />
              <Path
                d={`M ${treeCenterX + 10} 45 C ${treeCenterX + 12} 110, ${treeCenterX + 9} 185, ${treeCenterX + 35} 280`}
                stroke="#3E2723"
                strokeWidth="2.5"
                strokeOpacity="0.4"
                fill="none"
              />
              <Path
                d={`M ${treeCenterX} 48 L ${treeCenterX} 185 C ${treeCenterX} 220, ${treeCenterX} 255, ${treeCenterX} 295`}
                stroke="#A1887F"
                strokeWidth="2"
                strokeOpacity="0.3"
                fill="none"
              />

              {/* Grass Base Line */}
              <Line
                x1={treeCenterX - 135}
                y1={306}
                x2={treeCenterX + 135}
                y2={306}
                stroke="#388E3C"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* V-Bond Connection Lines converging at the trunk vertex */}
              <Line
                x1={treeCenterX - 75}
                y1={160}
                x2={treeCenterX}
                y2={206}
                stroke="#2E1C14"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <Line
                x1={treeCenterX + 75}
                y1={160}
                x2={treeCenterX}
                y2={206}
                stroke="#2E1C14"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </Svg>

            {/* Dual Vertically Elongated Baskets & Center + */}
            <View style={styles.basketsRow}>
              {/* LEFT BASKET — Fixed Number Pair */}
              <View style={[styles.basketColumn, (isLeftBasketHighlighted || highlightPhase === 'partA') && styles.basketHighlighted]}>
                <TopViewBasket
                  width={leftDim.width}
                  height={leftDim.height}
                  badgeText={problem.num2}
                  badgeColor="#0288D1"
                  title="Fixed Pair"
                >
                  <View style={[styles.fixedFruitsCluster, { maxWidth: leftDim.clusterMaxWidth }]}>
                    {Array.from({ length: problem.num2 }).map((_, i) => {
                      const fruitId = `left_${i}`;
                      const isDemoCountingActive = demoCountingIndex === i;
                      const isDemoBadge = demoMaxCountedIndex !== null && i <= demoMaxCountedIndex;
                      const assignedCount = countedFruits[fruitId];
                      const isUserCounted = assignedCount !== undefined;

                      const isCountingActive = isDemoCountingActive;
                      const showBadge = isDemonstrating ? isDemoBadge : (isUserCounted && !isFiveStreakActive);
                      const fruitNum = isDemonstrating ? i + 1 : assignedCount;

                      const { tapAnim, glowAnim } = getFruitAnims(fruitId);
                      const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

                      return (
                        <TouchableOpacity
                          key={fruitId}
                          onPress={() => handleTapLeftFruit(i)}
                          disabled={isDemonstrating}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Animated.View
                            style={[
                              styles.doubleCheckFruitWrap,
                              isCountingActive && styles.doubleCheckFruitActive,
                              isUserCounted && styles.doubleCheckFruitCounted,
                              { transform: [{ scale: tapAnim }] },
                            ]}
                          >
                            <Text style={[styles.basketFruitEmoji, { fontSize: leftDim.emojiSize }]}>
                              {treeFruits[0]?.emoji ?? '🍎'}
                            </Text>
                            {showBadge && fruitNum !== undefined && (
                              <View style={styles.doubleCheckFruitBadge}>
                                <Text style={styles.doubleCheckFruitBadgeText}>{fruitNum}</Text>
                              </View>
                            )}
                            <Animated.View style={[StyleSheet.absoluteFill, styles.fruitGlow, { opacity: glowOpacity }]} />
                          </Animated.View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </TopViewBasket>
                <Text style={styles.basketBottomLabel}>Part: {problem.num2}</Text>
              </View>

              {/* Center + symbol on the trunk */}
              <View style={styles.plusSignContainer}>
                <Text style={styles.centerPlusText}>+</Text>
              </View>

              {/* RIGHT BASKET — Hybrid Drag Drop & Tap-to-Target Area (FR-NB-02) */}
              <Animated.View style={[
                styles.basketColumn,
                (isRightBasketHighlighted || highlightPhase === 'partB') && styles.basketHighlighted,
                { transform: [{ scale: basketPulse }] }
              ]}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleRightBasketPress}
                  disabled={isDemonstrating}
                  style={[
                    styles.expandedDropZoneTarget,
                    selectedFruitId ? styles.expandedDropZoneActive : null,
                  ]}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <TopViewBasket
                    width={rightDim.width}
                    height={rightDim.height}
                    badgeText={showClues ? (droppedCount > 0 ? droppedCount : '?') : '?'}
                    badgeColor="#E65100"
                    isDropZone={true}
                    isSnapActive={selectedFruitId !== null}
                    title="Drop Zone"
                    onReset={droppedCount > 0 && !isDemonstrating ? handleResetRightBasket : undefined}
                  >
                    {droppedCount === 0 ? (
                      <Text style={styles.dropPromptText}>
                        {selectedFruitId ? '🎯 Tap to place!' : 'Tap or drag\nfruits here!'}
                      </Text>
                    ) : (
                      <View style={[styles.fixedFruitsCluster, { maxWidth: rightDim.clusterMaxWidth }]}>
                        {droppedFruits.map((f, i) => {
                          const globalIdx = problem.num2 + i;
                          const isDemoCountingActive = demoCountingIndex === globalIdx;
                          const isDemoBadge = demoMaxCountedIndex !== null && globalIdx <= demoMaxCountedIndex;
                          const assignedCount = countedFruits[f.id];
                          const isUserCounted = assignedCount !== undefined;

                          const isCountingActive = isDemoCountingActive;
                          const showBadge = isDemonstrating ? isDemoBadge : (isUserCounted && !isFiveStreakActive);
                          const fruitNum = isDemonstrating ? globalIdx + 1 : assignedCount;

                          const { tapAnim, glowAnim } = getFruitAnims(f.id);
                          const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

                          return (
                            <TouchableOpacity
                              key={f.id}
                              onPress={() => handleTapRightFruit(f.id)}
                              onLongPress={() => handleRemoveFruit(f.id)}
                              delayLongPress={350}
                              disabled={isDemonstrating}
                              activeOpacity={0.7}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Animated.View
                                style={[
                                  styles.doubleCheckFruitWrap,
                                  isCountingActive && styles.doubleCheckFruitActive,
                                  isUserCounted && styles.doubleCheckFruitCounted,
                                  { transform: [{ scale: tapAnim }] },
                                ]}
                              >
                                <Text style={[styles.basketFruitEmoji, { fontSize: rightDim.emojiSize }]}>{f.emoji}</Text>
                                {showBadge && fruitNum !== undefined && (
                                  <View style={styles.doubleCheckFruitBadge}>
                                    <Text style={styles.doubleCheckFruitBadgeText}>{fruitNum}</Text>
                                  </View>
                                )}
                                <Animated.View style={[StyleSheet.absoluteFill, styles.fruitGlow, { opacity: glowOpacity }]} />
                              </Animated.View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </TopViewBasket>
                </TouchableOpacity>
                <Text style={styles.basketBottomLabel}>
                  {droppedCount > 0
                    ? (showClues ? `Your Part: ${droppedCount}` : 'Your Part')
                    : 'Tap or drag to add'}
                </Text>
              </Animated.View>
            </View>

            {/* Total Number Badge at the V-vertex on the trunk */}
            <View style={styles.totalNumberBadgeWrap}>
              <View style={[
                styles.totalNumberBadge,
                (isTotalBadgeHighlighted || highlightPhase === 'total') && styles.totalBadgeHighlighted
              ]}>
                <Text style={styles.totalBadgeLabel}>TOTAL</Text>
                <Text style={styles.totalBadgeValue}>{problem.num1}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            SUBMIT / CHECK BUTTON
        ═══════════════════════════════════════════════════════════════════ */}
        <View
          style={styles.actionsContainer}
          onLayout={e => {
            checkBtnLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: selectedOption !== null || isCheckHighlighted ? '#4CAF50' : '#BDBDBD' },
              isCheckHighlighted && styles.actionBtnHighlighted,
              isDemonstrating && !isCheckHighlighted && { opacity: 0.6 },
            ]}
            onPress={submitCheck}
            disabled={selectedOption === null || isDemonstrating}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Check ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <HintConfirmModal
        visible={showHintConfirm}
        hintsRemaining={hintsRemaining}
        onCancel={handleCancelHint}
        onConfirm={handleConfirmHint}
      />

      <GreatJobOverlay
        visible={showGreatJob}
        stars={greatJobStars}
        activityCount={activityCount}
        onContinue={handleContinueAfterGreatJob}
        isMastery={justMastered}
        masteryProgress={isMasteryProblem && !justMastered ? masteryProgress : null}
      />

      {/* Tutorial Completion Card */}
      {isTutorialMode && tutorialFinished && (
        <View style={styles.tutorialFinishOverlay}>
          <View style={styles.tutorialFinishCard}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🦉🎉</Text>
            <Text style={styles.tutorialFinishTitle}>You're Ready to Play!</Text>
            <Text style={styles.tutorialFinishSub}>Find what number goes with {problem.num2} to make {problem.num1}!</Text>
            <TouchableOpacity
              style={styles.tutorialStartBtn}
              onPress={skipOrEndTutorial}
              activeOpacity={0.85}
            >
              <Text style={styles.tutorialStartBtnText}>Start Game! 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5-Streak Independence Reward Modal */}
      <FiveStreakModal
        visible={showFiveStreak}
        onClose={handleCloseFiveStreak}
      />

      {/* Incorrect Feedback Modal -> Leads to Error Tutorial (Stage 1 Error Pinpointing FR-AP-04) */}
      <IncorrectModal
        visible={showIncorrectModal}
        isTimeout={isTimeoutError}
        userAnswer={lastWrongAnswer}
        correctAnswer={problem?.correctAnswer}
        problemNum1={problem?.num1}
        problemNum2={problem?.num2}
        strategy="NUMBER_BONDS"
        currentTry={currentTry}
        onContinue={handleContinueAfterIncorrect}
      />
    </SafeAreaView>
  );
}

// ─── Top-View Vertically Elongated Woven Basket Component ────────────────────
interface TopViewBasketProps {
  width: number;
  height: number;
  badgeText: string | number;
  badgeColor?: string;
  isDropZone?: boolean;
  isSnapActive?: boolean;
  title?: string;
  onReset?: () => void;
  basketOpacity?: number;
  children: React.ReactNode;
}

const TopViewBasket: React.FC<TopViewBasketProps> = ({
  width: bWidth,
  height: bHeight,
  badgeText,
  badgeColor = '#0288D1',
  isDropZone = false,
  isSnapActive = false,
  onReset,
  basketOpacity = 0.7,
  children,
}) => {
  const rx = bWidth / 2;
  const ry = bHeight / 2;

  return (
    <View style={[styles.basketContainer, { width: bWidth, height: bHeight }]}>
      {/* SVG Wicker concentric weave texture with 70% opacity for fruit visibility */}
      <Svg width={bWidth} height={bHeight} style={[StyleSheet.absoluteFill, { opacity: basketOpacity }]}>
        {/* Outer wicker shadow */}
        <Ellipse cx={rx} cy={ry} rx={rx - 2} ry={ry - 2} fill="#6D4C41" />
        {/* Outer braided rim */}
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 4}
          ry={ry - 4}
          fill="#D7CCC8"
          stroke="#4E342E"
          strokeWidth="5.5"
          strokeDasharray="5 4"
        />
        {/* Inner bowl shadow */}
        <Ellipse cx={rx} cy={ry} rx={rx - 10} ry={ry - 12} fill="#A1887F" />
        {/* Concentric weave rings */}
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 14}
          ry={ry - 17}
          fill="#D7CCC8"
          stroke="#8D6E63"
          strokeWidth="2.5"
          strokeDasharray="4 3"
        />
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 23}
          ry={ry - 28}
          fill="#EFEBE9"
          stroke="#5D4037"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 33}
          ry={ry - 40}
          fill="#D7CCC8"
          stroke="#8D6E63"
          strokeWidth="1.5"
        />
        {/* Radial wicker spokes */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x2 = rx + (rx - 12) * Math.cos(rad);
          const y2 = ry + (ry - 14) * Math.sin(rad);
          return (
            <Line
              key={deg}
              x1={rx}
              y1={ry}
              x2={x2}
              y2={y2}
              stroke="#8D6E63"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
          );
        })}
      </Svg>

      {/* Drop zone dashed highlight with magnetic snap feedback (FR-NB-02) */}
      {isDropZone && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: ry,
              borderWidth: isSnapActive ? 4 : 2.5,
              borderColor: isSnapActive ? '#FF6F00' : '#FF9800',
              borderStyle: isSnapActive ? 'solid' : 'dashed',
              backgroundColor: isSnapActive ? 'rgba(255, 179, 0, 0.18)' : 'transparent',
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Fruits content inside basket bowl */}
      <View style={styles.basketBowlInner}>{children}</View>

      {/* Count Badge on Basket */}
      <View style={[styles.basketBadgePill, { backgroundColor: badgeColor }]}>
        <Text style={styles.basketBadgePillText}>{badgeText}</Text>
      </View>

      {/* Reset button for right basket */}
      {onReset && (
        <TouchableOpacity style={styles.basketResetBtn} onPress={onReset} activeOpacity={0.75}>
          <Text style={styles.basketResetBtnText}>↻</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Draggable & Tappable Fruit on Tree Branch (Hybrid FR-NB-02 / >= 84x84dp NFR-AC-01) ─────
const DraggableFruit = ({
  fruit,
  onDrop,
  onSelect,
  isSelected = false,
  disabled,
  isHighlighted = false,
  isDemoAnimating = false,
  demoTargetX = 0,
  demoTargetY = 160,
}: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const demoAnimX = useRef(new Animated.Value(0)).current;
  const demoAnimY = useRef(new Animated.Value(0)).current;
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!fruit.dropped) {
      pan.setValue({ x: 0, y: 0 });
      demoAnimX.setValue(0);
      demoAnimY.setValue(0);
      pressScale.setValue(1);
    }
  }, [fruit.dropped]);

  useEffect(() => {
    if (isDemoAnimating) {
      demoAnimX.setValue(0);
      demoAnimY.setValue(0);
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 1.25, duration: 150, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(demoAnimX, {
            toValue: demoTargetX,
            duration: 480,
            useNativeDriver: true,
          }),
          Animated.timing(demoAnimY, {
            toValue: demoTargetY,
            duration: 480,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        demoAnimX.setValue(0);
        demoAnimY.setValue(0);
        pressScale.setValue(1);
      });
    } else {
      demoAnimX.setValue(0);
      demoAnimY.setValue(0);
      pressScale.setValue(1);
    }
  }, [isDemoAnimating, demoTargetX, demoTargetY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        Animated.spring(pressScale, { toValue: 1.25, friction: 4, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        // Tap-to-select: negligible movement (< 12px)
        if (Math.abs(gesture.dx) < 12 && Math.abs(gesture.dy) < 12) {
          onSelect?.();
          return;
        }
        // Magnetic proximity snapping: release within 50px of basket (dy > 30)
        if (gesture.dy > 30) {
          onDrop();
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          return;
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  if (fruit.dropped) {
    return (
      <View style={styles.draggableFruitTouchArea}>
        <View style={styles.hangingPlaceholder}>
          <Text style={styles.placeholderIcon}>🍂</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableFruitTouchArea,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          zIndex: isHighlighted || isDemoAnimating || isSelected ? 999 : 100,
        },
      ]}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
      <Animated.View
        style={{
          transform: [
            { scale: pressScale },
            { translateX: demoAnimX },
            { translateY: demoAnimY },
          ],
        }}
      >
        <View
          style={[
            styles.hangingFruitCircle,
            isHighlighted && styles.fruitCircleHighlighted,
            isSelected && styles.fruitCircleSelected,
          ]}
        >
          <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cloud: { position: 'absolute', color: '#FFF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    zIndex: 10,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  backIcon: { fontSize: 26, fontWeight: 'bold', color: '#4E342E' },
  topCenter: { alignItems: 'center' },
  activityProgress: { fontSize: 13, fontWeight: 'bold', color: '#4E342E', opacity: 0.75 },
  badgesContainer: { flexDirection: 'row', alignItems: 'center' },
  helpCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  helpIcon: { fontSize: 18 },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, elevation: 2 },
  badgeText: { fontWeight: 'bold', color: '#FF9800' },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  tryStarsRow: { flexDirection: 'row', gap: 2 },
  tryStar: { fontSize: 18 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4E342E',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, elevation: 2 },
  smallHintText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  masteryBadge: { backgroundColor: '#FF6F00', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, alignSelf: 'center', marginBottom: 4 },
  masteryBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  hintBoxWrap: { paddingHorizontal: 16 },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    elevation: 2,
  },
  owlPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#E0F7FA',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  instructionText: { flex: 1, fontSize: 13, color: '#4E342E', fontWeight: 'bold', lineHeight: 18 },

  // Tree & Dual Basket Section
  treeSection: {
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 2,
  },
  canopyContainer: {
    width: width - 24,
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canopyTitleBadge: {
    position: 'absolute',
    top: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    elevation: 2,
    zIndex: 10,
  },
  canopyTitleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2E7D32',
  },
  canopyFruitsGrid: {
    width: '94%',
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fruitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 2,
  },
  draggableFruitTouchArea: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangingFruitCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  fruitCircleSelected: {
    borderColor: '#FF9800',
    borderWidth: 3.5,
    backgroundColor: '#FFF3E0',
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    transform: [{ scale: 1.15 }],
  },
  hangingPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.35,
  },
  placeholderIcon: { fontSize: 20 },
  fruitEmoji: { fontSize: 24 },

  // Unified Trunk & Baskets Area
  trunkAreaWrapper: {
    width: width - 24,
    height: 300,
    position: 'relative',
    alignItems: 'center',
    marginTop: -6,
  },
  basketsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'absolute',
    top: 10,
    zIndex: 5,
  },
  basketColumn: {
    alignItems: 'center',
    zIndex: 5,
    marginHorizontal: 6,
  },
  expandedDropZoneTarget: {
    padding: 6,
    borderRadius: 32,
  },
  expandedDropZoneActive: {
    backgroundColor: 'rgba(255, 235, 59, 0.25)',
    borderWidth: 2.5,
    borderColor: '#FFC107',
    borderStyle: 'dashed',
    borderRadius: 32,
    elevation: 6,
  },
  plusSignContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3E2723',
    borderWidth: 2.5,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
    elevation: 4,
    marginHorizontal: 4,
  },
  centerPlusText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginTop: -2,
  },
  basketBottomLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4E342E',
    marginTop: 4,
  },

  // Basket Inner
  basketContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  basketBowlInner: {
    width: '90%',
    height: '90%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  fixedFruitsCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    maxWidth: 104,
  },
  basketFruitEmoji: {
    fontSize: 22,
    margin: 2,
  },
  doubleCheckFruitWrap: {
    position: 'relative',
    margin: 2,
    padding: 2,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0F2F1',
    overflow: 'visible',
  },
  doubleCheckFruitActive: {
    backgroundColor: '#FFF9C4',
    borderWidth: 2,
    borderColor: '#FFD700',
    transform: [{ scale: 1.18 }],
  },
  doubleCheckFruitCounted: {
    backgroundColor: '#FFF9C4',
    borderWidth: 2,
    borderColor: '#FFB300',
    shadowColor: '#FFA000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  doubleCheckFruitBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF6F00',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFF',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
  },
  doubleCheckFruitBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  fruitGlow: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
  },
  dropPromptText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
  },
  basketBadgePill: {
    position: 'absolute',
    top: -4,
    left: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFF',
    elevation: 3,
  },
  basketBadgePillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  basketResetBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF5252',
    borderWidth: 1.5,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  basketResetBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },

  // Total Number on Trunk
  totalNumberBadgeWrap: {
    position: 'absolute',
    top: 198,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },
  totalNumberBadge: {
    backgroundColor: '#FF6F00',
    borderWidth: 3,
    borderColor: '#FFF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  totalBadgeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFE082',
    letterSpacing: 1,
  },
  totalBadgeValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    marginTop: -2,
  },

  // Actions Section
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 26,
    width: '85%',
    maxWidth: 320,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  actionBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  equationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  equationNumber: {
    fontSize: 38,
    fontWeight: '900',
  },
  equationSymbol: {
    fontSize: 30,
    fontWeight: '900',
    color: '#263238',
    marginHorizontal: 4,
  },
  fruitCircleHighlighted: {
    borderColor: '#FF6F00',
    borderWidth: 3.5,
    backgroundColor: '#FFF9C4',
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  totalBadgeHighlighted: {
    borderColor: '#FFD700',
    borderWidth: 4,
    transform: [{ scale: 1.15 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  basketHighlighted: {
    borderWidth: 3.5,
    borderColor: '#FFD700',
    borderRadius: 24,
    padding: 3,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  actionBtnHighlighted: {
    borderWidth: 4,
    borderColor: '#FFD700',
    transform: [{ scale: 1.05 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  equationNumberHighlighted: {
    transform: [{ scale: 1.35 }],
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  containerTutorial: {
    borderWidth: 4,
    borderColor: '#FFB300',
  },
  tutorialBanner: {
    backgroundColor: '#FFE082',
    borderBottomWidth: 3,
    borderBottomColor: '#FFA000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9998,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  tutorialBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tutorialBannerIcon: {
    fontSize: 28,
  },
  tutorialBannerKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E65100',
    letterSpacing: 1,
  },
  tutorialBannerMessage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4E342E',
  },
  tutorialSkipBtn: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFA000',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 2,
  },
  tutorialSkipBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
  },
  tutorialBadge: {
    backgroundColor: '#FFF9C4',
    borderWidth: 2,
    borderColor: '#FBC02D',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tutorialBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F57F17',
  },
  tutorialFinishOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  tutorialFinishCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFE082',
  },
  tutorialFinishTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 6,
  },
  tutorialFinishSub: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  tutorialStartBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
  },
  tutorialStartBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
});
