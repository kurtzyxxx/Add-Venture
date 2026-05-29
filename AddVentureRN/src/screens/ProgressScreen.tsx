import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Dimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export default function ProgressScreen({ navigation }: Props) {
  const [totalStars, setTotalStars] = useState(0);
  const [countAllAcc, setCountAllAcc] = useState(0);
  const [countOnAcc, setCountOnAcc] = useState(0);
  const [numberBondsAcc, setNumberBondsAcc] = useState(0);
  const [streak, setStreak] = useState(0);
  const [countAllCompleted, setCountAllCompleted] = useState(0);
  const [countOnCompleted, setCountOnCompleted] = useState(0);
  const [numberBondsCompleted, setNumberBondsCompleted] = useState(0);

  // Additional unlocks specifically for badges
  const [beginnerUnlocked, setBeginnerUnlocked] = useState(false);
  const [fastThinkerUnlocked, setFastThinkerUnlocked] = useState(false);
  const [streakUnlocked, setStreakUnlocked] = useState(false);

  // Unlocks for strategies
  const [countOnUnlocked, setCountOnUnlocked] = useState(false);
  const [numberBondsUnlocked, setNumberBondsUnlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refreshData);
    refreshData();
    return unsubscribe;
  }, [navigation]);

  const refreshData = () => {
    const gm = GameManager.getInstance();
    const profile = gm.saveSystem.getProfile();
    setTotalStars(profile.totalStars);
    setStreak(profile.consecutiveCorrect);

    const ca = gm.saveSystem.getProgress('COUNT_ALL');
    const co = gm.saveSystem.getProgress('COUNT_ON');
    const nb = gm.saveSystem.getProgress('NUMBER_BONDS');

    setCountAllAcc(gm.saveSystem.getAccuracy('COUNT_ALL'));
    setCountOnAcc(gm.saveSystem.getAccuracy('COUNT_ON'));
    setNumberBondsAcc(gm.saveSystem.getAccuracy('NUMBER_BONDS'));

    setCountAllCompleted(ca.completedActivities);
    setCountOnCompleted(co.completedActivities);
    setNumberBondsCompleted(nb.completedActivities);

    setCountOnUnlocked(gm.saveSystem.isCountOnUnlocked());
    setNumberBondsUnlocked(gm.saveSystem.isNumberBondsUnlocked());

    // Badges conditions:
    // Beginner: 10 completed activities on Count All
    setBeginnerUnlocked(ca.completedActivities >= 10);
    // Fast Thinker: 10 completed activities on Count On
    setFastThinkerUnlocked(co.completedActivities >= 10);
    // Streak: 5 consecutive correct answers
    setStreakUnlocked(profile.consecutiveCorrect >= 5);
  };

  // Progress bar max reference (10 activities per stage feels full)
  const BAR_MAX = 10;
  const caProgress = Math.min(1, countAllCompleted / BAR_MAX);
  const coProgress = Math.min(1, countOnCompleted / BAR_MAX);
  const nbProgress = Math.min(1, numberBondsCompleted / BAR_MAX);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Full gradient background */}
      <LinearGradient
        colors={['#FF6EC7', '#CF53F0', '#9B3FDE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.pageTitle}>My Progress</Text>

        {/* Stars Badge */}
        <View style={styles.starsBadge}>
          <Text style={styles.starsEmoji}>⭐</Text>
          <Text style={styles.starsText}>{totalStars} Stars</Text>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesCard}>
          <BadgeItem
            emoji="🌟"
            label="Beginner"
            sublabel={beginnerUnlocked ? `${countAllCompleted} done` : 'Locked'}
            unlocked={beginnerUnlocked}
          />
          <BadgeItem
            emoji="⚡"
            label="Fast Thinker"
            sublabel={fastThinkerUnlocked ? `${countOnCompleted} done` : 'Locked'}
            unlocked={fastThinkerUnlocked}
          />
          <BadgeItem
            emoji="🔥"
            label="Streak"
            sublabel={streakUnlocked ? `${streak} in a row` : 'Locked'}
            unlocked={streakUnlocked}
          />
        </View>

        {/* Progress Bars */}
        <View style={styles.progressCard}>
          <Text style={styles.progressCardTitle}>Progress</Text>

          <ProgressBar
            label="Count All"
            emoji="⭐"
            progress={caProgress}
            accuracy={countAllAcc}
            completed={countAllCompleted}
            barColor="#66BB6A"
            unlocked
          />

          <ProgressBar
            label="Count On"
            emoji="⚡"
            progress={coProgress}
            accuracy={countOnAcc}
            completed={countOnCompleted}
            barColor="#29B6F6"
            unlocked={countOnUnlocked}
          />

          <ProgressBar
            label="Number Bonds"
            emoji="🔗"
            progress={nbProgress}
            accuracy={numberBondsAcc}
            completed={numberBondsCompleted}
            barColor="#FF7043"
            unlocked={numberBondsUnlocked}
          />
        </View>

        {/* Accuracy Summary Card */}
        <View style={styles.accuracyCard}>
          <Text style={styles.accuracyTitle}>Accuracy</Text>
          <View style={styles.accuracyRow}>
            <AccuracyDot label="Count All" value={countAllAcc} color="#66BB6A" />
            <AccuracyDot label="Count On" value={countOnAcc} color="#29B6F6" unlocked={countOnUnlocked} />
            <AccuracyDot label="Number Bonds" value={numberBondsAcc} color="#FF7043" unlocked={numberBondsUnlocked} />
          </View>
          {!countOnUnlocked && (
            <View style={styles.unlockHintRow}>
              <Text style={styles.unlockHintText}>
                🔒 Reach 60% & 10+ activities on Count All to unlock Count On
              </Text>
            </View>
          )}
          {countOnUnlocked && !numberBondsUnlocked && (
            <View style={styles.unlockHintRow}>
              <Text style={styles.unlockHintText}>
                🔒 Reach 60% & 10+ activities on Count On to unlock Number Bonds
              </Text>
            </View>
          )}
        </View>

        {/* Parent Dashboard Button */}
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: '#4A148C', borderColor: '#7B1FA2', marginBottom: 12 }]} 
          onPress={() => navigation.navigate('PerformanceDashboard')}
        >
          <Text style={[styles.backBtnText, { color: '#E1BEE7' }]}>📊 Parent Dashboard</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back to Map</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navText, { color: '#D500F9' }]}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Badge Item ───────────────────────────────────────────────────────────────
