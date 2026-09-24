import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, SafeAreaView, Dimensions, ScrollView, Modal,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { HintConfirmModal } from '../../components/HintConfirmModal';
import { HintBox } from '../../components/HintBox';
import { PulseView } from '../../components/animations/PulseView';
import { GameTutorialModal } from '../../components/tutorial/GameTutorialModal';
import { DemonstrationBanner } from '../../components/tutorial/DemonstrationBanner';
import { COUNT_ON_TUTORIAL_STEPS } from '../../components/tutorial/CountOnTutorialContent';
import { FiveStreakModal } from '../../components/FiveStreakModal';
import { OliverSpeechBalloon } from '../../components/OliverSpeechBalloon';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import { TimerBar } from '../../components/TimerBar';
import { AudioManager } from '../../core/AudioManager';

const { width, height } = Dimensions.get('window');
const sectionWidth = width - 24;

type Props = NativeStackScreenProps<RootStackParamList, 'CountOn'>;

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];
const HINT_DISABLE_THRESHOLD = 5;
const MAX_WRONG_TRIES = 4;

export default function CountOnScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [baseN, setBaseN] = useState(0);
  const [extraM, setExtraM] = useState(0);
  const [fruits, setFruits] = useState<{ id: string; emoji: string; dropped: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(() => GameManager.getInstance().getSessionHintsRemaining());
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [highlightedFruitId, setHighlightedFruitId] = useState<string | null>(null);
  const [animatingFruitId, setAnimatingFruitId] = useState<string | null>(null);
  const [highlightedViewBasket, setHighlightedViewBasket] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState<number | null>(null);
  const [isSubmitHighlighted, setIsSubmitHighlighted] = useState(false);
  const [isBasketHighlighted, setIsBasketHighlighted] = useState(false);
  const [basketFeedback, setBasketFeedback] = useState<string | null>(null);
  const [demoCountingIndex, setDemoCountingIndex] = useState<number | null>(null);
  const [demoMaxCountedIndex, setDemoMaxCountedIndex] = useState<number | null>(null);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);

  const isDemoCancelled = useRef(false);

  // Layout measurement refs for exact coordinate targeting
  const contentYRef = useRef(0);
  const basketLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const canopyLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const viewBasketBtnLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const zoomModalCardLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const zoomOptionsLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const zoomSubmitBtnLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Zoomed-in basket overlay (Sketch 1)
  const [showViewBasket, setShowViewBasket] = useState(false);

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(() => {
    return !GameManager.getInstance().saveSystem.hasSeenTutorial('COUNT_ON');
  });

  const [currentTry, setCurrentTry] = useState(1);
  const [activityCount, setActivityCount] = useState(0);
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  const [justMastered, setJustMastered] = useState(false);
  const [showFiveStreak, setShowFiveStreak] = useState(false);

  const currentProblemRef = useRef<Problem | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHintAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadNewProblem(showTutorial);
    if (!showTutorial) {
      AudioManager.speak('Count On! Oliver already has some fruits. Drag fruits to his basket, then tap View Basket!', {
        rate: 0.9, pitch: 1.3,
      });
    }
  }, []);

  const handleCloseTutorial = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    const gm = GameManager.getInstance();
    if (dontShowAgain) {
      await gm.saveSystem.markTutorialSeen('COUNT_ON', true);
    }
    setTimeLeft(gm.sessionTimerLimit);
    AudioManager.speak('Count On! Drag fruits from the tree to Oliver\'s basket, then tap View Basket!', {
      rate: 0.9, pitch: 1.3,
    });
  };

  const handleOpenTutorial = () => {
    AudioManager.stopSpeech();
    setShowTutorial(true);
  };

  // Timer only runs during active gameplay
  useEffect(() => {
    if (showTutorial || isDemonstrating || showGreatJob || showFiveStreak || !problem) {
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
  }, [showTutorial, isDemonstrating, showGreatJob, showFiveStreak, problem]);

  useEffect(() => {
    if (timeLeft === 0 && !showTutorial && !isDemonstrating && !showGreatJob && !showFiveStreak && problem && selectedAnswer === null) {
      handleTimeUp();
    }
  }, [timeLeft, showTutorial, isDemonstrating, showGreatJob, showFiveStreak, problem, selectedAnswer]);

  const handleTimeUp = async () => {
    if (!problem || isDemonstrating) return;
    const gm = GameManager.getInstance();
    const responseTimeMs = gm.sessionTimerLimit * 1000;
    await gm.submitAnswer(false, currentTry, responseTimeMs, problem, -1, false);

    if (isMasteryProblem) {
      gm.recordMasteryIncorrect(problem);
    } else {
      gm.addToMasteryQueue(problem);
    }
    setShowViewBasket(false);
    startAutomatedDemonstration(true);
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

    const base = Math.max(p.num1, p.num2);
    const extra = Math.min(p.num1, p.num2);
    setBaseN(base);
    setExtraM(extra);
    setProblem(p);

    const pCount = gm.getSessionActivityCount();
    setActivityCount(pCount);

    const profile = gm.saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD);

    // "Fruits here" area always has 10 fruits across the branches
    const emojiType = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const newFruits: { id: string; emoji: string; dropped: boolean }[] = Array.from(
      { length: 10 },
      (_, i) => ({ id: `co_fruit_${i}`, emoji: emojiType, dropped: false })
    );

    setFruits(newFruits);
    setSelectedAnswer(null);
    setActiveHint(null);
    setCurrentTry(1);
    setTimeLeft(gm.sessionTimerLimit);
    setJustMastered(false);
    setShowViewBasket(false);
    setBasketFeedback(null);

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      opts.add(Math.floor(Math.random() * 18) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));

    if (!silent) {
      AudioManager.stopSpeech();
      setTimeout(() => {
        const msg = isMastery
          ? `Keep going! Oliver has ${base} fruits. Count on ${extra} more!`
          : `Oliver has ${base} fruits! Drag fruits to his basket to add ${extra} more!`;
        AudioManager.speak(msg, { rate: 0.95, pitch: 1.4 });
      }, 300);
    }
  };

  // Drag fruit from tree into Oliver's basket
  const handleDrop = (fruitId: string) => {
    setBasketFeedback(null);
    setFruits(prev => {
      const next = prev.map(f => f.id === fruitId ? { ...f, dropped: true } : f);
      const droppedCount = next.filter(f => f.dropped).length;
      const currentTotal = baseN + droppedCount;

      const profile = GameManager.getInstance().saveSystem.getProfile();
      if (profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD) {
        AudioManager.stopSpeech();
        AudioManager.speak(`${currentTotal}`, { rate: 0.95, pitch: 1.4 });
      }
      return next;
    });
  };

  // Tap dropped fruit in basket to return to tree
  const handleRemoveFruit = (fruitId: string) => {
    setBasketFeedback(null);
    setFruits(prev => {
      const next = prev.map(f => f.id === fruitId ? { ...f, dropped: false } : f);
      const droppedCount = next.filter(f => f.dropped).length;
      const currentTotal = baseN + droppedCount;

      const profile = GameManager.getInstance().saveSystem.getProfile();
      if (profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD) {
        AudioManager.stopSpeech();
        AudioManager.speak(`${currentTotal}`, { rate: 0.95, pitch: 1.3 });
      }
      return next;
    });
  };

  // Reset all dragged fruits back to tree
  const resetDroppedFruits = () => {
    setBasketFeedback(null);
    setFruits(prev => prev.map(fruit => ({ ...fruit, dropped: false })));
    setSelectedAnswer(null);
    AudioManager.stopSpeech();
    AudioManager.speak('Fruits reset to tree.', { rate: 0.95, pitch: 1.25 });
  };

  // Open "View Basket" modal — checks that learner added the right number of fruits first!
  const handleOpenViewBasket = () => {
    const droppedCount = fruits.filter(f => f.dropped).length;
    if (droppedCount !== extraM) {
      let friendlyVoice = '';
      let friendlyText = '';
      if (droppedCount === 0) {
        friendlyVoice = `Oliver needs ${extraM} more ${extraM === 1 ? 'fruit' : 'fruits'}! Drag ${extraM} from the tree into his basket first!`;
        friendlyText = `Oliver needs ${extraM} more ${extraM === 1 ? 'fruit' : 'fruits'}! Drag them from the tree first.`;
      } else if (droppedCount < extraM) {
        const needed = extraM - droppedCount;
        friendlyVoice = `Almost there! You added ${droppedCount}, but Oliver needs ${extraM} fruits. Add ${needed} more from the tree!`;
        friendlyText = `Almost! You added ${droppedCount}, but Oliver needs ${extraM}. Add ${needed} more!`;
      } else {
        friendlyVoice = `Oops! That's too many! Oliver only needs ${extraM} fruits, but you added ${droppedCount}. Tap a fruit in his basket to put it back!`;
        friendlyText = `Too many! Oliver only needs ${extraM} fruits. Tap a fruit in his basket to return it.`;
      }

      setBasketFeedback(friendlyText);
      AudioManager.stopSpeech();
      AudioManager.speak(friendlyVoice, { rate: 0.92, pitch: 1.35 });
      return;
    }

    setBasketFeedback(null);
    setShowViewBasket(true);
    AudioManager.stopSpeech();
    AudioManager.speak('How many fruits in all? Count and choose your answer!', {
      rate: 0.95, pitch: 1.35,
    });
  };

  // Submit Answer from Zoomed Basket view
  const submitAnswer = async () => {
    if (selectedAnswer === null || !problem) return;
    const gm = GameManager.getInstance();
    const isCorrect = selectedAnswer === problem.correctAnswer;
    const responseTimeMs = (gm.sessionTimerLimit - timeLeft) * 1000;
    const { starsEarned } = await gm.submitAnswer(
      isCorrect, currentTry, responseTimeMs, problem, selectedAnswer, isCorrect
    );

    if (isCorrect) {
      let wasMastered = false;
      if (isMasteryProblem) wasMastered = gm.recordMasteryCorrect(problem);
      const newCount = gm.getSessionActivityCount();
      setActivityCount(newCount);
      setGreatJobStars(starsEarned);
      setJustMastered(wasMastered);
      setShowViewBasket(false);
      setShowGreatJob(true);
    } else {
      if (isMasteryProblem) gm.recordMasteryIncorrect(problem);
      setShowViewBasket(false);
      startAutomatedDemonstration(false);
    }
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

  const waitMs = (ms: number) => new Promise(res => setTimeout(res, ms));

  const startAutomatedDemonstration = async (isTimeout = false) => {
    if (!problem) return;
    setIsDemonstrating(true);
    isDemoCancelled.current = false;

    // Reset fruits back to tree so demo starts clean
    setShowViewBasket(false);
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedAnswer(null);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedViewBasket(false);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);
    setIsBasketHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);

    if (isTimeout) {
      setDemoMessage(`Time's up! Let's watch Oliver show you how to count on!`);
      await AudioManager.speakAsync(`Time's up! That's okay, let's watch Oliver show us how to count on!`, {
        rate: 0.95,
        pitch: 1.3,
      });
      await waitMs(400);
      if (isDemoCancelled.current) return;
    } else {
      setDemoMessage(`Not quite, but nice try! Let's watch Oliver show you how to count on!`);
      await AudioManager.speakAsync(`Not quite, but good try! Let's watch Oliver show us how to count on!`, {
        rate: 0.95,
        pitch: 1.3,
      });
      await waitMs(400);
      if (isDemoCancelled.current) return;
    }

    setDemoMessage(`Oliver already has ${baseN} fruits. Keep ${baseN} in your head!`);
    setIsBasketHighlighted(true);

    await AudioManager.speakAsync(`Watch Oliver count on! Oliver already has ${baseN} in his basket. Keep ${baseN} in your head!`, {
      rate: 0.92,
      pitch: 1.25,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;
    setIsBasketHighlighted(false);

    // Drag extra fruits from canopy to basket with highlight and gliding animation
    for (let i = 0; i < extraM; i++) {
      if (isDemoCancelled.current) return;
      const runningCount = baseN + i + 1;
      const fruitId = `co_fruit_${i}`;

      setDemoMessage(`Tree fruit #${i + 1}: Count on to ${runningCount}!`);
      setHighlightedFruitId(fruitId);
      setAnimatingFruitId(fruitId);

      // Slide-up animation into Oliver's basket
      await waitMs(480);
      if (isDemoCancelled.current) return;

      // Transfer into basket
      setFruits(prev => prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f)));
      setHighlightedFruitId(null);
      setAnimatingFruitId(null);

      await AudioManager.speakAsync(`${runningCount}`, { rate: 0.95, pitch: 1.35 });
      await waitMs(250);
    }

    if (isDemoCancelled.current) return;
    setDemoMessage(`We landed on ${problem.correctAnswer}! Now tap View Basket!`);
    await AudioManager.speakAsync(`${baseN} plus ${extraM} equals ${problem.correctAnswer}! Let's open the basket and double-check all fruits!`, {
      rate: 0.92,
      pitch: 1.3,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Highlight View Basket button
    setDemoMessage(`Tap View Basket!`);
    setHighlightedViewBasket(true);
    await waitMs(1000);
    if (isDemoCancelled.current) return;

    setHighlightedViewBasket(false);
    setShowViewBasket(true);

    await waitMs(800);
    if (isDemoCancelled.current) return;

    // Inside Modal: Count all fruits first to double check how much is the total!
    setDemoMessage(`Inside Oliver's basket! Let's count all the fruits to double-check!`);
    await AudioManager.speakAsync(`We are inside the basket! Let's count all the fruits to double-check our total!`, {
      rate: 0.92,
      pitch: 1.3,
    });
    await waitMs(350);
    if (isDemoCancelled.current) return;

    // Count each fruit in the basket one by one
    const totalToCount = problem.correctAnswer;
    for (let c = 0; c < totalToCount; c++) {
      if (isDemoCancelled.current) return;
      const countNum = c + 1;
      setDemoCountingIndex(c);
      setDemoMaxCountedIndex(c);
      setDemoMessage(`Double-checking: Fruit #${countNum}!`);

      await AudioManager.speakAsync(`${countNum}`, { rate: 0.95, pitch: 1.35 });
      await waitMs(250);
    }

    if (isDemoCancelled.current) return;
    setDemoCountingIndex(null);

    setDemoMessage(`Double-checked! We have ${problem.correctAnswer} fruits in all!`);
    await AudioManager.speakAsync(`Double-checked! There are ${problem.correctAnswer} fruits in all! Now let's pick ${problem.correctAnswer}!`, {
      rate: 0.92,
      pitch: 1.3,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Inside Modal: Highlight the correct answer option
    setDemoMessage(`Tap the number ${problem.correctAnswer}!`);
    setHighlightedOption(problem.correctAnswer);
    setSelectedAnswer(problem.correctAnswer);

    await AudioManager.speakAsync(`${problem.correctAnswer}!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    // Inside Modal: Highlight Submit button
    setDemoMessage(`Tap Submit to finish!`);
    setIsSubmitHighlighted(true);

    await AudioManager.speakAsync(`Tap Submit!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    if (isDemoCancelled.current) return;

    setDemoMessage(`🎯 Now it's your turn! Drag ${extraM} fruits to Oliver!`);
    await AudioManager.speakAsync(`Now it's your turn! You can do it!`, { rate: 0.95, pitch: 1.3 });
    await waitMs(400);
    endDemonstration();
  };

  const endDemonstration = () => {
    isDemoCancelled.current = true;
    setShowViewBasket(false);
    setIsDemonstrating(false);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setHighlightedViewBasket(false);
    setHighlightedOption(null);
    setIsSubmitHighlighted(false);
    setIsBasketHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setCurrentTry(prev => prev + 1);

    // Reset fruits back to tree for the learner
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
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
      strategy: 'COUNT_ON',
      incorrectProblems: [],
    });
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const droppedFruits = fruits.filter(f => f.dropped);
  const totalBasketFruitsCount = baseN + droppedFruits.length;
  const fruitEmojiType = fruits[0]?.emoji ?? '🍎';
  const profile = GameManager.getInstance().saveSystem.getProfile();
  const masteryProgress = GameManager.getInstance().getMasteryProgress();
  const showClues = profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD;

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];
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

      <Text style={[styles.cloud, { top: '8%', left: '-5%', fontSize: 80, opacity: 0.5 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '22%', right: '-8%', fontSize: 90, opacity: 0.5 }]}>☁️</Text>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton} activeOpacity={0.8}>
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
        {/* Header Title Row */}
        <View style={styles.titleContainer}>
          <View style={styles.tryStarsRow}>
            {[1, 2, 3].map((t, i) => (
              <Text key={i} style={[styles.tryStar, { opacity: t >= currentTry ? 1 : 0.25 }]}>⭐</Text>
            ))}
          </View>
          <Text style={[styles.title, { flex: 2, textAlign: 'center' }]}>Count On</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
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
        </View>

        {isMasteryProblem && (
          <View style={styles.masteryBadge}>
            <Text style={styles.masteryBadgeText}>🔥 Keep Going! Practice Round</Text>
          </View>
        )}

        <View style={[styles.instructionCard, basketFeedback && styles.instructionCardFeedback]}>
          <View style={styles.owlPlaceholder}>
            <Text style={{ fontSize: 32 }}>🦉</Text>
            <OliverSpeechBalloon
              active={
                !showTutorial &&
                !isDemonstrating &&
                !showGreatJob &&
                !showFiveStreak &&
                !showHintConfirm &&
                !showViewBasket &&
                problem !== null &&
                selectedAnswer === null
              }
            />
          </View>
          <Text style={[styles.instructionText, basketFeedback && styles.instructionTextFeedback]}>
            {basketFeedback || `Oliver already has ${baseN} fruits. Drag fruits from the tree to his basket!`}
          </Text>
        </View>
        <HintBox text={activeHint} onDismiss={() => setActiveHint(null)} />

        {/* ═══════════════════════════════════════════════════════════════════
            1. TOP EQUATION BANNER (Sketch 2: ex. 4 + 2 = ?)
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.equationContainer}>
          <View style={[styles.equationPill, { backgroundColor: '#EDE7F6', borderColor: '#7E57C2' }]}>
            <Text style={[styles.equationNumber, { color: '#512DA8' }]}>{baseN}</Text>
          </View>
          <Text style={styles.equationSymbol}>+</Text>
          <View style={[styles.equationPill, { backgroundColor: '#E0F2F1', borderColor: '#00897B' }]}>
            <Text style={[styles.equationNumber, { color: '#00796B' }]}>{extraM}</Text>
          </View>
          <Text style={styles.equationSymbol}>=</Text>
          <View
            style={[
              styles.equationPill,
              selectedAnswer !== null
                ? { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }
                : { backgroundColor: '#FFFFFF', borderColor: '#FBC02D', borderStyle: 'dashed' },
            ]}
          >
            <Text
              style={[
                styles.equationNumber,
                { color: selectedAnswer !== null ? '#F57F17' : '#BDBDBD' },
              ]}
            >
              {selectedAnswer !== null ? selectedAnswer : '?'}
            </Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            2. CENTERED BASKET SECTION (Large centered basket to fit all fruits)
        ═══════════════════════════════════════════════════════════════════ */}
        <View
          style={styles.basketCenterContainer}
          onLayout={e => {
            basketLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          <View style={[styles.oliverBasketWrapper, isBasketHighlighted && styles.oliverBasketHighlighted]}>
            <WickerBasketCard
              width={Math.min(sectionWidth, 290)}
              height={165}
              countBadge={showClues ? totalBasketFruitsCount : undefined}
              onReset={droppedFruits.length > 0 ? resetDroppedFruits : undefined}
            >
              {/* Inside basket: Fixed fruits + Dropped fruits */}
              <View style={styles.basketFruitsInsideContainer}>
                {/* Starting Fixed Number Fruits */}
                {Array.from({ length: baseN }).map((_, i) => (
                  <View key={`fixed_${i}`} style={styles.basketFixedFruitItem}>
                    <Text style={styles.basketFruitEmoji}>{fruitEmojiType}</Text>
                  </View>
                ))}

                {/* Added / Dropped Fruits */}
                {droppedFruits.map((f, idx) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => handleRemoveFruit(f.id)}
                    disabled={isDemonstrating}
                    activeOpacity={0.7}
                  >
                    <View style={styles.basketAddedFruitItem}>
                      <Text style={styles.basketFruitEmoji}>{f.emoji}</Text>
                      {showClues && (
                        <View style={styles.addedBadgeDot}>
                          <Text style={styles.addedBadgeText}>+{idx + 1}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </WickerBasketCard>

            <View style={styles.basketLabelRow}>
              <View style={styles.owlAvatarSmall}>
                <Text style={{ fontSize: 18 }}>🦉</Text>
              </View>
              <Text style={styles.basketUnderLabel}>
                Oliver's Basket{showClues ? ` (${totalBasketFruitsCount} fruits)` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            3. "FRUITS HERE!" CANOPY AREA
        ═══════════════════════════════════════════════════════════════════ */}
        <View
          style={styles.canopySection}
          onLayout={e => {
            canopyLayoutRef.current = e.nativeEvent.layout;
          }}
        >
          <View style={styles.canopyTitleBadge}>
            <Text style={styles.canopyTitleText}>* Fruits Here! *</Text>
          </View>

          <View style={styles.canopyContainer}>
            {/* Lush SVG Leaf Clusters */}
            <Svg width={sectionWidth} height={135} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="canopyGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#81C784" />
                  <Stop offset="0.7" stopColor="#4CAF50" />
                  <Stop offset="1" stopColor="#2E7D32" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx={sectionWidth * 0.18} cy={65} r={52} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.82} cy={65} r={52} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.36} cy={50} r={62} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.64} cy={50} r={62} fill="url(#canopyGrad)" />
              <Circle cx={sectionWidth * 0.50} cy={40} r={65} fill="url(#canopyGrad)" />
            </Svg>

            {/* 10 Hanging Fruits in 2 Rows of 5 */}
            <View style={styles.canopyFruitsGrid}>
              <View style={styles.fruitRow}>
                {fruits.slice(0, 5).map((fruit, idx) => {
                  const col = idx;
                  const gridWidth = sectionWidth * 0.9;
                  const colSpacing = gridWidth / 5;
                  const fruitX = (sectionWidth - gridWidth) / 2 + (col + 0.5) * colSpacing;
                  const demoTargetX = (sectionWidth / 2) - fruitX;
                  const demoTargetY = -180;
                  return (
                    <DraggableFruit
                      key={`${fruit.id}_try${currentTry}`}
                      fruit={fruit}
                      disabled={isDemonstrating}
                      onDrop={() => handleDrop(fruit.id)}
                      isHighlighted={highlightedFruitId === fruit.id}
                      isDemoAnimating={animatingFruitId === fruit.id}
                      demoTargetX={demoTargetX}
                      demoTargetY={demoTargetY}
                    />
                  );
                })}
              </View>
              <View style={styles.fruitRow}>
                {fruits.slice(5, 10).map((fruit, idx) => {
                  const col = idx;
                  const gridWidth = sectionWidth * 0.9;
                  const colSpacing = gridWidth / 5;
                  const fruitX = (sectionWidth - gridWidth) / 2 + (col + 0.5) * colSpacing;
                  const demoTargetX = (sectionWidth / 2) - fruitX;
                  const demoTargetY = -215;
                  return (
                    <DraggableFruit
                      key={`${fruit.id}_try${currentTry}`}
                      fruit={fruit}
                      disabled={isDemonstrating}
                      onDrop={() => handleDrop(fruit.id)}
                      isHighlighted={highlightedFruitId === fruit.id}
                      isDemoAnimating={animatingFruitId === fruit.id}
                      demoTargetX={demoTargetX}
                      demoTargetY={demoTargetY}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            4. "VIEW BASKET" BUTTON (Sketch 2)
        ═══════════════════════════════════════════════════════════════════ */}
        {basketFeedback && (
          <View style={styles.viewBasketFeedbackBubble}>
            <Text style={styles.viewBasketFeedbackText}>⚠️ {basketFeedback}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.viewBasketActionBtn,
            highlightedViewBasket && styles.viewBasketBtnHighlighted,
            isDemonstrating && !highlightedViewBasket && { opacity: 0.6 },
          ]}
          onLayout={e => {
            viewBasketBtnLayoutRef.current = e.nativeEvent.layout;
          }}
          onPress={handleOpenViewBasket}
          disabled={isDemonstrating}
          activeOpacity={0.8}
        >
          <Text style={styles.viewBasketActionText}>🧺 View Basket</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          5. ZOOMED-IN BASKET MODAL (Top-Down View of Basket to Show All Fruits)
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showViewBasket} animationType="fade" transparent={true}>
        <View style={styles.zoomModalBackdrop}>
          <View
            style={styles.zoomModalCard}
            onLayout={e => {
              zoomModalCardLayoutRef.current = e.nativeEvent.layout;
            }}
          >
            {/* 'X' Close Button in Top-Right Corner */}
            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setShowViewBasket(false)}
              disabled={isDemonstrating}
              activeOpacity={0.75}
            >
              <Text style={styles.zoomCloseBtnText}>✕</Text>
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.zoomScrollContent}
              showsVerticalScrollIndicator={false}
              style={{ width: '100%' }}
            >
              {/* Modal Header */}
              <View style={styles.zoomHeaderRow}>
                <Text style={styles.zoomModalTitle}>🧺 Inside Oliver's Basket</Text>
                <Text style={styles.zoomModalSubtitle}>Tap each fruit to count together!</Text>
              </View>

              {/* Vertically Elongated Top-View Basket */}
              <View style={styles.zoomBasketArea}>
                <TopViewBasketCard
                  width={Math.min(sectionWidth, 300)}
                  height={260}
                  countBadge={showClues ? totalBasketFruitsCount : undefined}
                >
                  <View style={styles.zoomFruitsCluster}>
                    {/* All basket fruits (starting + added) */}
                    {Array.from({ length: totalBasketFruitsCount }).map((_, i) => {
                      const isCompact = totalBasketFruitsCount > 10;
                      const isDemoHighlighted = demoCountingIndex === i;
                      const showIndexTag = showClues || (isDemonstrating && demoMaxCountedIndex !== null && i <= demoMaxCountedIndex);
                      return (
                        <TouchableOpacity
                          key={i}
                          activeOpacity={0.7}
                          disabled={isDemonstrating}
                          onPress={() => {
                            if (showClues) {
                              AudioManager.stopSpeech();
                              AudioManager.speak(`${i + 1}`, { rate: 0.9, pitch: 1.3 });
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.zoomFruitBadgeWrap,
                              isCompact && styles.zoomFruitBadgeWrapCompact,
                              isDemoHighlighted && styles.zoomFruitHighlighted,
                            ]}
                          >
                            <Text style={[styles.zoomFruitEmoji, isCompact && styles.zoomFruitEmojiCompact]}>
                              {fruitEmojiType}
                            </Text>
                            {showIndexTag && (
                              <View style={styles.zoomFruitIndexTag}>
                                <Text style={styles.zoomFruitIndexText}>{i + 1}</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </TopViewBasketCard>
              </View>

              {/* Question Text: "How many fruits in all?" */}
              <Text style={styles.zoomQuestionText}>How many fruits in all?</Text>

              {/* 5 Choice Boxes: [ ] [ ] [ ] [ ] [ ] */}
              <View
                style={styles.zoomOptionsRow}
                onLayout={e => {
                  zoomOptionsLayoutRef.current = e.nativeEvent.layout;
                }}
              >
                {options.map((opt, index) => {
                  const isHighlighted = highlightedOption === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.zoomOptionBox,
                        { backgroundColor: optionColors[index % optionColors.length] },
                        selectedAnswer === opt && styles.zoomOptionBoxSelected,
                        isHighlighted && styles.zoomOptionBoxHighlighted,
                      ]}
                      onPress={() => {
                        setSelectedAnswer(opt);
                        AudioManager.stopSpeech();
                        AudioManager.speak(`${opt}`, { rate: 0.9, pitch: 1.3 });
                      }}
                      disabled={isDemonstrating}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.zoomOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* [ SUBMIT ] Button */}
              <TouchableOpacity
                style={[
                  styles.zoomSubmitBtn,
                  (selectedAnswer === null || (isDemonstrating && !isSubmitHighlighted)) && styles.zoomSubmitBtnDisabled,
                  isSubmitHighlighted && styles.zoomSubmitBtnHighlighted,
                ]}
                onLayout={e => {
                  zoomSubmitBtnLayoutRef.current = e.nativeEvent.layout;
                }}
                onPress={submitAnswer}
                disabled={selectedAnswer === null || isDemonstrating}
                activeOpacity={0.8}
              >
                <Text style={styles.zoomSubmitBtnText}>SUBMIT ✓</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      <GameTutorialModal
        visible={showTutorial}
        gameTitle="Count On"
        steps={COUNT_ON_TUTORIAL_STEPS}
        onClose={handleCloseTutorial}
      />

      {/* 5-Streak Independence Reward Modal */}
      <FiveStreakModal
        visible={showFiveStreak}
        onClose={handleCloseFiveStreak}
      />
    </SafeAreaView>
  );
}

// ─── Wicker Basket Component with Arched Handle & Weave Pattern ──────────────
interface WickerBasketCardProps {
  width: number;
  height: number;
  countBadge?: number | string;
  onReset?: () => void;
  isZoomed?: boolean;
  children: React.ReactNode;
}

const WickerBasketCard: React.FC<WickerBasketCardProps> = ({
  width: bWidth,
  height: bHeight,
  countBadge,
  onReset,
  isZoomed = false,
  children,
}) => {
  const handleHeight = isZoomed ? 48 : 36;
  const basketBodyHeight = bHeight - handleHeight;

  return (
    <View style={[styles.basketCardContainer, { width: bWidth, height: bHeight }]}>
      {/* SVG Wicker Basket with Handle & Lattice Texture */}
      <Svg width={bWidth} height={bHeight} style={StyleSheet.absoluteFill}>
        {/* Arched Handle */}
        <Path
          d={`M ${bWidth * 0.22} ${handleHeight + 12} ` +
             `C ${bWidth * 0.22} ${handleHeight * 0.15}, ` +
             `${bWidth * 0.78} ${handleHeight * 0.15}, ` +
             `${bWidth * 0.78} ${handleHeight + 12}`}
          stroke="#4E342E"
          strokeWidth={isZoomed ? 8 : 6}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${bWidth * 0.22} ${handleHeight + 12} ` +
             `C ${bWidth * 0.22} ${handleHeight * 0.2}, ` +
             `${bWidth * 0.78} ${handleHeight * 0.2}, ` +
             `${bWidth * 0.78} ${handleHeight + 12}`}
          stroke="#8D6E63"
          strokeWidth={isZoomed ? 4 : 3}
          strokeDasharray="4 3"
          fill="none"
        />

        {/* Basket Body (Trapezoid) */}
        <Path
          d={`M ${bWidth * 0.12} ${handleHeight + 8} ` +
             `L ${bWidth * 0.88} ${handleHeight + 8} ` +
             `L ${bWidth * 0.78} ${bHeight - 4} ` +
             `L ${bWidth * 0.22} ${bHeight - 4} Z`}
          fill="#D7CCC8"
          stroke="#5D4037"
          strokeWidth={3}
        />

        {/* Rim Band */}
        <Rect
          x={bWidth * 0.08}
          y={handleHeight + 2}
          width={bWidth * 0.84}
          height={isZoomed ? 16 : 12}
          rx={4}
          fill="#BCAAA4"
          stroke="#4E342E"
          strokeWidth={2}
        />

        {/* Diagonal Lattice Weave Lines */}
        {[-30, -10, 10, 30, 50, 70].map((offset, i) => (
          <Line
            key={`diag1_${i}`}
            x1={bWidth * 0.2 + offset}
            y1={handleHeight + 14}
            x2={bWidth * 0.45 + offset}
            y2={bHeight - 6}
            stroke="#8D6E63"
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
        ))}
        {[70, 50, 30, 10, -10, -30].map((offset, i) => (
          <Line
            key={`diag2_${i}`}
            x1={bWidth * 0.8 - offset}
            y1={handleHeight + 14}
            x2={bWidth * 0.55 - offset}
            y2={bHeight - 6}
            stroke="#8D6E63"
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
        ))}
      </Svg>

      {/* Inside Fruits Container */}
      <View
        style={[
          styles.basketInsideBowl,
          {
            top: handleHeight + (isZoomed ? 14 : 10),
            width: bWidth * (isZoomed ? 0.76 : 0.82),
            height: basketBodyHeight - (isZoomed ? 20 : 14),
          },
        ]}
      >
        {children}
      </View>

      {/* Count Badge on Basket */}
      {countBadge !== undefined && (
        <View style={styles.basketCountBadgePill}>
          <Text style={styles.basketCountBadgeText}>{countBadge}</Text>
        </View>
      )}

      {/* Reset Button (Main View) */}
      {onReset && (
        <TouchableOpacity style={styles.basketResetCornerBtn} onPress={onReset} activeOpacity={0.75}>
          <Text style={styles.basketResetCornerText}>↻</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Top-View Basket (Vertically elongated top view for View Basket modal) ────
interface TopViewBasketCardProps {
  width: number;
  height: number;
  countBadge?: number | string;
  children: React.ReactNode;
}

const TopViewBasketCard: React.FC<TopViewBasketCardProps> = ({
  width: bWidth,
  height: bHeight,
  countBadge,
  children,
}) => {
  const rx = bWidth / 2;
  const ry = bHeight / 2;

  return (
    <View style={[styles.topBasketContainer, { width: bWidth, height: bHeight }]}>
      {/* SVG Wicker concentric weave texture (vertically elongated ellipse) */}
      <Svg width={bWidth} height={bHeight} style={StyleSheet.absoluteFill}>
        {/* Outer wicker shadow */}
        <Ellipse cx={rx} cy={ry} rx={rx - 2} ry={ry - 2} fill="#5D4037" />

        {/* Outer braided rim */}
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 5}
          ry={ry - 5}
          fill="#D7CCC8"
          stroke="#4E342E"
          strokeWidth="6"
          strokeDasharray="6 4"
        />

        {/* Inner bowl shadow */}
        <Ellipse cx={rx} cy={ry} rx={rx - 12} ry={ry - 12} fill="#A1887F" />

        {/* Concentric weave rings */}
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 16}
          ry={ry - 16}
          fill="#D7CCC8"
          stroke="#8D6E63"
          strokeWidth="2.5"
          strokeDasharray="5 3"
        />
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 28}
          ry={ry - 28}
          fill="#EFEBE9"
          stroke="#5D4037"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <Ellipse
          cx={rx}
          cy={ry}
          rx={rx - 42}
          ry={ry - 42}
          fill="#D7CCC8"
          stroke="#8D6E63"
          strokeWidth="1.5"
        />

        {/* Radial wicker spokes */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x2 = rx + (rx - 14) * Math.cos(rad);
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
              strokeOpacity="0.35"
            />
          );
        })}
      </Svg>

      {/* Inside Fruits Container */}
      <View style={[styles.topBasketInnerBowl, { width: bWidth - 28, height: bHeight - 28 }]}>
        {children}
      </View>

      {/* Count Badge on Basket */}
      {countBadge !== undefined && (
        <View style={styles.topBasketCountBadge}>
          <Text style={styles.topBasketCountBadgeText}>{countBadge}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Draggable Fruit on Tree Branch ──────────────────────────────────────────
const DraggableFruit = ({
  fruit,
  onDrop,
  disabled,
  isHighlighted = false,
  isDemoAnimating = false,
  demoTargetX = 0,
  demoTargetY = -180,
}: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const demoAnimX = useRef(new Animated.Value(0)).current;
  const demoAnimY = useRef(new Animated.Value(0)).current;
  const onDropRef = useRef(onDrop);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!fruit.dropped) {
      pan.setValue({ x: 0, y: 0 });
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
      onStartShouldSetPanResponder: () => !fruit.dropped && !disabledRef.current,
      onMoveShouldSetPanResponder: () => !fruit.dropped && !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        Animated.spring(pressScale, { toValue: 1.25, friction: 4, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        const dragDist = Math.hypot(gesture.dx, gesture.dy);
        // The fruit must actually be dragged towards/into the basket
        if (dragDist > 30 || gesture.dy < -20) {
          onDropRef.current?.();
          return;
        }
        // If released without dragging, spring back to branch
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  if (fruit.dropped) {
    return (
      <View style={styles.hangingPlaceholder}>
        <Text style={styles.placeholderIcon}>🍂</Text>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        zIndex: isHighlighted || isDemoAnimating ? 9999 : 999,
        elevation: 10,
      }}
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
        <View style={[styles.hangingFruitCircle, isHighlighted && styles.fruitCircleHighlighted]}>
          <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  cloud: { position: 'absolute', color: '#FFF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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

  content: { flex: 1, paddingHorizontal: 12, paddingBottom: 16, alignItems: 'center' },
  titleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  tryStarsRow: { flex: 1, flexDirection: 'row', gap: 2 },
  tryStar: { fontSize: 20 },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, elevation: 2 },
  smallHintText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  masteryBadge: { backgroundColor: '#FF6F00', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 3, alignSelf: 'center', marginBottom: 6 },
  masteryBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    width: '100%',
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

  // Equation Banner (Sketch 2: 4 + 2 = ?)
  equationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  equationPill: {
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equationNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  equationSymbol: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3E2723',
    marginHorizontal: 8,
  },

  // Centered Basket Section
  basketCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 4,
  },
  oliverBasketWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BCAAA4',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  owlAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#80CBC4',
  },
  basketUnderLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4E342E',
  },

  // Basket Inner
  basketCardContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketInsideBowl: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  basketFruitsInsideContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 240,
  },
  basketFixedFruitItem: {
    margin: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketAddedFruitItem: {
    position: 'relative',
    margin: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketFruitEmoji: {
    fontSize: 24,
  },
  addedBadgeDot: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#FF6F00',
    borderRadius: 7,
    paddingHorizontal: 3.5,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  addedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFF',
  },
  basketCountBadgePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#E65100',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFF',
    elevation: 3,
  },
  basketCountBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  basketResetCornerBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  basketResetCornerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },

  // Canopy Section (Sketch 2: * Fruits Here! * with 10 fruits)
  canopySection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
    zIndex: 50,
  },
  canopyTitleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    elevation: 2,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#81C784',
  },
  canopyTitleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  canopyContainer: {
    width: sectionWidth,
    height: 135,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canopyFruitsGrid: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fruitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 4,
  },
  hangingFruitCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    borderWidth: 2,
    borderColor: '#C8E6C9',
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
  fruitEmoji: { fontSize: 26 },

  // "View Basket" Action Button (Sketch 2)
  viewBasketActionBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 5,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  viewBasketActionText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Top-View Basket (Modal)
  topBasketContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBasketInnerBowl: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBasketCountBadge: {
    position: 'absolute',
    top: 6,
    left: 10,
    backgroundColor: '#E65100',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFF',
    elevation: 4,
  },
  topBasketCountBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },

  // Zoomed-in Basket Modal (Top View)
  zoomModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomModalCard: {
    width: '94%',
    maxWidth: 380,
    maxHeight: '92%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#FFE082',
  },
  zoomScrollContent: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  zoomHeaderRow: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  zoomModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4E342E',
  },
  zoomModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#795548',
    marginTop: 2,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  zoomCloseBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    marginTop: -1,
  },
  zoomBasketArea: {
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomFruitsCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 250,
  },
  zoomFruitBadgeWrap: {
    position: 'relative',
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomFruitBadgeWrapCompact: {
    margin: 2.5,
  },
  zoomFruitEmoji: {
    fontSize: 30,
  },
  zoomFruitEmojiCompact: {
    fontSize: 24,
  },
  zoomFruitIndexTag: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FF6F00',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  zoomFruitIndexText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  zoomQuestionText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3E2723',
    marginVertical: 8,
    textAlign: 'center',
  },
  zoomOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    width: '100%',
  },
  zoomOptionBox: {
    width: 52,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  zoomOptionBoxSelected: {
    borderWidth: 4,
    borderColor: '#3E2723',
    transform: [{ scale: 1.12 }],
  },
  zoomOptionText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  zoomSubmitBtn: {
    backgroundColor: '#4CAF50',
    width: '85%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  zoomSubmitBtnDisabled: {
    backgroundColor: '#BDBDBD',
  },
  zoomSubmitBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
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
  oliverBasketHighlighted: {
    borderWidth: 3.5,
    borderColor: '#FFD700',
    borderRadius: 24,
    padding: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  viewBasketBtnHighlighted: {
    borderWidth: 4,
    borderColor: '#FFD700',
    transform: [{ scale: 1.08 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  zoomOptionBoxHighlighted: {
    borderWidth: 4,
    borderColor: '#FFD700',
    transform: [{ scale: 1.15 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  zoomSubmitBtnHighlighted: {
    backgroundColor: '#4CAF50',
    borderWidth: 4,
    borderColor: '#FFD700',
    transform: [{ scale: 1.05 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  instructionCardFeedback: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFA000',
    borderWidth: 2,
  },
  instructionTextFeedback: {
    color: '#E65100',
    fontWeight: '900',
  },
  viewBasketFeedbackBubble: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    maxWidth: '90%',
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  viewBasketFeedbackText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#D84315',
    textAlign: 'center',
  },
  zoomFruitHighlighted: {
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFD700',
    backgroundColor: '#FFF9C4',
    transform: [{ scale: 1.25 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
});
