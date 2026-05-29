import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Dimensions, Animated, Modal
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { IncorrectModal } from '../../components/IncorrectModal';
import { HintModal } from '../../components/HintModal';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'NumberBonds'>;

export default function NumberBondsScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [options, setOptions] = useState<number[]>([]);
  const [timer, setTimer] = useState(0);

  // 3-try system
  const [currentTry, setCurrentTry] = useState(1);
  // Activity counter (1–10)
  const [activityCount, setActivityCount] = useState(0);
  // Great Job overlay
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  // Adaptive repeat queue
  const repeatQueue = useRef<Problem[]>([]);
  // Animations
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

  const loadNewProblem = () => {
    let p: Problem;
    if (repeatQueue.current.length > 0) {
      p = repeatQueue.current.shift()!;
    } else {
      p = GameManager.getInstance().generateProblem();
    }
    const pCount = GameManager.getInstance().getSessionActivityCount();
    setActivityCount(pCount);

    setProblem(p);
    setSelectedOption(null);
    setCurrentTry(1);
    setTimer(0);

    const profile = GameManager.getInstance().saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= 3);

    Speech.stop();
    Speech.speak(
      `What number goes with ${p.num2} to make ${p.num1}?`,
      { rate: 0.95, pitch: 1.4 }
    );

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      const rand = Math.floor(Math.random() * 9) + 1; // Pick any digit 1-9
      if (rand !== p.num2) opts.add(rand);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));
  };

  const handleSelectOption = (opt: number) => {
    setSelectedOption(prev => (prev === opt ? null : opt));
  };

  const submitCheck = async () => {
    if (selectedOption === null || !problem) return;

    const isCorrect = selectedOption === problem.correctAnswer;
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
    setSelectedOption(null);
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

  const profile = GameManager.getInstance().saveSystem.getProfile();
  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      {/* Cloud Decorations */}
      <Text style={[styles.cloud, { top: '15%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '25%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '65%', left: '5%', fontSize: 70, opacity: 0.5 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '75%', right: '0%', fontSize: 90, opacity: 0.5 }]}>☁️</Text>

      {/* Header */}
      <View style={styles.header}>
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

      {/* Title row with try-stars & hint */}
      <View style={styles.titleRow}>
        <View style={styles.tryStarsRow}>
          {[1, 2, 3].map((t, i) => (
            <Text key={i} style={[styles.tryStar, { opacity: t >= currentTry ? 1 : 0.3 }]}>⭐</Text>
          ))}
        </View>
        <Text style={styles.title}>Number Bonds</Text>
        <TouchableOpacity
          style={[styles.smallHintBtn, { opacity: hintsDisabled || hintsRemaining <= 0 ? 0.5 : 1 }]}
          onPress={useHint}
          disabled={hintsDisabled || hintsRemaining <= 0}
        >
          <Text style={styles.smallHintText}>💡 {hintsRemaining}</Text>
        </TouchableOpacity>
      </View>

      {/* Bond Graphic */}
      <View style={styles.graphicContainer}>
        {/* Simple fixed-size container for the diagram to prevent layout issues */}
        <View style={styles.diagramBox}>
          {/* Connector lines (rendered safely behind circles) */}
          <View style={styles.leftLine} />
          <View style={styles.rightLine} />

          {/* Top Circle — Total */}
          <View style={[styles.circle, styles.circleTop]}>
            <Text style={styles.circleText}>{problem.num1}</Text>
          </View>

          <View style={styles.bottomRow}>
            {/* Known Part */}
            <View style={[styles.circle, styles.circleBottomLeft]}>
              <Text style={styles.circleText}>{problem.num2}</Text>
            </View>

            {/* Unknown Part — shows selected value or ? */}
            <TouchableOpacity
              onPress={() => selectedOption !== null && setSelectedOption(null)}
              activeOpacity={selectedOption !== null ? 0.7 : 1}
              style={[
                styles.circle,
                selectedOption !== null ? styles.circlePlaced : styles.circleUnknown,
              ]}
            >
              {selectedOption !== null ? (
                <Text style={styles.circleText}>{selectedOption}</Text>
              ) : (
                <>
                  <Text style={[styles.sparkle, { top: -10, left: -10 }]}>✨</Text>
                  <Text style={[styles.sparkle, { bottom: -10, right: -10 }]}>✨</Text>
                  <Text style={styles.circleTextUnknown}>?</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Instruction */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {selectedOption === null
            ? 'Fill in the missing part!'
            : `You chose ${selectedOption}. Is that right?`}
        </Text>
      </View>

      {/* Options Row — tap to select */}
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

      {/* Check Button */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: selectedOption !== null ? '#66BB6A' : '#9E9E9E', width: '80%' }]}
          onPress={submitCheck}
          disabled={selectedOption === null}
        >
          <Text style={styles.actionBtnText}>Check ✓</Text>
        </TouchableOpacity>
      </View>

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  cloud: { position: 'absolute', color: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10 },
  circleButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  backIcon: { fontSize: 28, fontWeight: 'bold', color: '#4E342E' },
  topCenter: { alignItems: 'center' },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#4E342E' },
  activityProgress: { fontSize: 13, fontWeight: 'bold', color: '#4E342E', opacity: 0.75 },
  badgesContainer: { flexDirection: 'row' },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, elevation: 2 },
  badgeText: { fontWeight: 'bold', color: '#FF9800' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  tryStarsRow: { flexDirection: 'row', gap: 2 },
  tryStar: { fontSize: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, elevation: 2 },
  smallHintText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  graphicContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  diagramBox: { width: 260, height: 240, position: 'relative', alignItems: 'center' },
  leftLine: { position: 'absolute', width: 4, height: 110, backgroundColor: '#4E342E', top: 60, left: 75, transform: [{ rotate: '40deg' }] },
  rightLine: { position: 'absolute', width: 4, height: 110, backgroundColor: '#4E342E', top: 60, right: 75, transform: [{ rotate: '-40deg' }] },
  bottomRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', position: 'absolute', bottom: 0 },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
  circleTop: { borderWidth: 4, borderColor: '#D500F9', zIndex: 2 },
  circleBottomLeft: { borderWidth: 4, borderColor: '#00BCD4', zIndex: 2 },
  circleUnknown: { borderWidth: 4, borderColor: '#9C27B0', borderStyle: 'dashed', backgroundColor: '#FFF', zIndex: 2 },
  circlePlaced: { borderWidth: 4, borderColor: '#66BB6A', backgroundColor: '#E8F5E9', zIndex: 2 },
  circleText: { fontSize: 46, fontWeight: '900', color: '#4E342E' },
  circleTextUnknown: { fontSize: 46, fontWeight: '900', color: '#9C27B0' },
  sparkle: { position: 'absolute', fontSize: 22, zIndex: 10 },
  instructionContainer: { paddingHorizontal: 20, marginVertical: 12, alignItems: 'center' },
  instructionText: { fontSize: 22, fontWeight: '900', color: '#4E342E', textAlign: 'center', textShadowColor: '#FFF', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 16 },
  optionButton: { width: 60, height: 70, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.15 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 34, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 30 },
  actionBtn: { paddingVertical: 16, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
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