function BadgeItem({ emoji, label, sublabel, unlocked }: {
  emoji: string; label: string; sublabel: string; unlocked: boolean;
}) {
  return (
    <View style={badgeStyles.item}>
      <View style={[badgeStyles.circle, !unlocked && badgeStyles.circleGrey]}>
        <Text style={badgeStyles.emoji}>{unlocked ? emoji : '🔒'}</Text>
      </View>
      <Text style={badgeStyles.label}>{label}</Text>
      <Text style={badgeStyles.sublabel}>{sublabel}</Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ label, emoji, progress, accuracy, completed, barColor, unlocked }: {
  label: string; emoji: string; progress: number; accuracy: number;
  completed: number; barColor: string; unlocked: boolean;
}) {
  return (
    <View style={pbStyles.row}>
      <Text style={pbStyles.emoji}>{unlocked ? emoji : '🔒'}</Text>
      <View style={pbStyles.info}>
        <View style={pbStyles.labelRow}>
          <Text style={pbStyles.label}>{label}</Text>
          <Text style={pbStyles.accuracy}>{unlocked ? `${Math.round(progress * 100)}%` : '—'}</Text>
        </View>
        <View style={pbStyles.track}>
          <View
            style={[
              pbStyles.fill,
              {
                width: `${unlocked ? Math.round(progress * 100) : 0}%`,
                backgroundColor: unlocked ? barColor : '#BDBDBD',
              }
            ]}
          />
        </View>
        <Text style={pbStyles.completed}>
          {unlocked ? `${completed} activities completed` : 'Locked — complete previous stage first'}
        </Text>
      </View>
    </View>
  );
}

// ─── Accuracy Dot ─────────────────────────────────────────────────────────────
function AccuracyDot({ label, value, color, unlocked = true }: {
  label: string; value: number; color: string; unlocked?: boolean;
}) {
  return (
    <View style={accStyles.item}>
      <View style={[accStyles.ring, { borderColor: unlocked ? color : '#BDBDBD' }]}>
        <Text style={[accStyles.value, { color: unlocked ? color : '#BDBDBD' }]}>
          {unlocked ? `${value}%` : '—'}
        </Text>
      </View>
      <Text style={accStyles.label}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingBottom: 100 },
  pageTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  starsBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  starsEmoji: { fontSize: 30, marginRight: 10 },
  starsText: { fontSize: 26, fontWeight: '900', color: '#5D4037' },
  badgesCard: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginHorizontal: 20,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 18,
    elevation: 6,
  },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 6,
  },
  progressCardTitle: { fontSize: 20, fontWeight: '900', color: '#4A148C', marginBottom: 16 },
  accuracyCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 6,
  },
  accuracyTitle: { fontSize: 20, fontWeight: '900', color: '#4A148C', marginBottom: 14 },
  accuracyRow: { flexDirection: 'row', justifyContent: 'space-around' },
  unlockHintRow: {
    marginTop: 14,
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  unlockHintText: { fontSize: 13, color: '#7B1FA2', fontWeight: 'bold', textAlign: 'center' },
  backBtn: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
    elevation: 20,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  navIcon: { fontSize: 24, marginBottom: 3 },
  navText: { fontSize: 12, fontWeight: 'bold', color: '#616161' },
});

const badgeStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  circleGrey: { backgroundColor: '#E0E0E0', shadowColor: '#9E9E9E' },
  emoji: { fontSize: 34 },
  label: { fontSize: 13, fontWeight: '900', color: '#4A148C', textAlign: 'center' },
  sublabel: { fontSize: 11, color: '#9E9E9E', fontWeight: 'bold', textAlign: 'center', marginTop: 2 },
});

const pbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  emoji: { fontSize: 28, marginRight: 12, marginTop: 2 },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 15, fontWeight: '900', color: '#4E342E' },
  accuracy: { fontSize: 14, fontWeight: 'bold', color: '#757575' },
  track: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: { height: '100%', borderRadius: 8 },
  completed: { fontSize: 11, color: '#9E9E9E', fontWeight: 'bold' },
});

const accStyles = StyleSheet.create({
  item: { alignItems: 'center' },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  value: { fontSize: 18, fontWeight: '900' },
  label: { fontSize: 11, color: '#616161', fontWeight: 'bold', textAlign: 'center', maxWidth: 80 },
});
