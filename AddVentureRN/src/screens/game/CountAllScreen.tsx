import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, SafeAreaView, Dimensions,
} from 'react-native';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { HintConfirmModal } from '../../components/HintConfirmModal';
import { HintBox } from '../../components/HintBox';
import { PulseView } from '../../components/animations/PulseView';
import { GameTutorialModal } from '../../components/tutorial/GameTutorialModal';
import { DemonstrationBanner } from '../../components/tutorial/DemonstrationBanner';
import { COUNT_ALL_TUTORIAL_STEPS } from '../../components/tutorial/CountAllTutorialContent';
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
  const [demoMessage, setDemoMessage] = useState('');
  const [highlightedFruitId, setHighlightedFruitId] = useState<string | null>(null);
  const [animatingFruitId, setAnimatingFruitId] = useState<string | null>(null);
  const [highlightedOption, setHighlightedOption] = useState<number | null>(null);
  const [isSubmitHighlighted, setIsSubmitHighlighted] = useState(false);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);

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

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(() => {
    return !GameManager.getInstance().saveSystem.hasSeenTutorial('COUNT_ALL');
  });

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

  useEffect(() => {
    loadNewProblem(showTutorial);

    if (!showTutorial) {
      AudioManager.speak('Count All! Help Oliver gather food! Count and drag the fruits to the basket!', {
        rate: 0.9,
        pitch: 1.3,
      });
    }
  }, [navigation]);

  const handleCloseTutorial = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    const gm = GameManager.getInstance();
    if (dontShowAgain) {
      await gm.saveSystem.markTutorialSeen('COUNT_ALL', true);
    }
    resetTimer(gm.sessionTimerLimit);
    AudioManager.speak('Count All! Help Oliver gather food! Count and drag the fruits to the basket!', {
      rate: 0.9,
      pitch: 1.3,
    });
  };

  const handleOpenTutorial = () => {
    AudioManager.stopSpeech();
    setShowTutorial(true);
  };

  const resetTimer = (limit: number) => {
    setTimeLeft(limit);
  };

  // Timer only runs when gameplay is actively running (not in tutorial or modals)
  useEffect(() => {
    if (showTutorial || isDemonstrating || showGreatJob || showFiveStreak || showIncorrectModal || !problem) {
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
  }, [showTutorial, isDemonstrating, showGreatJob, showFiveStreak, showIncorrectModal, problem]);

  useEffect(() => {
    if (timeLeft === 0 && !showTutorial && !isDemonstrating && !showGreatJob && !showFiveStreak && !showIncorrectModal && problem && selectedAnswer === null) {
      handleTimeUp();
    }
  }, [timeLeft, showTutorial, isDemonstrating, showGreatJob, showFiveStreak, showIncorrectModal, problem, selectedAnswer]);

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
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setActiveHint(null);
    setCurrentTry(1);
    setJustMastered(false);
    resetTimer(gm.sessionTimerLimit);

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      opts.add(Math.floor(Math.random() * 18) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));

    if (isMastery && !silent) {
      AudioManager.stopSpeech();
      setTimeout(() => {
        AudioManager.speak(`Keep going! Practice makes perfect. Count all the fruits!`, { rate: 0.9, pitch: 1.3 });
      }, 300);
    }
  };

  const handleDrop = (fruitId: string) => {
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
          AudioManager.speak(droppedCount.toString(), { rate: 0.95, pitch: 1.4 });
        }
        AudioManager.speak('How many fruits in all?', { rate: 0.95, pitch: 1.4 });
      } else if (verboseMode) {
        AudioManager.speak(droppedCount.toString(), { rate: 0.95, pitch: 1.4 });
      }
      return next;
    });
  };

  const resetDroppedFruits = () => {
    setFruits(prev => prev.map(fruit => ({ ...fruit, dropped: false })));
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    AudioManager.stopSpeech();
    AudioManager.speak('Fruits reset.', { rate: 0.95, pitch: 1.25 });
  };

  const handleBasketFruitTap = (fruit: { id: string; emoji: string }) => {
    const profile = GameManager.getInstance().saveSystem.getProfile();
    if (profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD) {
      const position = fruits.filter(f => f.dropped).findIndex(f => f.id === fruit.id) + 1;
      AudioManager.stopSpeech();
      AudioManager.speak(`${position}`, { rate: 0.9, pitch: 1.3 });
    }

    // Bounce animation
    const tapAnim = fruitTapAnims.current[fruit.id];
    const glowAnim = fruitGlowAnims.current[fruit.id];
    if (tapAnim) {
      Animated.sequence([
        Animated.spring(tapAnim, { toValue: 1.45, friction: 3, useNativeDriver: true }),
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

  const waitMs = (ms: number) => new Promise(res => setTimeout(res, ms));

  const startAutomatedDemonstration = async (isTimeout = false) => {
    if (!problem) return;
    setIsDemonstrating(true);
    isDemoCancelled.current = false;

    // Reset fruits back to tree so demo starts clean
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);

    setDemoMessage(`Watch Oliver! Let's count Tree 1 and Tree 2 together!`);

    await AudioManager.speakAsync(`Watch Oliver count! Tree 1 has ${problem.num1}, and Tree 2 has ${problem.num2}. Let's count all of them!`, {
      rate: 0.92,
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

      await AudioManager.speakAsync(`${currentCount}`, { rate: 0.95, pitch: 1.35 });
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

      await AudioManager.speakAsync(`${currentCount}`, { rate: 0.95, pitch: 1.35 });
      await waitMs(250);
    }

    if (isDemoCancelled.current) return;
    setDemoMessage(`All fruits in the basket! Total is ${problem.correctAnswer}!`);
    await AudioManager.speakAsync(`We counted ${problem.correctAnswer} fruits in all! Now let's pick ${problem.correctAnswer}!`, {
      rate: 0.92,
      pitch: 1.3,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Highlight the correct answer option button
    setDemoMessage(`Tap the number ${problem.correctAnswer}!`);
    setHighlightedOption(problem.correctAnswer);
    setSelectedAnswer(problem.correctAnswer);

    await AudioManager.speakAsync(`${problem.correctAnswer}!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Highlight the Submit button
    setDemoMessage(`Tap Submit to finish!`);
    setIsSubmitHighlighted(true);

    await AudioManager.speakAsync(`Tap Submit!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    setDemoMessage(`🎯 Now it's your turn! Drag the fruits to count!`);
    await AudioManager.speakAsync(`Now it's your turn! You can do it!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    endDemonstration();
  };

  const endDemonstration = () => {
    isDemoCancelled.current = true;
    setIsDemonstrating(false);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);
    setCurrentTry(prev => prev + 1);

    // Reset fruits back to tree for the learner
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
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
    if (!problem || hintsRemaining <= 0) return;
    const gm = GameManager.getInstance();
    const hint = gm.getHint(problem);
    setActiveHint(hint);
    gm.consumeSessionHint().then(setHintsRemaining);
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
  const isGroup1Finished = fruits.filter(f => f.group === 1 && !f.dropped).length === 0;
  const profile = GameManager.getInstance().saveSystem.getProfile();
  const showRunningCounter = profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];
  const masteryProgress = GameManager.getInstance().getMasteryProgress();
  const displayedActivityCount = Math.min(activityCount + 1, MAX_ACTIVITIES_PER_SESSION);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      {isDemonstrating && (
        <DemonstrationBanner
          message={demoMessage}
          onSkip={endDemonstration}
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
          <TimerBar timeLeft={timeLeft} totalTime={GameManager.getInstance().sessionTimerLimit} />
          <Text style={styles.activityProgress}>{displayedActivityCount}/{MAX_ACTIVITIES_PER_SESSION}</Text>
        </View>

        <View style={styles.badgesContainer}>
          <TouchableOpacity onPress={handleOpenTutorial} style={styles.helpCircleButton} activeOpacity={0.8}>
            <Text style={styles.helpIcon}>❓</Text>
          </TouchableOpacity>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ {profile.totalStars}</Text>
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
                !showTutorial &&
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
            Count and drag the fruits to the drop zone. You can submit any time!
          </Text>
        </View>
        <HintBox text={activeHint} onDismiss={() => setActiveHint(null)} />

        {/* Equation */}
        <View style={styles.equationContainer}>
          <Text style={[styles.equationNumber, { color: '#FF5252' }]}>{problem.num1}</Text>
          <Text style={styles.equationSymbol}> + </Text>
          <Text style={[styles.equationNumber, { color: '#00BFA5' }]}>{problem.num2}</Text>
          <Text style={styles.equationSymbol}> = </Text>
          <Text style={[styles.equationNumber, { color: '#FFCA28' }]}>?</Text>
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
                  isHighlighted={highlightedFruitId === fruit.id}
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
                  isHighlighted={highlightedFruitId === fruit.id}
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
              const tapAnim = fruitTapAnims.current[fruit.id] ?? new Animated.Value(1);
              const glowAnim = fruitGlowAnims.current[fruit.id] ?? new Animated.Value(0);
              const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
              return (
                <TouchableOpacity key={fruit.id} onPress={() => handleBasketFruitTap(fruit)} activeOpacity={0.8}>
                  <Animated.View style={[styles.droppedFruitWrapper, { transform: [{ scale: tapAnim }] }]}>
                    <Text style={styles.emoji}>{fruit.emoji}</Text>
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

      {/* Tutorial Modal */}
      <GameTutorialModal
        visible={showTutorial}
        gameTitle="Count All"
        steps={COUNT_ALL_TUTORIAL_STEPS}
        onClose={handleCloseTutorial}
      />

      {/* 5-Streak Independence Reward Modal */}
      <FiveStreakModal
        visible={showFiveStreak}
        onClose={handleCloseFiveStreak}
      />

      {/* Incorrect Feedback Modal -> Leads to Error Tutorial */}
      <IncorrectModal
        visible={showIncorrectModal}
        isTimeout={isTimeoutError}
        userAnswer={lastWrongAnswer}
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
  droppedFruitWrapper: { margin: 3, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, overflow: 'hidden' },
  fruitGlow: { backgroundColor: '#FFD700', borderRadius: 24 },
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
});
