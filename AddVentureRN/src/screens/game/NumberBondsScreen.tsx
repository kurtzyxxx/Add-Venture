import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Dimensions, Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager, MAX_ACTIVITIES_PER_SESSION } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { IncorrectModal } from '../../components/IncorrectModal';
import { GreatJobOverlay } from '../../components/GreatJobOverlay';
import { PulseView } from '../../components/animations/PulseView';

const { width } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'NumberBonds'>;

const HINT_DISABLE_THRESHOLD = 5;

export default function NumberBondsScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [options, setOptions] = useState<number[]>([]);
  const [timer, setTimer] = useState(0);
  const [isMasteryProblem, setIsMasteryProblem] = useState(false);

  const [currentTry, setCurrentTry] = useState(1);
  const [activityCount, setActivityCount] = useState(0);
  const [showGreatJob, setShowGreatJob] = useState(false);
  const [greatJobStars, setGreatJobStars] = useState(3);
  const [justMastered, setJustMastered] = useState(false);

  // Bond circle pulse for the unknown slot
  const unknownPulse = useRef(new Animated.Value(1)).current;
  const unknownPulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Speech.speak('Number Bonds! Find the missing part to complete the bond!', { rate: 0.9, pitch: 1.3 });
    loadNewProblem();
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => {
      clearInterval(interval);
      unknownPulseLoop.current?.stop();
    };
  }, []);

  // Pulse the unknown circle when no answer is selected
  useEffect(() => {
    unknownPulseLoop.current?.stop();
    if (selectedOption === null) {
      unknownPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(unknownPulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(unknownPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      unknownPulseLoop.current.start();
    } else {
      unknownPulse.setValue(1);
    }
  }, [selectedOption]);

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
    setCurrentTry(1);
    setTimer(0);
    setJustMastered(false);

    const pCount = gm.getSessionActivityCount();
    setActivityCount(pCount);

    const profile = gm.saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= HINT_DISABLE_THRESHOLD);

    const opts = new Set([p.correctAnswer]);
    while (opts.size < 5) {
      opts.add(Math.floor(Math.random() * 9) + 1);
    }
    setOptions(Array.from(opts).sort((a, b) => a - b));

    Speech.stop();
    setTimeout(() => {
      const msg = isMastery
        ? `Keep going! What goes with ${p.num2} to make ${p.num1}?`
        : `What number goes with ${p.num2} to make ${p.num1}?`;
      Speech.speak(msg, { rate: 0.95, pitch: 1.4 });
    }, 300);
  };

  const handleSelectOption = (opt: number) => {
    setSelectedOption(prev => (prev === opt ? null : opt));
    // Speak the selected number
    Speech.stop();
    Speech.speak(`${opt}`, { rate: 0.9, pitch: 1.3 });
  };

  const submitCheck = async () => {
    if (selectedOption === null || !problem) return;
    const gm = GameManager.getInstance();
    const isCorrect = selectedOption === problem.correctAnswer;
    const { starsEarned } = await gm.submitAnswer(isCorrect, currentTry, timer * 1000, problem, selectedOption);

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
        setSelectedOption(null);
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
      setSelectedOption(null);
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
      strategy: 'NUMBER_BONDS',
    });
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const profile = GameManager.getInstance().saveSystem.getProfile();
  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];
  const masteryProgress = GameManager.getInstance().getMasteryProgress();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#A5D6A7', '#B2DFDB']} style={StyleSheet.absoluteFill} />

      <Text style={[styles.cloud, { top: '15%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '25%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton}>
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
              onPress={useHint}
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

      {/* Bond Graphic */}
      <View style={styles.graphicContainer}>
        <View style={styles.diagramBox}>
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

            {/* Unknown Part */}
            <TouchableOpacity
              onPress={() => selectedOption !== null && setSelectedOption(null)}
              activeOpacity={selectedOption !== null ? 0.7 : 1}
            >
              <Animated.View
                style={[
                  styles.circle,
                  selectedOption !== null ? styles.circlePlaced : styles.circleUnknown,
                  { transform: [{ scale: selectedOption === null ? unknownPulse : 1 }] },
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
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Instruction */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {selectedOption === null
            ? 'Tap a number to fill the missing part!'
            : `You chose ${selectedOption}. Tap Check to confirm!`}
        </Text>
      </View>

      {/* Options Row */}
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
  title: { fontSize: 22, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, elevation: 2 },
  smallHintText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  masteryBadge: { backgroundColor: '#FF6F00', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'center', marginBottom: 6 },
  masteryBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  graphicContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  diagramBox: { width: 260, height: 230, position: 'relative', alignItems: 'center' },
  leftLine: { position: 'absolute', width: 4, height: 110, backgroundColor: '#4E342E', top: 60, left: 75, transform: [{ rotate: '40deg' }] },
  rightLine: { position: 'absolute', width: 4, height: 110, backgroundColor: '#4E342E', top: 60, right: 75, transform: [{ rotate: '-40deg' }] },
  bottomRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', position: 'absolute', bottom: 0 },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
  circleTop: { borderWidth: 4, borderColor: '#D500F9', zIndex: 2 },
  circleBottomLeft: { borderWidth: 4, borderColor: '#00BCD4', zIndex: 2 },
  circleUnknown: { borderWidth: 4, borderColor: '#9C27B0', borderStyle: 'dashed', backgroundColor: '#FFF', zIndex: 2 },
  circlePlaced: { borderWidth: 4, borderColor: '#66BB6A', backgroundColor: '#E8F5E9', zIndex: 2 },
  circleText: { fontSize: 44, fontWeight: '900', color: '#4E342E' },
  circleTextUnknown: { fontSize: 44, fontWeight: '900', color: '#9C27B0' },
  sparkle: { position: 'absolute', fontSize: 20, zIndex: 10 },
  instructionContainer: { paddingHorizontal: 20, marginVertical: 8, alignItems: 'center' },
  instructionText: { fontSize: 20, fontWeight: '900', color: '#4E342E', textAlign: 'center', textShadowColor: '#FFF', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 14 },
  optionButton: { width: 60, height: 70, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.15 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 32, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 28 },
  actionBtn: { paddingVertical: 16, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
});
