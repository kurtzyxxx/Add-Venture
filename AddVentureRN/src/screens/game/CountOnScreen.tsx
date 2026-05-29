import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, SafeAreaView, Modal
} from 'react-native';
import * as Speech from 'expo-speech';
import { IncorrectModal } from '../../components/IncorrectModal';
import { HintModal } from '../../components/HintModal';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'CountOn'>;

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];

export default function CountOnScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [baseN, setBaseN] = useState(0);
  const [extraM, setExtraM] = useState(0);
  const [fruits, setFruits] = useState<{ id: string; emoji: string; dropped: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [dropCounter, setDropCounter] = useState(0);
  const [showCounter, setShowCounter] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);

  // 3-try system
  const [currentTry, setCurrentTry] = useState(1);
  // Activity counter (1–10)
  const [activityCount, setActivityCount] = useState(0);
  // Great Job overlay
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  // Adaptive repeat queue
  const repeatQueue = useRef<Problem[]>([]);
  // Animation refs
  const starScale = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadNewProblem();
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const animateGreatJob = () => {
    starScale.setValue(0);
    confettiAnim.setValue(0);
    Animated.parallel([
      Animated.spring(starScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(confettiAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  };

  const loadNewProblem = (forceRepeat?: Problem) => {
    let p: Problem;
    if (forceRepeat) {
      p = forceRepeat;
    } else if (repeatQueue.current.length > 0) {
      p = repeatQueue.current.shift()!;
    } else {
      p = GameManager.getInstance().generateProblem();
    }
    const pCount = GameManager.getInstance().getSessionActivityCount();
    setActivityCount(pCount);

    const base = Math.max(p.num1, p.num2);
    const extra = Math.min(p.num1, p.num2);
    setBaseN(base);
    setExtraM(extra);
    setProblem(p);

    const profile = GameManager.getInstance().saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= 3);

    Speech.stop();
    Speech.speak(`Help Oliver! He has ${base} fruits, and needs ${extra} more!`, { rate: 0.95, pitch: 1.4 });

    const newFruits: { id: string; emoji: string; dropped: boolean }[] = [];
    const emojiType = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    for (let i = 0; i < extra; i++) {
      newFruits.push({ id: `tree_${i}`, emoji: emojiType, dropped: false });
    }

    setFruits(newFruits);
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setCurrentTry(1);
    setTimer(0);

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      const rand = Math.floor(Math.random() * 18) + 1;
      opts.add(rand);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));
  };

  const handleDrop = (fruitId: string) => {
    setFruits(prev => {
      const next = prev.map(f => f.id === fruitId ? { ...f, dropped: true } : f);
      const droppedCount = next.filter(f => f.dropped).length;
      setDropCounter(droppedCount);
      triggerDropCounter();
      const currentTotal = baseN + droppedCount;
      Speech.stop();
      if (droppedCount === next.length) {
        Speech.speak(currentTotal.toString(), { rate: 0.95, pitch: 1.4 });
        Speech.speak('How many fruits in all?', { rate: 0.95, pitch: 1.4 });
      } else {
        Speech.speak(currentTotal.toString(), { rate: 0.95, pitch: 1.4 });
      }
      return next;
    });
  };

  const counterTimeout = useRef<any>(null);
  const triggerDropCounter = () => {
    setShowCounter(true);
    if (counterTimeout.current) clearTimeout(counterTimeout.current);
    counterTimeout.current = setTimeout(() => setShowCounter(false), 500);
  };

  const handleReset = () => {
    setFruits(prev => prev.map(f => ({ ...f, dropped: false })));
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    Speech.stop();
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !problem) return;

    const isCorrect = selectedAnswer === problem.correctAnswer;
    const { starsEarned } = await GameManager.getInstance().submitAnswer(isCorrect, currentTry, timer * 1000);

    if (isCorrect) {
      const newCount = GameManager.getInstance().getSessionActivityCount();
      setActivityCount(newCount);
      setGreatJobStars(starsEarned);
      animateGreatJob();
      setShowGreatJob(true);
    } else {
      if (currentTry >= 3) {
        const newCount = GameManager.getInstance().getSessionActivityCount();
        setActivityCount(newCount);
        setGreatJobStars(0);
        animateGreatJob();
        setShowGreatJob(true);
      } else {
        setShowIncorrectModal(true);
      }
    }
  };

  const handleContinueAfterGreatJob = async () => {
    setShowGreatJob(false);
    if (activityCount >= MAX_ACTIVITIES_PER_SESSION) {
      await finishSession();
    } else {
      loadNewProblem();
    }
  };

  const handleTryAgainAfterFail = async () => {
    setShowIncorrectModal(false);
    if (currentTry >= 3) {
      setCurrentTry(1);
      const newCount = GameManager.getInstance().getSessionActivityCount();
      setActivityCount(newCount);
      if (newCount >= MAX_ACTIVITIES_PER_SESSION) {
        await finishSession();
      } else {
        loadNewProblem();
      }
      return;
    }
    
    setCurrentTry(prev => prev + 1);
    setOptions(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setSelectedAnswer(null);
  };

  const [showHintModal, setShowHintModal] = useState(false);
  const [currentHintText, setCurrentHintText] = useState("");

  const useHint = () => {
    if (!problem || hintsRemaining <= 0) return;
    setHintsRemaining(prev => prev - 1);
    const hintText = GameManager.getInstance().getHint(problem);
    setCurrentHintText(hintText);
    Speech.speak(hintText, { rate: 0.95, pitch: 1.2 });
    setShowHintModal(true);
  };

  const finishSession = async () => {
    const session = await GameManager.getInstance().completeAndResetSession();
    navigation.replace('SessionSummary', {
      stars: session.totalStars,
      activities: session.totalActivities,
      correct: session.totalCorrect
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const allDropped = fruits.every(f => f.dropped);
  const profile = GameManager.getInstance().saveSystem.getProfile();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      {/* Clouds */}
      <Text style={[styles.cloud, { top: '10%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '20%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '60%', left: '5%', fontSize: 70, opacity: 0.5 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '70%', right: '0%', fontSize: 90, opacity: 0.5 }]}>☁️</Text>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.circleButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.timeText}>⏱ {formatTime(timer)}</Text>
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
        <View style={[styles.titleContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 10 }]}>
          <View style={styles.tryStarsRow}>
            {[1, 2, 3].map((t, i) => (
              <Text key={i} style={[styles.tryStar, { opacity: t >= currentTry ? 1 : 0.3 }]}>⭐</Text>
            ))}
          </View>
          <Text style={[styles.title, { flex: 2, textAlign: 'center' }]}>Count On</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <TouchableOpacity
              style={[styles.smallHintBtn, { opacity: hintsDisabled || hintsRemaining <= 0 ? 0.5 : 1 }]}
              onPress={useHint}
              disabled={hintsDisabled || hintsRemaining <= 0}
            >
              <Text style={styles.smallHintText}>💡 {hintsRemaining}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.instructionCard}>
          <View style={styles.owlPlaceholder}>
            <Text style={{ fontSize: 40 }}>🦉</Text>
          </View>
          <Text style={styles.instructionText}>
            Oliver already has {baseN} fruits in his basket. Help him count on {extraM} more from the tree!
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

        {/* Tree (source) or Final Question */}
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
          <View style={styles.fruitRow}>
            <View style={styles.staticBasketBundle}>
              <Text style={{ fontSize: 44 }}>🧺</Text>
              <View style={styles.basketCountBadge}>
                <Text style={styles.basketCountText}>{baseN}</Text>
              </View>
            </View>
            <Text style={styles.equationSymbol}> + </Text>
            {fruits.filter(f => f.dropped).map(fruit => (
              <View key={fruit.id} style={styles.droppedFruitWrapper}>
                <Text style={styles.emoji}>{fruit.emoji}</Text>
              </View>
            ))}
            {!allDropped && <Text style={styles.dropZoneHint}>Drag fruits here!</Text>}
          </View>
          {showCounter && (
            <View style={styles.dropCounterBadge}>
              <Text style={styles.dropCounterText}>{baseN + dropCounter}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
            <View style={styles.resetInner}>
              <Text style={styles.resetIcon}>↻</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Answer Area */}
      {allDropped && (
        <View style={styles.answerArea}>
          <View style={styles.optionsContainer}>
            {options.map((opt, index) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionButton,
                  { backgroundColor: optionColors[index % optionColors.length] },
                  selectedAnswer === opt && styles.optionSelected
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
      )}

      <IncorrectModal
        visible={showIncorrectModal}
        onTryAgain={handleTryAgainAfterFail}
        onHint={() => { setShowIncorrectModal(false); useHint(); }}
        hintsRemaining={hintsRemaining}
        isTryLimitReached={currentTry >= 3}
      />

      <HintModal
        visible={showHintModal}
        hintText={currentHintText}
        onClose={() => setShowHintModal(false)}
      />

      <GreatJobOverlay
        visible={showGreatJob}
        stars={greatJobStars}
        activityCount={activityCount}
        onContinue={handleContinueAfterGreatJob}
        starScale={starScale}
        confettiAnim={confettiAnim}
      />
    </SafeAreaView>
  );
}

// ─── Great Job Overlay ────────────────────────────────────────────────────────
function GreatJobOverlay({ visible, stars, activityCount, onContinue, starScale, confettiAnim }: {
  visible: boolean; stars: number; activityCount: number;
  onContinue: () => void; starScale: Animated.Value; confettiAnim: Animated.Value;
}) {
  const CONFETTI = ['🎊', '🎉', '✨', '⭐', '🌟', '💥', '🎈'];
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={gjStyles.overlay}>
        <View style={gjStyles.card}>
          <View style={gjStyles.confettiRow}>
            {CONFETTI.map((c, i) => (
              <Animated.Text key={i} style={[gjStyles.confettiItem, {
                opacity: confettiAnim,
                transform: [{ translateY: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
              }]}>{c}</Animated.Text>
            ))}
          </View>
          <Animated.Text style={[gjStyles.bigStar, { transform: [{ scale: starScale }] }]}>
            {stars > 0 ? '⭐' : '💡'}
          </Animated.Text>
          <Text style={gjStyles.greatJobText}>{stars > 0 ? 'Great Job!' : "Keep Going!"}</Text>
          <View style={gjStyles.starsEarnedRow}>
            <Text style={gjStyles.plusStars}>+{stars} {stars === 1 ? 'Star' : 'Stars'}</Text>
            <View style={gjStyles.starIconsRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text key={i} style={[gjStyles.starIcon, { opacity: i < stars ? 1 : 0.25 }]}>⭐</Text>
              ))}
            </View>
          </View>
          <Text style={gjStyles.progressText}>Activity {activityCount} of {MAX_ACTIVITIES_PER_SESSION}</Text>
          <TouchableOpacity style={gjStyles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={gjStyles.continueBtnText}>
              {activityCount >= MAX_ACTIVITIES_PER_SESSION ? '🏆 Finish!' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Draggable Fruit ──────────────────────────────────────────────────────────
const DraggableFruit = ({ fruit, onDrop }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dy > 50) { onDrop(); return; }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    })
  ).current;

  return (
    <Animated.View {...panResponder.panHandlers} style={[{ transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: 100 }]}>
      <View style={styles.fruitCircle}>
        <Text style={styles.emoji}>{fruit.emoji}</Text>
      </View>
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
  titleContainer: { alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  tryStarsRow: { flex: 1, flexDirection: 'row', gap: 2 },
  tryStar: { fontSize: 20 },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, elevation: 2 },
  smallHintText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  badgesContainer: { flexDirection: 'row' },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, elevation: 2 },
  badgeText: { fontWeight: 'bold', color: '#FF9800' },
  content: { flex: 1, paddingHorizontal: 20 },
  instructionCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 14, borderRadius: 20, alignItems: 'center', marginBottom: 14, elevation: 3 },
  owlPlaceholder: { width: 54, height: 54, backgroundColor: '#E0F7FA', borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  instructionText: { flex: 1, fontSize: 14, color: '#4E342E', fontWeight: 'bold' },
  equationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  equationNumber: { fontSize: 44, fontWeight: '900' },
  equationSymbol: { fontSize: 36, fontWeight: '900', color: '#263238', marginHorizontal: 6 },
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 14, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  treeIcon: { fontSize: 22, marginRight: 8 },
  groupTitle: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  questionContainer: { paddingVertical: 12, marginVertical: 8, justifyContent: 'center', alignItems: 'center' },
  questionText: { fontSize: 30, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1, textAlign: 'center' },
  fruitRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  fruitCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F8E9', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#DCEDC8' },
  emoji: { fontSize: 30 },
  basketZone: { flex: 1, backgroundColor: '#EFEBE9', borderRadius: 16, borderWidth: 3, borderColor: '#BCAAA4', borderStyle: 'dashed', padding: 14, zIndex: 1, marginTop: 6 },
  staticBasketBundle: { position: 'relative', margin: 8 },
  basketCountBadge: { position: 'absolute', right: -10, bottom: -5, backgroundColor: '#FF5252', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  basketCountText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  dropZoneHint: { color: '#BCAAA4', fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
  droppedFruitWrapper: { margin: 4, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  dropCounterBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FF5252', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  dropCounterText: { color: '#FFF', fontWeight: 'bold', fontSize: 20 },
  answerArea: { backgroundColor: 'transparent', padding: 10 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 14 },
  optionButton: { width: 58, height: 68, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.1 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 32, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 16 },
  actionBtn: { width: '60%', paddingVertical: 14, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  resetButton: { zIndex: 100, position: 'absolute', bottom: 12, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFCA28', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  resetInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 28 },
  resetIcon: { fontSize: 32, color: '#5D4037', fontWeight: 'bold', marginTop: -3 },
});

const gjStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '82%', backgroundColor: '#FFF', borderRadius: 32, alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  confettiRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 },
  confettiItem: { fontSize: 22 },
  bigStar: { fontSize: 90, marginVertical: 4 },
  greatJobText: { fontSize: 42, fontWeight: '900', color: '#FF6F00', textShadowColor: '#FFD700', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4, marginBottom: 8 },
  starsEarnedRow: { alignItems: 'center', marginBottom: 8 },
  plusStars: { fontSize: 30, fontWeight: '900', color: '#43A047', marginBottom: 6 },
  starIconsRow: { flexDirection: 'row', gap: 6 },
  starIcon: { fontSize: 32 },
  progressText: { fontSize: 14, color: '#9E9E9E', fontWeight: 'bold', marginBottom: 20 },
  continueBtn: { backgroundColor: '#43A047', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30, elevation: 4, borderWidth: 3, borderColor: '#A5D6A7' },
  continueBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
});
