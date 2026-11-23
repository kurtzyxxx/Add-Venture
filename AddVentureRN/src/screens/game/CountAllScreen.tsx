import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, SafeAreaView, Dimensions, Vibration,
} from 'react-native';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { HintConfirmModal } from '../../components/HintConfirmModal';
import { PulseView } from '../../components/animations/PulseView';
import { DemonstrationBanner } from '../../components/tutorial/DemonstrationBanner';
import { FiveStreakModal } from '../../components/FiveStreakModal';
import { IncorrectModal } from '../../components/IncorrectModal';
import { OliverSpeechBalloon } from '../../components/OliverSpeechBalloon';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import { TimerBar } from '../../components/TimerBar';
import { AudioManager } from '../../core/AudioManager';

type Props = NativeStackScreenProps<RootStackParamList, 'CountAll'>;

const { width, height } = Dimensions.get('window');
const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];
const HINT_DISABLE_THRESHOLD = 5; // consecutive correct before hints are hidden
const MAX_WRONG_TRIES = 3;

export default function CountAllScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [fruits, setFruits] = useState<{ id: string; emoji: string; dropped: boolean; group: 1 | 2 }[]>([]);
  const [countedFruits, setCountedFruits] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [dropCounter, setDropCounter] = useState(0);
  const [showCounter, setShowCounter] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(() => GameManager.getInstance().getSessionHintsRemaining());
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const isDemonstratingRef = useRef(false);
  const [isHintDemo, setIsHintDemo] = useState(false);
  const isHintDemoRef = useRef(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [highlightedFruitId, setHighlightedFruitId] = useState<string | null>(null);
  const [animatingFruitId, setAnimatingFruitId] = useState<string | null>(null);
  const [highlightedOption, setHighlightedOption] = useState<number | null>(null);
  const [isSubmitHighlighted, setIsSubmitHighlighted] = useState(false);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);
  const [remediationCycle, setRemediationCycle] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);

  // Synchronized visual highlights when narrator dictates the equation
  const [highlightPhase, setHighlightPhase] = useState<'idle' | 'tree1' | 'tree2' | 'total'>('idle');
  const readingTokenRef = useRef(0);

  const isDemoCancelled = useRef(false);

  // Layout measurement refs for exact coordinate targeting
  const contentYRef = useRef(0);
  const groupsWrapperLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const tree1LayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const tree2LayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const dropZoneLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const answerAreaLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const optionsLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const submitBtnLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const tree1ViewRef = useRef<View>(null);
  const tree2ViewRef = useRef<View>(null);
  const dropZoneViewRef = useRef<View>(null);

  // In-Game Live Tutorial Walkthrough State (FR-CA-01, FR-ON-01)
  const [isTutorialMode, setIsTutorialMode] = useState(true);
  const isTutorialModeRef = useRef(true);
  const [tutorialFinished, setTutorialFinished] = useState(false);
  const [tutorialMessage, setTutorialMessage] = useState('Watch Oliver show you how to play!');

  // 3-try system
  const [currentTry, setCurrentTry] = useState(1);
  // Activity counter (1–10)
  const [activityCount, setActivityCount] = useState(0);
  // Great Job overlay
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  const [justMastered, setJustMastered] = useState(false);
  const [showFiveStreak, setShowFiveStreak] = useState(false);
  // Incorrect / Error feedback modal
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [lastWrongAnswer, setLastWrongAnswer] = useState<number | null>(null);

  // Current problem ref (for mastery API)
  const currentProblemRef = useRef<Problem | null>(null);
  // Basket fruit tap bounce animations
  const fruitTapAnims = useRef<Record<string, Animated.Value>>({});
  // Glow animation for tapped basket fruit
  const fruitGlowAnims = useRef<Record<string, Animated.Value>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingHintAction = useRef<(() => void) | null>(null);

  const waitMs = (ms: number) => new Promise(res => setTimeout(res, ms));

  const stopReadingAloud = () => {
    readingTokenRef.current++;
    AudioManager.stopSpeech();
    setHighlightPhase('idle');
    setIsNarrating(false);
  };

  const readProblemAloud = async (targetProblem: Problem | null = null) => {
    const p = targetProblem ?? currentProblemRef.current ?? problem;
    if (!p || isDemonstratingRef.current || isTutorialModeRef.current) {
      setIsNarrating(false);
      return;
    }

    setIsNarrating(true);
    const token = ++readingTokenRef.current;
    AudioManager.stopSpeech();

    const n1 = p.num1;
    const n2 = p.num2;
    const fruitWord1 = n1 === 1 ? 'fruit' : 'fruits';
    const fruitWord2 = n2 === 1 ? 'fruit' : 'fruits';

    try {
      // Phase 1: Highlight number 1 and Tree 1 fruits
      setHighlightPhase('tree1');
      await AudioManager.speakAsync(`Oliver has ${n1} ${fruitWord1} in Tree 1,`, {
        rate: 0.78,
        pitch: 1.25,
      });
      if (readingTokenRef.current !== token) return;

      await new Promise(res => setTimeout(res, 200));
      if (readingTokenRef.current !== token) return;

      // Phase 2: Highlight number 2 and Tree 2 fruits
      setHighlightPhase('tree2');
      await AudioManager.speakAsync(`and ${n2} ${fruitWord2} in Tree 2.`, {
        rate: 0.78,
        pitch: 1.25,
      });
      if (readingTokenRef.current !== token) return;

      await new Promise(res => setTimeout(res, 200));
      if (readingTokenRef.current !== token) return;

      // Phase 3: Highlight '?'
      setHighlightPhase('total');
      await AudioManager.speakAsync(`How many fruits in all?`, {
        rate: 0.78,
        pitch: 1.3,
      });
      if (readingTokenRef.current !== token) return;

      await new Promise(res => setTimeout(res, 350));
      if (readingTokenRef.current !== token) return;
    } finally {
      if (readingTokenRef.current === token) {
        setHighlightPhase('idle');
        setIsNarrating(false);
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
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);
    setHighlightPhase('idle');

    const gm = GameManager.getInstance();
    resetTimer(gm.sessionTimerLimit);
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
      num1: 2,
      num2: 1,
      correctAnswer: 3,
    };
    currentProblemRef.current = tutProblem;
    setProblem(tutProblem);
    setIsMasteryProblem(false);
    setActivityCount(0);
    setHintsDisabled(true);

    const emojiType1 = '🍎';
    const emojiType2 = '🍌';
    const tutFruits = [
      { id: 'g1_0', emoji: emojiType1, dropped: false, group: 1 as const },
      { id: 'g1_1', emoji: emojiType1, dropped: false, group: 1 as const },
      { id: 'g2_0', emoji: emojiType2, dropped: false, group: 2 as const },
    ];

    tutFruits.forEach(f => {
      fruitTapAnims.current[f.id] = new Animated.Value(1);
      fruitGlowAnims.current[f.id] = new Animated.Value(0);
    });

    setFruits(tutFruits);
    setCountedFruits({});
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setActiveHint(null);
    setCurrentTry(1);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);
    setOptions([1, 2, 3, 4, 5]);

    setTutorialMessage('Welcome to Count All! Watch Oliver show you how to play.');
    await AudioManager.speakAsync('Welcome to Count All! Watch Oliver show you how to play.', {
      rate: 0.78,
      pitch: 1.25,
    });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Dictate equation with highlights
    setTutorialMessage('Tree 1 has 2 fruits, and Tree 2 has 1 fruit.');
    setHighlightPhase('tree1');
    await AudioManager.speakAsync('Oliver has 2 fruits in Tree 1,', { rate: 0.78, pitch: 1.25 });
    if (isDemoCancelled.current) return;
    await waitMs(200);

    setHighlightPhase('tree2');
    await AudioManager.speakAsync('and 1 fruit in Tree 2.', { rate: 0.78, pitch: 1.25 });
    if (isDemoCancelled.current) return;
    await waitMs(200);

    setHighlightPhase('total');
    await AudioManager.speakAsync('How many fruits in all?', { rate: 0.78, pitch: 1.3 });
    if (isDemoCancelled.current) return;
    await waitMs(350);
    setHighlightPhase('idle');

    // Drag fruits
    setTutorialMessage('Drag each fruit into the basket to count them!');
    await AudioManager.speakAsync('Watch me drag each fruit into the basket!', { rate: 0.78, pitch: 1.25 });
    await waitMs(300);
    if (isDemoCancelled.current) return;

    // Tree 1 fruit 1
    setHighlightedFruitId('g1_0');
    setAnimatingFruitId('g1_0');
    await waitMs(480);
    if (isDemoCancelled.current) return;
    setFruits(prev => prev.map(f => f.id === 'g1_0' ? { ...f, dropped: true } : f));
    setDropCounter(1);
    setShowCounter(true);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    await AudioManager.speakAsync('One!', { rate: 0.78, pitch: 1.35 });
    await waitMs(250);
    if (isDemoCancelled.current) return;

    // Tree 1 fruit 2
    setHighlightedFruitId('g1_1');
    setAnimatingFruitId('g1_1');
    await waitMs(480);
    if (isDemoCancelled.current) return;
    setFruits(prev => prev.map(f => f.id === 'g1_1' ? { ...f, dropped: true } : f));
    setDropCounter(2);
    setShowCounter(true);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    await AudioManager.speakAsync('Two!', { rate: 0.78, pitch: 1.35 });
    await waitMs(250);
    if (isDemoCancelled.current) return;

    // Tree 2 fruit 1
    setHighlightedFruitId('g2_0');
    setAnimatingFruitId('g2_0');
    await waitMs(480);
    if (isDemoCancelled.current) return;
    setFruits(prev => prev.map(f => f.id === 'g2_0' ? { ...f, dropped: true } : f));
    setDropCounter(3);
    setShowCounter(true);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    await AudioManager.speakAsync('Three!', { rate: 0.78, pitch: 1.35 });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Demonstrate Tap-to-Count in arbitrary order inside the basket
    setTutorialMessage('Tap each fruit in the basket in any order to count!');
    await AudioManager.speakAsync('Now tap each fruit in the basket in any order to count them!', { rate: 0.78, pitch: 1.25 });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Fruit 1 (Tree 1 fruit 0) -> Badge 1
    setCountedFruits({ g1_0: 1 });
    const tapAnim0 = fruitTapAnims.current['g1_0'];
    const glowAnim0 = fruitGlowAnims.current['g1_0'];
    if (tapAnim0) {
      Animated.sequence([
        Animated.spring(tapAnim0, { toValue: 1.35, friction: 3, useNativeDriver: true }),
        Animated.spring(tapAnim0, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    if (glowAnim0) {
      Animated.sequence([
        Animated.timing(glowAnim0, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(glowAnim0, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
    await AudioManager.speakAsync('One!', { rate: 0.85, pitch: 1.35 });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Fruit 2 (Tree 2 fruit 0 - demonstrating arbitrary order!) -> Badge 2
    setCountedFruits(prev => ({ ...prev, g2_0: 2 }));
    const tapAnim2 = fruitTapAnims.current['g2_0'];
    const glowAnim2 = fruitGlowAnims.current['g2_0'];
    if (tapAnim2) {
      Animated.sequence([
        Animated.spring(tapAnim2, { toValue: 1.35, friction: 3, useNativeDriver: true }),
        Animated.spring(tapAnim2, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    if (glowAnim2) {
      Animated.sequence([
        Animated.timing(glowAnim2, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(glowAnim2, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
    await AudioManager.speakAsync('Two!', { rate: 0.85, pitch: 1.35 });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Fruit 3 (Tree 1 fruit 1) -> Badge 3
    setCountedFruits(prev => ({ ...prev, g1_1: 3 }));
    const tapAnim1 = fruitTapAnims.current['g1_1'];
    const glowAnim1 = fruitGlowAnims.current['g1_1'];
    if (tapAnim1) {
      Animated.sequence([
        Animated.spring(tapAnim1, { toValue: 1.35, friction: 3, useNativeDriver: true }),
        Animated.spring(tapAnim1, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    if (glowAnim1) {
      Animated.sequence([
        Animated.timing(glowAnim1, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(glowAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
    await AudioManager.speakAsync("Three! That's 3 fruits in all!", { rate: 0.85, pitch: 1.35 });
    await waitMs(450);
    if (isDemoCancelled.current) return;

    // Pick answer
    setTutorialMessage('All 3 fruits in the basket! Tap number 3!');
    await AudioManager.speakAsync('All 3 fruits are in the basket! Now tap 3!', { rate: 0.78, pitch: 1.3 });
    await waitMs(300);
    if (isDemoCancelled.current) return;

    setHighlightedOption(3);
    setSelectedAnswer(3);
    await AudioManager.speakAsync('Three!', { rate: 0.78, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Tap submit
    setTutorialMessage('Then tap Submit to finish!');
    setIsSubmitHighlighted(true);
    await AudioManager.speakAsync('Then tap Submit!', { rate: 0.78, pitch: 1.3 });
    await waitMs(500);
    if (isDemoCancelled.current) return;

    // Complete walkthrough
    setTutorialMessage("Awesome! You're ready to play! 🚀");
    await AudioManager.speakAsync("Hooray! That's how we Count All! Now you're ready to play!", {
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

  const resetTimer = (limit: number) => {
    setTimeLeft(limit);
  };

  // Timer only runs when gameplay is actively running (waits until narrator finishes dictating the problem)
  useEffect(() => {
    if (isTutorialMode || isDemonstrating || isNarrating || showGreatJob || showFiveStreak || showIncorrectModal || !problem) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTutorialMode, isDemonstrating, isNarrating, showGreatJob, showFiveStreak, showIncorrectModal, problem]);

  useEffect(() => {
    if (timeLeft === 0 && !isTutorialMode && !isDemonstrating && !showGreatJob && !showFiveStreak && !showIncorrectModal && problem && selectedAnswer === null) {
      handleTimeUp();
    }
  }, [timeLeft, isTutorialMode, isDemonstrating, showGreatJob, showFiveStreak, showIncorrectModal, problem, selectedAnswer]);

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

    setIsMasteryProblem(isMastery);
    currentProblemRef.current = p;
    setProblem(p);

    const pCount = gm.getSessionActivityCount();
    setActivityCount(pCount);

    const profile = gm.saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD);

    const emojiType1 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    let emojiType2 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    while (emojiType1 === emojiType2) {
      emojiType2 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    }

    const newFruits: typeof fruits = [];
    for (let i = 0; i < p.num1; i++) newFruits.push({ id: `g1_${i}`, emoji: emojiType1, dropped: false, group: 1 });
    for (let i = 0; i < p.num2; i++) newFruits.push({ id: `g2_${i}`, emoji: emojiType2, dropped: false, group: 2 });

    // Initialise tap animations for all fruits
    newFruits.forEach(f => {
      fruitTapAnims.current[f.id] = new Animated.Value(1);
      fruitGlowAnims.current[f.id] = new Animated.Value(0);
    });

    setFruits(newFruits);
    setCountedFruits({});
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setActiveHint(null);
    setCurrentTry(1);
    setRemediationCycle(0);
    setJustMastered(false);
    resetTimer(gm.sessionTimerLimit);

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      opts.add(Math.floor(Math.random() * 18) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));

    if (!silent) {
      setIsNarrating(true);
      setTimeout(() => {
        if (isMastery) {
          AudioManager.speak('Keep going! Practice makes perfect.', { rate: 0.78, pitch: 1.3 });
          setTimeout(() => readProblemAloud(p), 1800);
        } else {
          readProblemAloud(p);
        }
      }, 350);
    } else {
      setIsNarrating(false);
    }
  };

  const handleDrop = (fruitId: string) => {
    stopReadingAloud();
    setFruits(prev => {
      const next = prev.map(f => f.id === fruitId ? { ...f, dropped: true } : f);
      const droppedCount = next.filter(f => f.dropped).length;
      setDropCounter(droppedCount);
      triggerDropCounter();

      const profile = GameManager.getInstance().saveSystem.getProfile();
      const verboseMode = profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD;

      AudioManager.stopSpeech();
      if (droppedCount === next.length) {
        if (verboseMode) {
          AudioManager.speak('Now tap each fruit in the basket to count them!', { rate: 0.92, pitch: 1.3 });
        }
      } else if (verboseMode) {
        AudioManager.speak(droppedCount.toString(), { rate: 0.95, pitch: 1.4 });
      }
      return next;
    });
  };

  const resetDroppedFruits = () => {
    stopReadingAloud();
    setFruits(prev => prev.map(fruit => ({ ...fruit, dropped: false })));
    setCountedFruits({});
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    AudioManager.stopSpeech();
    AudioManager.speak('Fruits reset.', { rate: 0.95, pitch: 1.25 });
  };

  const handleBasketFruitTap = (fruit: { id: string; emoji: string }) => {
    stopReadingAloud();

    const allDropped = fruits.length > 0 && fruits.every(f => f.dropped);
    if (!allDropped) {
      AudioManager.stopSpeech();
      AudioManager.speak('Drag all fruits to the basket first!', { rate: 0.92, pitch: 1.3 });
      return;
    }

    try {
      Vibration.vibrate(25);
    } catch {}

    const profile = GameManager.getInstance().saveSystem.getProfile();
    const isFiveStreakActive = profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD;

    const assignedCount = countedFruits[fruit.id];
    let spokenNumber: number;

    if (assignedCount !== undefined) {
      spokenNumber = assignedCount;
    } else {
      const nextCount = Object.keys(countedFruits).length + 1;
      spokenNumber = nextCount;
      setCountedFruits(prev => ({
        ...prev,
        [fruit.id]: nextCount,
      }));

      // In normal mode, celebrate when all fruits are counted
      if (!isFiveStreakActive && problem && nextCount === problem.correctAnswer) {
        setTimeout(() => {
          AudioManager.speak(`That's ${problem.correctAnswer} fruits in all! Tap the correct number below.`, {
            rate: 0.88,
            pitch: 1.3,
          });
        }, 800);
      }
    }

    // Only narrate count if 5-streak independence mode is NOT active
    if (!isFiveStreakActive) {
      AudioManager.stopSpeech();
      AudioManager.speak(`${spokenNumber}`, { rate: 0.95, pitch: 1.35 });
    }

    // Bounce animation
    const tapAnim = fruitTapAnims.current[fruit.id];
    const glowAnim = fruitGlowAnims.current[fruit.id];
    if (tapAnim) {
      Animated.sequence([
        Animated.spring(tapAnim, { toValue: 1.4, friction: 3, useNativeDriver: true }),
        Animated.spring(tapAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    if (glowAnim) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  };

  const counterTimeout = useRef<any>(null);
  const triggerDropCounter = () => {
    setShowCounter(true);
    if (counterTimeout.current) clearTimeout(counterTimeout.current);
    counterTimeout.current = setTimeout(() => setShowCounter(false), 600);
  };

  const submitAnswer = async () => {
    stopReadingAloud();
    const allDropped = fruits.length > 0 && fruits.every(f => f.dropped);
    if (selectedAnswer === null || !problem || !allDropped) return;

    const isCorrect = selectedAnswer === problem.correctAnswer;
    const gm = GameManager.getInstance();
    const responseTimeMs = (gm.sessionTimerLimit - timeLeft) * 1000;
    const { starsEarned } = await gm.submitAnswer(
      isCorrect, currentTry, responseTimeMs, problem, selectedAnswer, isCorrect
    );

    if (isCorrect) {
      let wasMastered = false;
      if (isMasteryProblem) {
        wasMastered = gm.recordMasteryCorrect(problem);
      }
      const newCount = gm.getSessionActivityCount();
      setActivityCount(newCount);
      setGreatJobStars(starsEarned);
      setJustMastered(wasMastered);
      setShowGreatJob(true);
    } else {
      if (isMasteryProblem) {
        gm.recordMasteryIncorrect(problem);
      }
      setLastWrongAnswer(selectedAnswer);
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
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) {
      await finishSession();
    } else {
      loadNewProblem();
    }
  };

  const handleCloseFiveStreak = async () => {
    setShowFiveStreak(false);
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) {
      await finishSession();
    } else {
      loadNewProblem();
    }
  };

  const startAutomatedDemonstration = async (isTimeout = false, isHint = false) => {
    stopReadingAloud();
    if (!problem) return;
    isDemonstratingRef.current = true;
    setIsDemonstrating(true);
    isHintDemoRef.current = isHint;
    setIsHintDemo(isHint);
    isDemoCancelled.current = false;
    if (!isHint) {
      setRemediationCycle(c => c + 1);
    }

    // Reset fruits back to tree so demo starts clean
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setCountedFruits({});
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);

    setDemoMessage(`Guided Practice: Let's count Tree 1 and Tree 2 together!`);

    await AudioManager.speakAsync(`Watch Oliver count! Tree 1 has ${problem.num1}, and Tree 2 has ${problem.num2}. Let's count all of them!`, {
      rate: 0.78,
      pitch: 1.25,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Drag Tree 1 fruits one by one with highlight and travel animation
    let currentCount = 0;
    for (let i = 0; i < problem.num1; i++) {
      if (isDemoCancelled.current) return;
      currentCount++;
      const fruitId = `g1_${i}`;

      setDemoMessage(`Tree 1: Fruit #${currentCount} into the basket!`);
      setHighlightedFruitId(fruitId);
      setAnimatingFruitId(fruitId);

      // Allow the slide-down animation to travel into the basket
      await waitMs(480);
      if (isDemoCancelled.current) return;

      // Transfer into basket
      setFruits(prev => prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f)));
      setDropCounter(currentCount);
      setShowCounter(true);
      setHighlightedFruitId(null);
      setAnimatingFruitId(null);

      await AudioManager.speakAsync(`${currentCount}`, { rate: 0.78, pitch: 1.35 });
      await waitMs(250);
    }

    // Drag Tree 2 fruits one by one with highlight and travel animation
    for (let i = 0; i < problem.num2; i++) {
      if (isDemoCancelled.current) return;
      currentCount++;
      const fruitId = `g2_${i}`;

      setDemoMessage(`Tree 2: Fruit #${currentCount} into the basket!`);
      setHighlightedFruitId(fruitId);
      setAnimatingFruitId(fruitId);

      await waitMs(480);
      if (isDemoCancelled.current) return;

      setFruits(prev => prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f)));
      setDropCounter(currentCount);
      setShowCounter(true);
      setHighlightedFruitId(null);
      setAnimatingFruitId(null);

      await AudioManager.speakAsync(`${currentCount}`, { rate: 0.78, pitch: 1.35 });
      await waitMs(250);
    }

    if (isDemoCancelled.current) return;
    setDemoMessage(`All fruits in the basket! Total is ${problem.correctAnswer}!`);
    await AudioManager.speakAsync(`We counted ${problem.correctAnswer} fruits in all! Now let's pick ${problem.correctAnswer}!`, {
      rate: 0.78,
      pitch: 1.3,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Highlight the correct answer option button
    setDemoMessage(`Tap the number ${problem.correctAnswer}!`);
    setHighlightedOption(problem.correctAnswer);
    setSelectedAnswer(problem.correctAnswer);

    await AudioManager.speakAsync(`${problem.correctAnswer}!`, { rate: 0.78, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Highlight the Submit button
    setDemoMessage(`Tap Submit to finish!`);
    setIsSubmitHighlighted(true);

    await AudioManager.speakAsync(`Tap Submit!`, { rate: 0.78, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    setDemoMessage(`🎯 Now it's your turn! Drag the fruits to count!`);
    await AudioManager.speakAsync(`Now it's your turn! You can do it!`, { rate: 0.78, pitch: 1.3 });
    await waitMs(400);
    endDemonstration();
  };

  const endDemonstration = () => {
    isDemoCancelled.current = true;
    isDemonstratingRef.current = false;
    setIsDemonstrating(false);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);
    if (!isHintDemoRef.current) {
      setCurrentTry(prev => prev + 1);
    }
    isHintDemoRef.current = false;
    setIsHintDemo(false);

    // Reset fruits back to tree for the learner
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setCountedFruits({});
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setOptions(prev => {
      const s = [...prev];
      for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
      }
      return s;
    });
    const gm = GameManager.getInstance();
    setTimeLeft(gm.sessionTimerLimit);
  };

  const useHint = () => {
    stopReadingAloud();
    if (!problem || hintsRemaining <= 0 || isDemonstrating) return;
    const gm = GameManager.getInstance();
    gm.consumeSessionHint().then(setHintsRemaining);
    startAutomatedDemonstration(false, true);
  };

  const confirmUseHint = (beforeConfirm?: () => void) => {
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
      strategy: 'COUNT_ALL',
      incorrectProblems: [],
    });
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const droppedFruits = fruits.filter(f => f.dropped);
  const allDropped = fruits.length > 0 && fruits.every(f => f.dropped);
  const totalCounted = Object.keys(countedFruits).length;
  const isGroup1Finished = fruits.filter(f => f.group === 1 && !f.dropped).length === 0;
  const profile = GameManager.getInstance().saveSystem.getProfile();
  const showRunningCounter = profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD;
  const isFiveStreakActive = profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];
  const masteryProgress = GameManager.getInstance().getMasteryProgress();
  const displayedActivityCount = Math.min(activityCount + 1, MAX_ACTIVITIES_PER_SESSION);

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

      {/* Guided Remediation / Hint Demo Banner (during normal game) */}
      {!isTutorialMode && isDemonstrating && (
        <DemonstrationBanner
          message={demoMessage}
          onSkip={endDemonstration}
          allowSkip={isHintDemo || remediationCycle > 0 || currentTry > 1}
          kicker={isHintDemo ? '💡 HINT DEMO' : 'GUIDED PRACTICE'}
        />
      )}

      {/* Cloud Decorations */}
      <Text style={[styles.cloud, { top: '10%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '20%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '60%', left: '5%', fontSize: 70, opacity: 0.5 }]}>☁️</Text>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.replace('Home')} style={styles.circleButton}>
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
          <TouchableOpacity onPress={handleOpenTutorial} style={styles.helpCircleButton} activeOpacity={0.8}>
            <Text style={styles.helpIcon}>❓</Text>
          </TouchableOpacity>
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
        {/* Header row: try stars | title | hint */}
        <View style={styles.titleContainer}>
          <View style={styles.tryStarsRow}>
            {[1, 2, 3].map((t, i) => (
              <Text key={i} style={[styles.tryStar, { opacity: t >= currentTry ? 1 : 0.25 }]}>⭐</Text>
            ))}
          </View>
          <Text style={[styles.title, { flex: 2, textAlign: 'center' }]}>Count All</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {!hintsDisabled && (
              <PulseView active={hintsRemaining > 0 && !hintsDisabled} maxScale={1.1} duration={800}>
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
        </View>

        {/* Mastery badge */}
        {isMasteryProblem && (
          <View style={styles.masteryBadge}>
            <Text style={styles.masteryBadgeText}>🔥 Keep Going! Practice Round</Text>
          </View>
        )}

        {/* Instruction card */}
        <View style={styles.instructionCard}>
          <View style={styles.owlPlaceholder}>
            <Text style={{ fontSize: 36 }}>🦉</Text>
            <OliverSpeechBalloon
              active={
                !isTutorialMode &&
                !isDemonstrating &&
                !showGreatJob &&
                !showFiveStreak &&
                !showHintConfirm &&
                problem !== null &&
                selectedAnswer === null
              }
            />
          </View>
          <Text style={styles.instructionText}>
            {!allDropped
              ? 'Count and drag the fruits to the drop zone.'
              : isFiveStreakActive
              ? totalCounted < fruits.length
                ? 'Tap fruits to keep track as you count in your head!'
                : 'All fruits counted! Tap your answer below.'
              : totalCounted < fruits.length
              ? `Tap each fruit in the basket to count! (${totalCounted}/${fruits.length})`
              : `All ${fruits.length} fruits counted! Tap the matching number below.`}
          </Text>
        </View>


        {/* Equation */}
        <View style={styles.equationContainer}>
          <Text
            style={[
              styles.equationNumber,
              { color: '#FF5252' },
              highlightPhase === 'tree1' && styles.equationNumberHighlighted,
            ]}
          >
            {problem.num1}
          </Text>
          <Text style={styles.equationSymbol}> + </Text>
          <Text
            style={[
              styles.equationNumber,
              { color: '#00BFA5' },
              highlightPhase === 'tree2' && styles.equationNumberHighlighted,
            ]}
          >
            {problem.num2}
          </Text>
          <Text style={styles.equationSymbol}> = </Text>
          <Text
            style={[
              styles.equationNumber,
              { color: '#FFCA28' },
              highlightPhase === 'total' && styles.equationNumberHighlighted,
            ]}
          >
            ?
          </Text>
        </View>

        {/* Fruit Groups */}
        <View
          style={styles.groupsWrapper}
          onLayout={e => {
            groupsWrapperLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          <View
            ref={tree1ViewRef}
            style={[styles.groupCard, { zIndex: 2 }]}
            onLayout={e => {
              tree1LayoutRef.current = e.nativeEvent.layout;
            }}
          >
            <View style={styles.groupHeader}>
              <Text style={styles.treeIcon}>🌳</Text>
              <Text style={styles.groupTitle}>Tree 1</Text>
            </View>
            <View style={styles.fruitRow}>
              {fruits.filter(f => f.group === 1 && !f.dropped).map(fruit => (
                <DraggableFruit
                  key={fruit.id}
                  fruit={fruit}
                  disabled={isDemonstrating}
                  onDrop={() => handleDrop(fruit.id)}
                  isHighlighted={highlightedFruitId === fruit.id || highlightPhase === 'tree1'}
                  isDemoAnimating={animatingFruitId === fruit.id}
                  demoDistance={180}
                />
              ))}
            </View>
          </View>

          <View
            ref={tree2ViewRef}
            style={[styles.groupCard, { zIndex: 1 }]}
            onLayout={e => {
              tree2LayoutRef.current = e.nativeEvent.layout;
            }}
          >
            <View style={styles.groupHeader}>
              <Text style={styles.treeIcon}>🌳</Text>
              <Text style={styles.groupTitle}>Tree 2</Text>
            </View>
            <View style={styles.fruitRow}>
              {fruits.filter(f => f.group === 2 && !f.dropped).map(fruit => (
                <DraggableFruit
                  key={fruit.id}
                  fruit={fruit}
                  disabled={isDemonstrating || !isGroup1Finished}
                  onDrop={() => handleDrop(fruit.id)}
                  isHighlighted={highlightedFruitId === fruit.id || highlightPhase === 'tree2'}
                  isDemoAnimating={animatingFruitId === fruit.id}
                  demoDistance={95}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Drop Zone */}
        <View
          ref={dropZoneViewRef}
          style={styles.dropZone}
          onLayout={e => {
            dropZoneLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          {droppedFruits.length > 0 && (
            <TouchableOpacity style={styles.dropResetButton} onPress={resetDroppedFruits} activeOpacity={0.85}>
              <Text style={styles.dropResetIcon}>↻</Text>
            </TouchableOpacity>
          )}
          {droppedFruits.length === 0 && (
            <Text style={styles.dropZoneHint}>Drag all fruits here to count!</Text>
          )}
          <View style={styles.fruitRow}>
            {droppedFruits.map((fruit, idx) => {
              const assignedCount = countedFruits[fruit.id];
              const isCounted = assignedCount !== undefined;
              const tapAnim = fruitTapAnims.current[fruit.id] ?? new Animated.Value(1);
              const glowAnim = fruitGlowAnims.current[fruit.id] ?? new Animated.Value(0);
              const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
              return (
                <TouchableOpacity key={fruit.id} onPress={() => handleBasketFruitTap(fruit)} activeOpacity={0.8}>
                  <Animated.View
                    style={[
                      styles.droppedFruitWrapper,
                      isCounted && styles.droppedFruitCounted,
                      { transform: [{ scale: tapAnim }] },
                    ]}
                  >
                    <Text style={styles.emoji}>{fruit.emoji}</Text>
                    {isCounted && !isFiveStreakActive && (
                      <View style={styles.countedFruitBadge}>
                        <Text style={styles.countedFruitBadgeText}>{assignedCount}</Text>
                      </View>
                    )}
                    <Animated.View style={[StyleSheet.absoluteFill, styles.fruitGlow, { opacity: glowOpacity }]} />
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
          {showCounter && showRunningCounter && (
            <View style={styles.dropCounterBadge}>
              <Text style={styles.dropCounterText}>{dropCounter}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Answer Area — always visible once an answer is selected or any fruit is dropped */}
      <View
        style={styles.answerArea}
        onLayout={e => {
          answerAreaLayoutRef.current = e.nativeEvent.layout;
        }}
      >
        <View
          style={styles.optionsContainer}
          onLayout={e => {
            optionsLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          {options.map((opt, index) => {
            const isHighlighted = highlightedOption === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionButton,
                  { backgroundColor: optionColors[index % optionColors.length] },
                  selectedAnswer === opt && styles.optionSelected,
                  isHighlighted && styles.optionButtonHighlighted,
                  (!allDropped || isDemonstrating) && { opacity: 0.55 },
                  isHighlighted && { opacity: 1 },
                ]}
                disabled={isDemonstrating || !allDropped}
                onPress={() => {
                  if (isDemonstrating || !allDropped) {
                    if (!isDemonstrating) {
                      AudioManager.stopSpeech();
                      AudioManager.speak('Drag all fruits to the basket first!', { rate: 0.95, pitch: 1.3 });
                    }
                    return;
                  }
                  setSelectedAnswer(opt);
                }}
                activeOpacity={allDropped ? 0.8 : 1}
              >
                <View style={styles.optionInner}>
                  <Text style={styles.optionText}>{opt}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View
          style={styles.actionsContainer}
          onLayout={e => {
            submitBtnLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor:
                  (selectedAnswer !== null && allDropped && !isDemonstrating) || isSubmitHighlighted
                    ? '#66BB6A'
                    : '#9E9E9E',
                width: '80%',
              },
              isSubmitHighlighted && styles.actionBtnHighlighted,
            ]}
            onPress={submitAnswer}
            disabled={isDemonstrating || selectedAnswer === null || !allDropped}
          >
            <Text style={styles.actionBtnText}>Submit ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <HintConfirmModal
        visible={showHintConfirm}
        hintsRemaining={hintsRemaining}
        onCancel={handleCancelHint}
        onConfirm={handleConfirmHint}
      />

      {/* Great Job Overlay */}
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
            <Text style={styles.tutorialFinishSub}>Now help Oliver count all the fruits!</Text>
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
        strategy="COUNT_ALL"
        currentTry={currentTry}
        onContinue={handleContinueAfterIncorrect}
      />
    </SafeAreaView>
  );
}

// ─── Draggable Fruit ──────────────────────────────────────────────────────────
const DraggableFruit = ({
  fruit,
  onDrop,
  disabled,
  isHighlighted = false,
  isDemoAnimating = false,
  demoDistance = 160,
}: any) => {
  // pan uses JS driver (required by Animated.event / PanResponder position tracking)
  const pan = useRef(new Animated.ValueXY()).current;
  // pressScale and demoAnimY use native driver (transform-only, no layout)
  // CRITICAL: these must live on the INNER Animated.View to avoid the
  // "JS driven animation on native node" crash.
  const pressScale = useRef(new Animated.Value(1)).current;
  const demoAnimY = useRef(new Animated.Value(0)).current;
  const disabledRef = useRef(disabled);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  useEffect(() => {
    if (isDemoAnimating) {
      demoAnimY.setValue(0);
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 1.25, duration: 150, useNativeDriver: true }),
        Animated.timing(demoAnimY, {
          toValue: demoDistance,
          duration: 480,
          useNativeDriver: true,
        }),
      ]).start(() => {
        demoAnimY.setValue(0);
        pressScale.setValue(1);
      });
    } else {
      demoAnimY.setValue(0);
      pressScale.setValue(1);
    }
  }, [isDemoAnimating, demoDistance]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        Animated.spring(pressScale, { toValue: 1.2, friction: 4, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        if (gesture.dy > 50) { onDrop(); return; }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    // OUTER: JS-driver pan (translateX/translateY via JS thread)
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        zIndex: isHighlighted || isDemoAnimating ? 999 : 100,
        opacity: disabled && !isHighlighted && !isDemoAnimating ? 0.45 : 1,
      }}
    >
      {/* INNER: native-driver scale bounce & demo slide down (UI thread only) */}
      <Animated.View style={{ transform: [{ scale: pressScale }, { translateY: demoAnimY }] }}>
        <View style={[styles.fruitCircle, isHighlighted && styles.fruitCircleHighlighted]}>
          <Text style={styles.emoji}>{fruit.emoji}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};



// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  cloud: { position: 'absolute', color: '#FFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10 },
  circleButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  backIcon: { fontSize: 28, fontWeight: 'bold', color: '#4E342E' },
  topCenter: { alignItems: 'center' },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#4E342E' },
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
  content: { flex: 1, paddingHorizontal: 20 },
  titleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 4, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  tryStarsRow: { flex: 1, flexDirection: 'row', gap: 2 },
  tryStar: { fontSize: 20 },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, elevation: 2 },
  smallHintText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  masteryBadge: { backgroundColor: '#FF6F00', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'center', marginBottom: 8 },
  masteryBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  instructionCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 20, alignItems: 'center', marginBottom: 12, elevation: 3 },
  owlPlaceholder: { width: 50, height: 50, backgroundColor: '#E0F7FA', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  instructionText: { flex: 1, fontSize: 13, color: '#4E342E', fontWeight: 'bold' },
  equationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  equationNumber: { fontSize: 40, fontWeight: '900' },
  equationNumberHighlighted: {
    transform: [{ scale: 1.35 }],
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  equationSymbol: { fontSize: 32, fontWeight: '900', color: '#263238', marginHorizontal: 4 },
  groupsWrapper: { zIndex: 10 },
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, marginBottom: 8, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  treeIcon: { fontSize: 20, marginRight: 6 },
  groupTitle: { fontSize: 14, fontWeight: 'bold', color: '#90A4AE' },
  fruitRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  fruitCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#EEEEEE' },
  emoji: { fontSize: 28 },
  dropZone: { flex: 1, backgroundColor: '#E1F5FE', borderRadius: 16, borderWidth: 3, borderColor: '#81D4FA', borderStyle: 'dashed', padding: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1, marginTop: 4, minHeight: 80 },
  dropZoneHint: { color: '#81D4FA', fontSize: 14, fontWeight: 'bold', position: 'absolute' },
  droppedFruitWrapper: {
    margin: 4,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#B2EBF2',
    position: 'relative',
    overflow: 'visible',
  },
  droppedFruitCounted: {
    backgroundColor: '#FFF9C4',
    borderWidth: 2.5,
    borderColor: '#FFB300',
    shadowColor: '#FFA000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  countedFruitBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF6F00',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 10,
    elevation: 4,
  },
  countedFruitBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  fruitGlow: { backgroundColor: '#FFD700', borderRadius: 25 },
  dropResetButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFCA28',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 4,
  },
  dropResetIcon: {
    color: '#4E342E',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  dropCounterBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF5252', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  dropCounterText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  answerArea: { backgroundColor: 'transparent', paddingTop: 6, paddingBottom: 4 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 10 },
  optionButton: { width: 58, height: 66, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.1 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 30, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 12 },
  actionBtn: { paddingVertical: 14, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
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
  optionButtonHighlighted: {
    borderWidth: 4,
    borderColor: '#FFD700',
    transform: [{ scale: 1.15 }],
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
