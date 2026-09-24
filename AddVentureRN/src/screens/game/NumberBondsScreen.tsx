import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Dimensions, Animated, PanResponder,
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
import { GameTutorialModal } from '../../components/tutorial/GameTutorialModal';
import { NUMBER_BONDS_TUTORIAL_STEPS } from '../../components/tutorial/NumberBondsTutorialContent';
import { FiveStreakModal } from '../../components/FiveStreakModal';
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

export default function NumberBondsScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [treeFruits, setTreeFruits] = useState<TreeFruit[]>([]);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(() => GameManager.getInstance().getSessionHintsRemaining());
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);

  // In-UI automated demonstration states & refs
  const [isDemonstrating, setIsDemonstrating] = useState(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [highlightedFruitId, setHighlightedFruitId] = useState<string | null>(null);
  const [animatingFruitId, setAnimatingFruitId] = useState<string | null>(null);
  const [isTotalBadgeHighlighted, setIsTotalBadgeHighlighted] = useState(false);
  const [isLeftBasketHighlighted, setIsLeftBasketHighlighted] = useState(false);
  const [isCheckHighlighted, setIsCheckHighlighted] = useState(false);
  const [demoCountingIndex, setDemoCountingIndex] = useState<number | null>(null);
  const [demoMaxCountedIndex, setDemoMaxCountedIndex] = useState<number | null>(null);

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

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(() => {
    return !GameManager.getInstance().saveSystem.hasSeenTutorial('NUMBER_BONDS');
  });

  // Pulse animation for the right basket drop zone when empty
  const basketPulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHintAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadNewProblem(showTutorial);
    if (!showTutorial) {
      AudioManager.speak('Number Bonds! Look at the tree and fill the right basket to complete the bond!', {
        rate: 0.9, pitch: 1.3,
      });
    }
  }, []);

  // Timer only runs during active gameplay
  useEffect(() => {
    if (showTutorial || isDemonstrating || showGreatJob || showFiveStreak || !problem) {
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
  }, [showTutorial, isDemonstrating, showGreatJob, showFiveStreak, problem]);

  useEffect(() => {
    if (timeLeft === 0 && !showTutorial && !isDemonstrating && !showGreatJob && !showFiveStreak && problem && selectedOption === null) {
      handleTimeUp();
    }
  }, [timeLeft, showTutorial, isDemonstrating, showGreatJob, showFiveStreak, problem, selectedOption]);

  // Pulse right basket when awaiting answers
  useEffect(() => {
    if (selectedOption === null) {
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
  }, [selectedOption]);

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
    setProblem(p);
    setSelectedOption(null);
    setActiveHint(null);
    setCurrentTry(1);
    setTimeLeft(gm.sessionTimerLimit);
    setJustMastered(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);

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
      AudioManager.stopSpeech();
      setTimeout(() => {
        const msg = isMastery
          ? `Keep going! What goes with ${p.num2} to make ${p.num1}?`
          : `What number goes with ${p.num2} to make ${p.num1}?`;
        AudioManager.speak(msg, { rate: 0.95, pitch: 1.4 });
      }, 300);
    }
  };

  // Drag fruit from canopy into right basket
  const handleDropFruit = (fruitId: string) => {
    setTreeFruits(prev => {
      const next = prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f));
      const droppedCount = next.filter(f => f.dropped).length;
      setSelectedOption(droppedCount);

      const profile = GameManager.getInstance().saveSystem.getProfile();
      if (profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD) {
        AudioManager.stopSpeech();
        AudioManager.speak(`${droppedCount}`, { rate: 0.95, pitch: 1.3 });
      }
      return next;
    });
  };

  // Tap fruit in right basket to return to tree
  const handleRemoveFruit = (fruitId: string) => {
    setTreeFruits(prev => {
      const next = prev.map(f => (f.id === fruitId ? { ...f, dropped: false } : f));
      const droppedCount = next.filter(f => f.dropped).length;
      setSelectedOption(droppedCount > 0 ? droppedCount : null);
      return next;
    });
  };

  // Reset right basket
  const handleResetRightBasket = () => {
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);
    AudioManager.stopSpeech();
    AudioManager.speak('Basket cleared.', { rate: 0.95, pitch: 1.25 });
  };

  const handleCloseTutorial = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    const gm = GameManager.getInstance();
    if (dontShowAgain) {
      await gm.saveSystem.markTutorialSeen('NUMBER_BONDS', true);
    }
    setTimeLeft(gm.sessionTimerLimit);
    AudioManager.speak('Number Bonds! Look at the tree and fill the right basket to complete the bond!', {
      rate: 0.9, pitch: 1.3,
    });
  };

  const handleOpenTutorial = () => {
    AudioManager.stopSpeech();
    setShowTutorial(true);
  };

  // Reset all tree fruits and player answer selection
  const resetFruitsAndAnswer = () => {
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
  };

  const submitCheck = async () => {
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

    // Reset dropped fruits so demonstration starts clean
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setIsTotalBadgeHighlighted(false);
    setIsLeftBasketHighlighted(false);
    setIsCheckHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);

    const missingCount = problem.correctAnswer;

    // Friendly notice if the student answered incorrectly or time expired
    if (isTimeout) {
      setDemoMessage(`Time's up! Let's watch Oliver find the number bond!`);
      await AudioManager.speakAsync(`Time's up! That's okay, let's watch Oliver find the number bond together!`, {
        rate: 0.95,
        pitch: 1.3,
      });
      await waitMs(400);
      if (isDemoCancelled.current) return;
    } else {
      setDemoMessage(`Not quite, but nice try! Let's watch Oliver find the missing number!`);
      await AudioManager.speakAsync(`Not quite, but good try! Let's watch Oliver find the number bond together!`, {
        rate: 0.95,
        pitch: 1.3,
      });
      await waitMs(400);
      if (isDemoCancelled.current) return;
    }

    // Step 1: Highlight Trunk Total Badge
    setDemoMessage(`Total on the tree is ${problem.num1}!`);
    setIsTotalBadgeHighlighted(true);

    await AudioManager.speakAsync(`Look at the tree! The total number is ${problem.num1}!`, {
      rate: 0.92,
      pitch: 1.25,
    });
    await waitMs(400);
    if (isDemoCancelled.current) return;
    setIsTotalBadgeHighlighted(false);

    // Step 2: Highlight Left Basket (fixed part)
    setDemoMessage(`Left basket has ${problem.num2}. How many more make ${problem.num1}?`);
    setIsLeftBasketHighlighted(true);

    await AudioManager.speakAsync(`The left basket already has ${problem.num2}. How many more do we need to make ${problem.num1}?`, {
      rate: 0.92,
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

      await AudioManager.speakAsync(`${count}`, { rate: 0.95, pitch: 1.35 });
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
    setIsDemonstrating(false);
    setHighlightedFruitId(null);
    setAnimatingFruitId(null);
    setIsTotalBadgeHighlighted(false);
    setIsLeftBasketHighlighted(false);
    setIsCheckHighlighted(false);
    setDemoCountingIndex(null);
    setDemoMaxCountedIndex(null);
    setCurrentTry(prev => prev + 1);

    // Clear right basket for the student
    setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setSelectedOption(null);

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

  const sectionWidth = width - 24;
  const treeCenterX = sectionWidth / 2;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      {isDemonstrating && (
        <DemonstrationBanner
          message={demoMessage}
          onSkip={endDemonstration}
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
                !showTutorial &&
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
            What number goes with {problem.num2} to make {problem.num1}? Drag fruits to the right basket!
          </Text>
        </View>

        {/* Equation Banner (e.g. 3 + _ = 5) above "Fruits here" area */}
        <View style={styles.equationContainer}>
          <View style={[styles.equationPill, { backgroundColor: '#E1F5FE', borderColor: '#0288D1' }]}>
            <Text style={[styles.equationNumber, { color: '#0288D1' }]}>{problem.num2}</Text>
          </View>
          <Text style={styles.equationSymbol}>+</Text>
          <View
            style={[
              styles.equationPill,
              selectedOption !== null
                ? { backgroundColor: '#FFF3E0', borderColor: '#E65100' }
                : { backgroundColor: '#FFFFFF', borderColor: '#E65100', borderStyle: 'dashed' },
            ]}
          >
            <Text
              style={[
                styles.equationNumber,
                { color: selectedOption !== null ? '#E65100' : '#BDBDBD' },
              ]}
            >
              {selectedOption !== null ? selectedOption : '_'}
            </Text>
          </View>
          <Text style={styles.equationSymbol}>=</Text>
          <View style={[styles.equationPill, { backgroundColor: '#FFF9C4', borderColor: '#F57F17' }]}>
            <Text style={[styles.equationNumber, { color: '#F57F17' }]}>{problem.num1}</Text>
          </View>
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
                      key={`${f.id}_try${currentTry}`}
                      fruit={f}
                      disabled={f.dropped || isDemonstrating}
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
                      key={`${f.id}_try${currentTry}`}
                      fruit={f}
                      disabled={f.dropped || isDemonstrating}
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
                y1={172}
                x2={treeCenterX}
                y2={212}
                stroke="#2E1C14"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <Line
                x1={treeCenterX + 75}
                y1={172}
                x2={treeCenterX}
                y2={212}
                stroke="#2E1C14"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            </Svg>

            {/* Dual Vertically Elongated Baskets & Center + */}
            <View style={styles.basketsRow}>
              {/* LEFT BASKET — Fixed Number Pair */}
              <View style={[styles.basketColumn, isLeftBasketHighlighted && styles.basketHighlighted]}>
                <TopViewBasket
                  width={126}
                  height={156}
                  badgeText={problem.num2}
                  badgeColor="#0288D1"
                  title="Fixed Pair"
                >
                  <View style={styles.fixedFruitsCluster}>
                    {Array.from({ length: problem.num2 }).map((_, i) => {
                      const isCountingActive = demoCountingIndex === i;
                      const showBadge = demoMaxCountedIndex !== null && i <= demoMaxCountedIndex;
                      const fruitNum = i + 1;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.doubleCheckFruitWrap,
                            isCountingActive && styles.doubleCheckFruitActive,
                          ]}
                        >
                          <Text style={styles.basketFruitEmoji}>
                            {treeFruits[0]?.emoji ?? '🍎'}
                          </Text>
                          {showBadge && (
                            <View style={styles.doubleCheckFruitBadge}>
                              <Text style={styles.doubleCheckFruitBadgeText}>{fruitNum}</Text>
                            </View>
                          )}
                        </View>
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

              {/* RIGHT BASKET — Drag Drop Area */}
              <Animated.View style={[styles.basketColumn, { transform: [{ scale: basketPulse }] }]}>
                <TopViewBasket
                  width={126}
                  height={156}
                  badgeText={showClues ? (droppedCount > 0 ? droppedCount : '?') : '?'}
                  badgeColor="#E65100"
                  isDropZone={true}
                  title="Drop Zone"
                  onReset={droppedCount > 0 && !isDemonstrating ? handleResetRightBasket : undefined}
                >
                  {droppedCount === 0 ? (
                    <Text style={styles.dropPromptText}>Drag fruits here!</Text>
                  ) : (
                    <View style={styles.fixedFruitsCluster}>
                      {droppedFruits.map((f, i) => {
                        const globalIdx = problem.num2 + i;
                        const isCountingActive = demoCountingIndex === globalIdx;
                        const showBadge = demoMaxCountedIndex !== null && globalIdx <= demoMaxCountedIndex;
                        const fruitNum = globalIdx + 1;
                        return (
                          <TouchableOpacity
                            key={f.id}
                            onPress={() => handleRemoveFruit(f.id)}
                            disabled={isDemonstrating}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.doubleCheckFruitWrap,
                                isCountingActive && styles.doubleCheckFruitActive,
                              ]}
                            >
                              <Text style={styles.basketFruitEmoji}>{f.emoji}</Text>
                              {showBadge && (
                                <View style={styles.doubleCheckFruitBadge}>
                                  <Text style={styles.doubleCheckFruitBadgeText}>{fruitNum}</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </TopViewBasket>
                <Text style={styles.basketBottomLabel}>
                  {droppedCount > 0
                    ? (showClues ? `Your Part: ${droppedCount}` : 'Your Part')
                    : 'Drag to answer'}
                </Text>
              </Animated.View>
            </View>

            {/* Total Number Badge at the V-vertex on the trunk */}
            <View style={styles.totalNumberBadgeWrap}>
              <View style={[styles.totalNumberBadge, isTotalBadgeHighlighted && styles.totalBadgeHighlighted]}>
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

      {/* Tutorial Modal */}
      <GameTutorialModal
        visible={showTutorial}
        gameTitle="Number Bonds"
        steps={NUMBER_BONDS_TUTORIAL_STEPS}
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

// ─── Top-View Vertically Elongated Woven Basket Component ────────────────────
interface TopViewBasketProps {
  width: number;
  height: number;
  badgeText: string | number;
  badgeColor?: string;
  isDropZone?: boolean;
  title?: string;
  onReset?: () => void;
  children: React.ReactNode;
}

const TopViewBasket: React.FC<TopViewBasketProps> = ({
  width: bWidth,
  height: bHeight,
  badgeText,
  badgeColor = '#0288D1',
  isDropZone = false,
  onReset,
  children,
}) => {
  const rx = bWidth / 2;
  const ry = bHeight / 2;

  return (
    <View style={[styles.basketContainer, { width: bWidth, height: bHeight }]}>
      {/* SVG Wicker concentric weave texture (vertically elongated ellipse) */}
      <Svg width={bWidth} height={bHeight} style={StyleSheet.absoluteFill}>
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

      {/* Drop zone dashed highlight */}
      {isDropZone && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: ry,
              borderWidth: 2.5,
              borderColor: '#FF9800',
              borderStyle: 'dashed',
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

// ─── Draggable Fruit on Tree Branch ──────────────────────────────────────────
const DraggableFruit = ({
  fruit,
  onDrop,
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
        if (gesture.dy > 40) {
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
        zIndex: isHighlighted || isDemoAnimating ? 999 : 100,
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
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
    marginBottom: 8,
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
    marginTop: 4,
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
    width: '90%',
    marginTop: 18,
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

  // Unified Trunk & Baskets Area
  trunkAreaWrapper: {
    width: width - 24,
    height: 310,
    position: 'relative',
    alignItems: 'center',
    marginTop: -8,
  },
  basketsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'absolute',
    top: 15,
    zIndex: 5,
  },
  basketColumn: {
    alignItems: 'center',
    zIndex: 5,
    marginHorizontal: 12,
  },
  plusSignContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3E2723',
    borderWidth: 2.5,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
    elevation: 4,
  },
  centerPlusText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    marginTop: -2,
  },
  basketBottomLabel: {
    fontSize: 11,
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
    width: '82%',
    height: '84%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fixedFruitsCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    maxWidth: 95,
  },
  basketFruitEmoji: {
    fontSize: 22,
    margin: 2,
  },
  doubleCheckFruitWrap: {
    position: 'relative',
    margin: 1,
    padding: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleCheckFruitActive: {
    backgroundColor: '#FFF9C4',
    borderWidth: 2,
    borderColor: '#FFD700',
    transform: [{ scale: 1.18 }],
  },
  doubleCheckFruitBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E65100',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#FFF',
    minWidth: 14,
    height: 14,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
  },
  doubleCheckFruitBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
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
    top: 195,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },
  totalNumberBadge: {
    backgroundColor: '#FF6F00',
    borderWidth: 3,
    borderColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
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
    marginTop: -3,
  },

  // Actions Section
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 28,
    width: '85%',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  actionBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  equationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 6,
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
});
