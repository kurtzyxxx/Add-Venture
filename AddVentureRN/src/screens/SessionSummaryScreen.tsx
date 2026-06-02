import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, SafeAreaView, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioManager } from '../core/AudioManager';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionSummary'>;

const STRATEGY_LABELS: Record<string, string> = {
  COUNT_ALL: 'Count All',
  COUNT_ON: 'Count On',
  NUMBER_BONDS: 'Number Bonds',
};

export default function SessionSummaryScreen({ route, navigation }: Props) {
  const { stars, activities, correct, strategy, incorrectProblems = [] } = route.params;
  const accuracyPct = activities > 0 ? Math.round((correct / activities) * 100) : 0;
  const hasAdaptiveReview = incorrectProblems.length > 0;

  // Get session history for comparison
  const gm = GameManager.getInstance();
  const history = gm.saveSystem.getSessionHistoryForStrategy(strategy);
  const lastSession = history.length > 1 ? history[1] : null; // [0] is current (just completed)
  const delta = lastSession ? accuracyPct - lastSession.accuracyPct : null;

  const avgMs = gm.saveSystem.getAverageResponseTime(strategy);
  const avgSec = Math.round(avgMs / 1000);

  // Animations
  const arcAnim = useRef(new Animated.Value(0)).current;
  const starsAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(arcAnim, { toValue: accuracyPct / 100, duration: 1200, useNativeDriver: false }),
      Animated.spring(starsAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    const label = STRATEGY_LABELS[strategy] ?? strategy;
    AudioManager.stopSpeech();
    setTimeout(() => {
      AudioManager.speak(
        `Great session! You got ${correct} out of ${activities} right, with ${accuracyPct} percent accuracy. ${stars} stars earned!`,
        { rate: 0.9, pitch: 1.2 }
      );
    }, 400);
  }, []);

  const arcColor = accuracyPct >= 80 ? '#43A047' : accuracyPct >= 60 ? '#FF9800' : '#FF5252';
  const deltaText =
    delta === null
      ? 'First session!'
      : delta > 0
      ? `↑ +${delta}% better than last session!`
      : delta < 0
      ? `↓ ${Math.abs(delta)}% from last session`
      : '= Same as last session';
  const deltaColor = delta === null ? '#9E9E9E' : delta > 0 ? '#43A047' : delta < 0 ? '#FF5252' : '#FF9800';

  const handleContinue = () => {
    const routeName =
      strategy === 'COUNT_ALL' ? 'CountOn' :
      strategy === 'COUNT_ON' ? 'NumberBonds' :
      'NumberBonds';
    const nextStrategy =
      routeName === 'CountOn' ? 'COUNT_ON' :
      routeName === 'NumberBonds' ? 'NUMBER_BONDS' :
      'COUNT_ALL';
    
    if (hasAdaptiveReview) {
      navigation.replace('AdaptiveMode', {
        strategy,
        targetRoute: routeName,
        incorrectProblems,
      });
      return;
    }

    GameManager.getInstance().startSession(nextStrategy);
    navigation.replace(routeName);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#1565C0', '#283593', '#4A148C']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Stars & confetti decorations */}
      {['⭐', '🎊', '✨', '🌟', '🎉'].map((e, i) => (
        <Text
          key={i}
          style={[
            styles.floatDecor,
            { top: `${10 + i * 15}%`, left: i % 2 === 0 ? '5%' : undefined, right: i % 2 !== 0 ? '5%' : undefined, fontSize: 22 + (i % 3) * 8, opacity: 0.55 },
          ]}
        >
          {e}
        </Text>
      ))}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* Title */}
          <Text style={styles.title}>Session Complete! 🏆</Text>
          <Text style={styles.strategyLabel}>{STRATEGY_LABELS[strategy] ?? strategy}</Text>

          {/* Accuracy ring card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Accuracy</Text>
            <View style={styles.ringWrapper}>
              <View style={[styles.ring, { borderColor: arcColor }]}>
                <Text style={[styles.ringValue, { color: arcColor }]}>{accuracyPct}%</Text>
                <Text style={styles.ringLabel}>accuracy</Text>
              </View>
            </View>

            {/* Delta vs last session */}
            <Text style={[styles.deltaText, { color: deltaColor }]}>{deltaText}</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatChip icon="✅" label="Correct" value={`${correct}/${activities}`} color="#43A047" />
              <StatChip icon="⏱" label="Avg Time" value={avgSec > 0 ? `${avgSec}s` : '—'} color="#1565C0" />
              <StatChip icon="⭐" label="Stars" value={`+${stars}`} color="#FF8F00" />
            </View>
          </View>

          {/* Stars earned animation */}
          <Animated.View style={[styles.starsCard, { transform: [{ scale: starsAnim }] }]}>
            <Text style={styles.starsEmoji}>⭐⭐⭐</Text>
            <Text style={styles.starsEarned}>+{stars} Stars Earned!</Text>
          </Animated.View>

          {/* Motivation message */}
          <View style={styles.motivationCard}>
            <Text style={styles.motivationText}>
              {accuracyPct >= 80
                ? '🔥 Incredible performance! Keep it up!'
                : accuracyPct >= 60
                ? '💪 Great work! Practice makes perfect.'
                : '🌱 Good effort! Every try makes you better!'}
            </Text>
          </View>

          {/* Last session quick stats */}
          {lastSession && (
            <View style={styles.lastSessionCard}>
              <Text style={styles.lastSessionTitle}>Last Session</Text>
              <Text style={styles.lastSessionStat}>
                Accuracy: {lastSession.accuracyPct}%  ·  Correct: {lastSession.totalCorrect}/{lastSession.totalActivities}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {hasAdaptiveReview ? 'Review Mistakes First' : 'Continue to Next Level'}
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>🏠 Back to Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Progress')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>📊 View Progress</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.chipIcon}>{icon}</Text>
      <Text style={[chipStyles.chipValue, { color }]}>{value}</Text>
      <Text style={chipStyles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  floatDecor: { position: 'absolute' },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  strategyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#283593', marginBottom: 18 },
  ringWrapper: { marginBottom: 12 },
  ring: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  ringValue: { fontSize: 36, fontWeight: '900' },
  ringLabel: { fontSize: 12, color: '#9E9E9E', fontWeight: 'bold', marginTop: -4 },
  deltaText: { fontSize: 14, fontWeight: '900', marginBottom: 18, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  starsCard: {
    backgroundColor: '#FFD600',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
    elevation: 6,
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  starsEmoji: { fontSize: 44, marginBottom: 4 },
  starsEarned: { fontSize: 24, fontWeight: '900', color: '#5D4037' },
  motivationCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  motivationText: { fontSize: 17, color: '#FFF', fontWeight: 'bold', textAlign: 'center' },
  lastSessionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  lastSessionTitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', marginBottom: 4 },
  lastSessionStat: { fontSize: 15, color: '#FFF', fontWeight: '900' },
  primaryBtn: {
    backgroundColor: '#FFCA28',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 14,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FF8F00',
  },
  primaryBtnText: { fontSize: 20, fontWeight: '900', color: '#5D4037' },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
});

const chipStyles = StyleSheet.create({
  chip: { alignItems: 'center', flex: 1 },
  chipIcon: { fontSize: 24, marginBottom: 4 },
  chipValue: { fontSize: 20, fontWeight: '900' },
  chipLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: 'bold', marginTop: 2 },
});
