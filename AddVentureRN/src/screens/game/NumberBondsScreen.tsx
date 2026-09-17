import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Dimensions, Animated, PanResponder, ScrollView,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import { IncorrectModal } from '../../components/IncorrectModal';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { HintConfirmModal } from '../../components/HintConfirmModal';
import { HintBox } from '../../components/HintBox';
import { PulseView } from '../../components/animations/PulseView';
import { TimerBar } from '../../components/TimerBar';
import { AudioManager } from '../../core/AudioManager';
import { GameTutorialModal } from '../../components/tutorial/GameTutorialModal';
import { NUMBER_BONDS_TUTORIAL_STEPS } from '../../components/tutorial/NumberBondsTutorialContent';

const { width } = Dimensions.get('window');
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
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [options, setOptions] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);
  const [incorrectModalTry, setIncorrectModalTry] = useState(1);

  const [currentTry, setCurrentTry] = useState(1);
  const [activityCount, setActivityCount] = useState(0);
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  const [justMastered, setJustMastered] = useState(false);

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(() => {
    return !GameManager.getInstance().saveSystem.hasSeenTutorial('NUMBER_BONDS');
  });

  // Pulse animation for the right basket drop zone when empty
  const basketPulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHintAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadNewProblem();
    if (!showTutorial) {
      AudioManager.speak('Number Bonds! Look at the tree and fill the right basket to complete the bond!', {
        rate: 0.9, pitch: 1.3,
      });
    }
  }, []);

  // Timer only runs during active gameplay
  useEffect(() => {
    if (showTutorial || showIncorrectModal || showGreatJob || !problem) {
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
  }, [showTutorial, showIncorrectModal, showGreatJob, problem]);

  useEffect(() => {
    if (timeLeft === 0 && !showTutorial && !showIncorrectModal && !showGreatJob && problem && selectedOption === null) {
      handleTimeUp();
    }
  }, [timeLeft, showTutorial, showIncorrectModal, showGreatJob, problem, selectedOption]);

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
    if (!problem) return;
    const gm = GameManager.getInstance();
    setCurrentTry(3);
    setIncorrectModalTry(MAX_WRONG_TRIES);
    const responseTimeMs = gm.sessionTimerLimit * 1000;
    const { starsEarned } = await gm.submitAnswer(false, 3, responseTimeMs, problem, -1, true);

    if (isMasteryProblem) {
      gm.recordMasteryIncorrect(problem);
    } else {
      gm.addToMasteryQueue(problem);
    }
    const newCount = gm.getSessionActivityCount();
    setActivityCount(newCount);
    setShowIncorrectModal(true);
  };

  const loadNewProblem = () => {
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

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      opts.add(Math.floor(Math.random() * 9) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));

    AudioManager.stopSpeech();
    setTimeout(() => {
      const msg = isMastery
        ? `Keep going! What goes with ${p.num2} to make ${p.num1}?`
        : `What number goes with ${p.num2} to make ${p.num1}?`;
      AudioManager.speak(msg, { rate: 0.95, pitch: 1.4 });
    }, 300);
  };

  // Sync choice selection with basket fruits
  const handleSelectOption = (opt: number) => {
    if (selectedOption === opt) {
      setSelectedOption(null);
      setTreeFruits(prev => prev.map(f => ({ ...f, dropped: false })));
      return;
    }

    setSelectedOption(opt);
    setTreeFruits(prev => {
      let droppedCount = 0;
      return prev.map(f => {
        if (droppedCount < opt) {
          droppedCount++;
          return { ...f, dropped: true };
        }
        return { ...f, dropped: false };
      });
    });

    AudioManager.stopSpeech();
    AudioManager.speak(`${opt}`, { rate: 0.9, pitch: 1.3 });
  };

  // Drag fruit from canopy into right basket
  const handleDropFruit = (fruitId: string) => {
    setTreeFruits(prev => {
      const next = prev.map(f => (f.id === fruitId ? { ...f, dropped: true } : f));
      const droppedCount = next.filter(f => f.dropped).length;
      setSelectedOption(droppedCount);
      AudioManager.stopSpeech();
      AudioManager.speak(`${droppedCount}`, { rate: 0.95, pitch: 1.3 });
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
  };

  const submitCheck = async () => {
    if (selectedOption === null || !problem) return;
    const gm = GameManager.getInstance();
    const isCorrect = selectedOption === problem.correctAnswer;
    const shouldMoveOnAfterWrong = !isCorrect && currentTry >= MAX_WRONG_TRIES;
    const responseTimeMs = (gm.sessionTimerLimit - timeLeft) * 1000;
    const { starsEarned } = await gm.submitAnswer(
      isCorrect, currentTry, responseTimeMs, problem, selectedOption, shouldMoveOnAfterWrong
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
      resetFruitsAndAnswer();
      if (shouldMoveOnAfterWrong) {
        const newCount = gm.getSessionActivityCount();
        setActivityCount(newCount);
        setIncorrectModalTry(MAX_WRONG_TRIES);
        setShowIncorrectModal(true);
      } else {
        setIncorrectModalTry(currentTry);
        setCurrentTry(prev => prev + 1);
        setShowIncorrectModal(true);
      }
    }
  };

  const handleContinueAfterGreatJob = async () => {
    setShowGreatJob(false);
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) await finishSession();
    else loadNewProblem();
  };

  const handleTryAgainAfterFail = async () => {
    setShowIncorrectModal(false);
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) { await finishSession(); return; }
    if (incorrectModalTry >= MAX_WRONG_TRIES) {
      loadNewProblem();
    } else {
      resetFruitsAndAnswer();
      setOptions(prev => {
        const s = [...prev];
        for (let i = s.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [s[i], s[j]] = [s[j], s[i]];
        }
        return s;
      });
      if (problem) {
        AudioManager.stopSpeech();
        setTimeout(() => {
          AudioManager.speak(`What number goes with ${problem.num2} to make ${problem.num1}?`, {
            rate: 0.95, pitch: 1.3,
          });
        }, 300);
      }
    }
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
    const incorrectProblems = gm.getSessionIncorrectProblems();
    const session = await gm.completeAndResetSession();
    await gm.saveSystem.setAdaptiveReviewPending(
      'NUMBER_BONDS',
      incorrectProblems.length > 0,
      incorrectProblems
    );
    navigation.replace('SessionSummary', {
      stars: session.totalStars,
      activities: session.totalActivities,
      correct: session.totalCorrect,
      strategy: 'NUMBER_BONDS',
      incorrectProblems,
    });
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const profile = GameManager.getInstance().saveSystem.getProfile();
  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];
  const masteryProgress = GameManager.getInstance().getMasteryProgress();
  const displayedActivityCount = Math.min(activityCount + 1, MAX_ACTIVITIES_PER_SESSION);

  const droppedFruits = treeFruits.filter(f => f.dropped);
  const droppedCount = droppedFruits.length;

  const sectionWidth = width - 24;
  const treeCenterX = sectionWidth / 2;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        <View style={styles.treeSection}>
          {/* 1. Leafy Canopy with 10 Hanging Fruits */}
          <View style={styles.canopyContainer}>
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
              <Text style={styles.canopyTitleText}>Fruits here! (10 fruits)</Text>
            </View>

            {/* 10 Hanging Fruits arranged across branches in 2 rows */}
            <View style={styles.canopyFruitsGrid}>
              <View style={styles.fruitRow}>
                {treeFruits.slice(0, 5).map(f => (
                  <DraggableFruit
                    key={`${f.id}_try${currentTry}`}
                    fruit={f}
                    disabled={f.dropped}
                    onDrop={() => handleDropFruit(f.id)}
                  />
                ))}
              </View>
              <View style={styles.fruitRow}>
                {treeFruits.slice(5, 10).map(f => (
                  <DraggableFruit
                    key={`${f.id}_try${currentTry}`}
                    fruit={f}
                    disabled={f.dropped}
                    onDrop={() => handleDropFruit(f.id)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* 2. Unified Tree Trunk (Extended to bottom) + Vertically Elongated Baskets */}
          <View style={styles.trunkAreaWrapper}>
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
              <View style={styles.basketColumn}>
                <TopViewBasket
                  width={126}
                  height={156}
                  badgeText={problem.num2}
                  badgeColor="#0288D1"
                  title="Fixed Pair"
                >
                  <View style={styles.fixedFruitsCluster}>
                    {Array.from({ length: problem.num2 }).map((_, i) => (
                      <Text key={i} style={styles.basketFruitEmoji}>
                        {treeFruits[0]?.emoji ?? '🍎'}
                      </Text>
                    ))}
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
                  badgeText={droppedCount > 0 ? droppedCount : '?'}
                  badgeColor="#E65100"
                  isDropZone={true}
                  title="Drop Zone"
                  onReset={droppedCount > 0 ? handleResetRightBasket : undefined}
                >
                  {droppedCount === 0 ? (
                    <Text style={styles.dropPromptText}>Drag fruits here!</Text>
                  ) : (
                    <View style={styles.fixedFruitsCluster}>
                      {droppedFruits.map(f => (
                        <TouchableOpacity
                          key={f.id}
                          onPress={() => handleRemoveFruit(f.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.basketFruitEmoji}>{f.emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </TopViewBasket>
                <Text style={styles.basketBottomLabel}>
                  {droppedCount > 0 ? `Your Part: ${droppedCount}` : 'Drag to answer'}
                </Text>
              </Animated.View>
            </View>

            {/* Total Number Badge at the V-vertex on the trunk */}
            <View style={styles.totalNumberBadgeWrap}>
              <View style={styles.totalNumberBadge}>
                <Text style={styles.totalBadgeLabel}>TOTAL</Text>
                <Text style={styles.totalBadgeValue}>{problem.num1}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            CHOICES ROW (Choices here!)
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.choicesSection}>
          <Text style={styles.choicesPromptText}>Choices (Tap or Drag):</Text>
          <View style={styles.optionsContainer}>
            {options.map((opt, index) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionButton,
                  { backgroundColor: optionColors[index % optionColors.length] },
                  selectedOption === opt && styles.optionSelected,
                ]}
                onPress={() => handleSelectOption(opt)}
                activeOpacity={0.75}
              >
                <View style={styles.optionInner}>
                  <Text style={styles.optionText}>{opt}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button on bottom */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: selectedOption !== null ? '#66BB6A' : '#9E9E9E' },
              ]}
              onPress={submitCheck}
              disabled={selectedOption === null}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Check ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modals & Overlays */}
      <IncorrectModal
        visible={showIncorrectModal}
        onTryAgain={handleTryAgainAfterFail}
        onHint={() => {
          resetFruitsAndAnswer();
          confirmUseHint(() => setShowIncorrectModal(false));
        }}
        hintsRemaining={hintsRemaining}
        currentTry={incorrectModalTry}
        isFinalWrong={incorrectModalTry >= MAX_WRONG_TRIES}
      />

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
const DraggableFruit = ({ fruit, onDrop, disabled }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const pressScale = useRef(new Animated.Value(1)).current;
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
        zIndex: 100,
      }}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={styles.hangingFruitCircle}>
          <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  scrollContent: { paddingBottom: 30 },
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

  // Choices & Actions Section
  choicesSection: {
    marginTop: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  choicesPromptText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4E342E',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  optionButton: {
    width: 58,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionSelected: {
    borderWidth: 4,
    borderColor: '#FFF',
    transform: [{ scale: 1.12 }],
  },
  optionInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
  },
  optionText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 30,
    width: '80%',
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
});
