import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, SafeAreaView,
} from 'react-native';
import * as Speech from 'expo-speech';
import { IncorrectModal } from '../../components/IncorrectModal';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { PulseView } from '../../components/animations/PulseView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import { TimerBar } from '../../components/TimerBar';

type Props = NativeStackScreenProps<RootStackParamList, 'CountOn'>;

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];
const FRUIT_NAMES: Record<string, string> = {
  '🍎': 'apple', '🍌': 'banana', '🍇': 'grapes', '🍉': 'watermelon',
  '🍓': 'strawberry', '🍑': 'peach', '🍍': 'pineapple', '🍊': 'orange',
};
const HINT_DISABLE_THRESHOLD = 5;

export default function CountOnScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [baseN, setBaseN] = useState(0);
  const [extraM, setExtraM] = useState(0);
  const [fruits, setFruits] = useState<{ id: string; emoji: string; dropped: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [dropCounter, setDropCounter] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);

  const [currentTry, setCurrentTry] = useState(1);
  const [activityCount, setActivityCount] = useState(0);
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  const [justMastered, setJustMastered] = useState(false);

  const currentProblemRef = useRef<Problem | null>(null);
  const fruitTapAnims = useRef<Record<string, Animated.Value>>({});
  const fruitGlowAnims = useRef<Record<string, Animated.Value>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Speech.speak('Count On! Oliver already has some fruits. Help him count on more!', {
      rate: 0.9, pitch: 1.3,
    });
    loadNewProblem();
    timerRef.current = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !showIncorrectModal && !showGreatJob && problem && selectedAnswer === null) {
      handleTimeUp();
    }
  }, [timeLeft, showIncorrectModal, showGreatJob, problem, selectedAnswer]);

  const handleTimeUp = async () => {
    if (!problem) return;
    const gm = GameManager.getInstance();
    setCurrentTry(3);
    const responseTimeMs = gm.sessionTimerLimit * 1000;
    const { starsEarned } = await gm.submitAnswer(false, 3, responseTimeMs, problem, -1);
    
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

    const emojiType = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const newFruits: { id: string; emoji: string; dropped: boolean }[] = [];
    for (let i = 0; i < extra; i++) {
      newFruits.push({ id: `tree_${i}`, emoji: emojiType, dropped: false });
    }

    newFruits.forEach(f => {
      fruitTapAnims.current[f.id] = new Animated.Value(1);
      fruitGlowAnims.current[f.id] = new Animated.Value(0);
    });

    setFruits(newFruits);
    setDropCounter(0);
    setSelectedAnswer(null);
    setCurrentTry(1);
    setTimeLeft(gm.sessionTimerLimit);
    setJustMastered(false);

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      opts.add(Math.floor(Math.random() * 18) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));

    Speech.stop();
    setTimeout(() => {
      const msg = isMastery
        ? `Keep going! Count on from ${base} again!`
        : `Oliver already has ${base} fruits! Help him count on ${extra} more!`;
      Speech.speak(msg, { rate: 0.95, pitch: 1.4 });
    }, 300);
  };

  const handleDrop = (fruitId: string) => {
    setFruits(prev => {
      const next = prev.map(f => f.id === fruitId ? { ...f, dropped: true } : f);
      const droppedCount = next.filter(f => f.dropped).length;
      setDropCounter(droppedCount);
      const currentTotal = baseN + droppedCount;
      const profile = GameManager.getInstance().saveSystem.getProfile();
      const verbose = profile.consecutiveCorrect < HINT_DISABLE_THRESHOLD;

      Speech.stop();
      if (droppedCount === next.length) {
        Speech.speak(currentTotal.toString(), { rate: 0.95, pitch: 1.4 });
        Speech.speak('How many fruits in all?', { rate: 0.95, pitch: 1.4 });
      } else if (verbose) {
        Speech.speak(currentTotal.toString(), { rate: 0.95, pitch: 1.4 });
      }
      return next;
    });
  };

  const handleBasketFruitTap = (fruit: { id: string; emoji: string }, index: number) => {
    const name = FRUIT_NAMES[fruit.emoji] ?? 'fruit';
    Speech.stop();
    Speech.speak(`${name}! That's number ${baseN + index} in the basket.`, { rate: 0.9, pitch: 1.3 });

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

  const submitAnswer = async () => {
    if (selectedAnswer === null || !problem) return;
    const gm = GameManager.getInstance();
    const isCorrect = selectedAnswer === problem.correctAnswer;
    const responseTimeMs = (gm.sessionTimerLimit - timeLeft) * 1000;
    const { starsEarned } = await gm.submitAnswer(isCorrect, currentTry, responseTimeMs, problem, selectedAnswer);

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
      if (currentTry >= 3) {
        if (!isMasteryProblem) gm.addToMasteryQueue(problem);
        const newCount = gm.getSessionActivityCount();
        setActivityCount(newCount);
        setShowIncorrectModal(true);
      } else {
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
    if (currentTry >= 3) {
      loadNewProblem();
    } else {
      setOptions(prev => {
        const s = [...prev];
        for (let i = s.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [s[i], s[j]] = [s[j], s[i]];
        }
        return s;
      });
      setSelectedAnswer(null);
    }
  };

  const useHint = () => {
    if (!problem || hintsRemaining <= 0) return;
    setHintsRemaining(prev => prev - 1);
    Speech.stop();
    Speech.speak(GameManager.getInstance().getHint(problem), { rate: 0.95, pitch: 1.2 });
  };

  const finishSession = async () => {
    const session = await GameManager.getInstance().completeAndResetSession();
    navigation.replace('SessionSummary', {
      stars: session.totalStars,
      activities: session.totalActivities,
      correct: session.totalCorrect,
      strategy: 'COUNT_ON',
    });
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const droppedFruits = fruits.filter(f => f.dropped);
  const allDropped = droppedFruits.length === fruits.length;
  const profile = GameManager.getInstance().saveSystem.getProfile();
  const masteryProgress = GameManager.getInstance().getMasteryProgress();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };
  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      <Text style={[styles.cloud, { top: '10%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '20%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <TimerBar timeLeft={timeLeft} totalTime={GameManager.getInstance().sessionTimerLimit} />
          <Text style={styles.activityProgress}>{activityCount}/{MAX_ACTIVITIES_PER_SESSION}</Text>
        </View>
        <View style={styles.badgesContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ {profile.totalStars}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Header */}
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
                  onPress={useHint}
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

        <View style={styles.instructionCard}>
          <View style={styles.owlPlaceholder}>
            <Text style={{ fontSize: 36 }}>🦉</Text>
          </View>
          <Text style={styles.instructionText}>
            Oliver already has {baseN} fruits. Count on {extraM} more from the tree!
          </Text>
        </View>

        {/* Equation */}
        <View style={styles.equationContainer}>
          <Text style={[styles.equationNumber, { color: '#FF5252' }]}>{baseN}</Text>
          <Text style={styles.equationSymbol}> + </Text>
          <Text style={[styles.equationNumber, { color: '#00BFA5' }]}>{extraM}</Text>
          <Text style={styles.equationSymbol}> = </Text>
          <Text style={[styles.equationNumber, { color: '#FFCA28' }]}>?</Text>
        </View>

        {/* Tree or Question */}
        {!allDropped ? (
          <View style={[styles.groupCard, { zIndex: 10 }]}>
            <View style={styles.groupHeader}>
              <Text style={styles.treeIcon}>🌳</Text>
              <Text style={styles.groupTitle}>The Tree</Text>
            </View>
            <View style={styles.fruitRow}>
              {fruits.filter(f => !f.dropped).map(fruit => (
                <DraggableFruit key={fruit.id} fruit={fruit} onDrop={() => handleDrop(fruit.id)} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>How many fruits in all?</Text>
          </View>
        )}

        {/* Oliver's Basket */}
        <View style={styles.basketZone}>
          <View style={styles.groupHeader}>
            <Text style={styles.treeIcon}>🧺</Text>
            <Text style={[styles.groupTitle, { color: '#8D6E63' }]}>Oliver's Basket</Text>
          </View>
          <View style={styles.basketStats}>
            <Text style={styles.basketStatsText}>Fruits: {baseN + dropCounter}</Text>
          </View>
          <View style={styles.fruitRow}>
            {/* Static base bundle */}
            <View style={styles.staticBasketBundle}>
              <Text style={{ fontSize: 40 }}>🧺</Text>
              <View style={styles.basketCountBadge}>
                <Text style={styles.basketCountText}>{baseN}</Text>
              </View>
            </View>
            <Text style={styles.equationSymbol}>+</Text>
            {/* Interactive dropped fruits */}
            {droppedFruits.map((fruit, idx) => {
              const tapAnim = fruitTapAnims.current[fruit.id] ?? new Animated.Value(1);
              const glowAnim = fruitGlowAnims.current[fruit.id] ?? new Animated.Value(0);
              const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
              return (
                <TouchableOpacity key={fruit.id} onPress={() => handleBasketFruitTap(fruit, idx + 1)} activeOpacity={0.8}>
                  <Animated.View style={[styles.droppedFruitWrapper, { transform: [{ scale: tapAnim }] }]}>
                    <Text style={styles.emoji}>{fruit.emoji}</Text>
                    <Animated.View style={[StyleSheet.absoluteFill, styles.fruitGlow, { opacity: glowOpacity }]} />
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
            {!allDropped && <Text style={styles.dropZoneHint}>Drag fruits here!</Text>}
          </View>
        </View>
      </View>

      {/* Answer Area */}
      <View style={styles.answerArea}>
        <View style={styles.optionsContainer}>
          {options.map((opt, index) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionButton,
                { backgroundColor: optionColors[index % optionColors.length] },
                selectedAnswer === opt && styles.optionSelected,
              ]}
              onPress={() => setSelectedAnswer(opt)}
              activeOpacity={0.8}
            >
              <View style={styles.optionInner}>
                <Text style={styles.optionText}>{opt}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: selectedAnswer !== null ? '#66BB6A' : '#9E9E9E', width: '80%' }]}
            onPress={submitAnswer}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.actionBtnText}>Submit ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <IncorrectModal
        visible={showIncorrectModal}
        onTryAgain={handleTryAgainAfterFail}
        onHint={() => { setShowIncorrectModal(false); useHint(); }}
        hintsRemaining={hintsRemaining}
        currentTry={currentTry}
      />

      <GreatJobOverlay
        visible={showGreatJob}
        stars={greatJobStars}
        activityCount={activityCount}
        onContinue={handleContinueAfterGreatJob}
        isMastery={justMastered}
        masteryProgress={isMasteryProblem && !justMastered ? masteryProgress : null}
      />
    </SafeAreaView>
  );
}

// ─── Draggable Fruit ──────────────────────────────────────────────────────────
const DraggableFruit = ({ fruit, onDrop }: any) => {
  // pan: JS driver (Animated.event requires useNativeDriver: false for position tracking)
  const pan = useRef(new Animated.ValueXY()).current;
  // pressScale: native driver (transform-only)
  // CRITICAL: must live on a SEPARATE nested Animated.View from pan to avoid
  // "JS driven animation on native node" crash.
  const pressScale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // native driver — INNER Animated.View
        Animated.spring(pressScale, { toValue: 1.2, friction: 4, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }, // JS driver — OUTER Animated.View
      ),
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        if (gesture.dy > 50) { onDrop(); return; }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    // OUTER: JS-driver pan translation
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: 100 }}
    >
      {/* INNER: native-driver scale bounce */}
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={styles.fruitCircle}>
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
  badgesContainer: { flexDirection: 'row' },
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
  equationSymbol: { fontSize: 30, fontWeight: '900', color: '#263238', marginHorizontal: 4 },
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 10, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  treeIcon: { fontSize: 20, marginRight: 6 },
  groupTitle: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50' },
  questionContainer: { paddingVertical: 8, marginVertical: 6, justifyContent: 'center', alignItems: 'center' },
  questionText: { fontSize: 26, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1, textAlign: 'center' },
  fruitRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  fruitCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F1F8E9', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#DCEDC8' },
  emoji: { fontSize: 28 },
  basketZone: { flex: 1, backgroundColor: '#EFEBE9', borderRadius: 16, borderWidth: 3, borderColor: '#BCAAA4', borderStyle: 'dashed', padding: 12, zIndex: 1, marginTop: 4 },
  basketStats: { position: 'absolute', top: 10, right: 10, backgroundColor: '#8D6E63', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  basketStatsText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  staticBasketBundle: { position: 'relative', margin: 6 },
  basketCountBadge: { position: 'absolute', right: -10, bottom: -5, backgroundColor: '#FF5252', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  basketCountText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  dropZoneHint: { color: '#BCAAA4', fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
  droppedFruitWrapper: { margin: 3, width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 1, overflow: 'hidden' },
  fruitGlow: { backgroundColor: '#FFD700', borderRadius: 23 },
  answerArea: { backgroundColor: 'transparent', paddingTop: 6, paddingBottom: 4 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 10 },
  optionButton: { width: 58, height: 66, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.1 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 30, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 12 },
  actionBtn: { paddingVertical: 14, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
});
