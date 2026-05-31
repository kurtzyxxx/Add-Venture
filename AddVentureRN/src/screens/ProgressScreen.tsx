import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { SessionRecord } from '../core/SaveSystem';
import { LinearGradient } from 'expo-linear-gradient';
import { TARGET_RESPONSE_MS } from '../core/DifficultyEngine';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

const STRATEGY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  COUNT_ALL: { label: 'Count All', emoji: '⭐', color: '#66BB6A' },
  COUNT_ON: { label: 'Count On', emoji: '⚡', color: '#29B6F6' },
  NUMBER_BONDS: { label: 'Number Bonds', emoji: '🔗', color: '#FF7043' },
};

export default function ProgressScreen({ navigation }: Props) {
  const [totalStars, setTotalStars] = useState(0);
  const [fastStreak, setFastStreak] = useState(0);
  const [streak, setStreak] = useState(0);

  const [caAcc, setCaAcc] = useState(0);
  const [coAcc, setCoAcc] = useState(0);
  const [nbAcc, setNbAcc] = useState(0);

  const [caCompleted, setCaCompleted] = useState(0);
  const [coCompleted, setCoCompleted] = useState(0);
  const [nbCompleted, setNbCompleted] = useState(0);

  const [caAvgMs, setCaAvgMs] = useState(0);
  const [coAvgMs, setCoAvgMs] = useState(0);
  const [nbAvgMs, setNbAvgMs] = useState(0);

  const [countOnUnlocked, setCountOnUnlocked] = useState(false);
  const [numberBondsUnlocked, setNumberBondsUnlocked] = useState(false);

  const [beginnerUnlocked, setBeginnerUnlocked] = useState(false);
  const [fastThinkerUnlocked, setFastThinkerUnlocked] = useState(false);
  const [streakUnlocked, setStreakUnlocked] = useState(false);

  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [caMisconceptions, setCaMisconceptions] = useState<{ combo: string; failCount: number }[]>([]);
  const [coMisconceptions, setCoMisconceptions] = useState<{ combo: string; failCount: number }[]>([]);
  const [nbMisconceptions, setNbMisconceptions] = useState<{ combo: string; failCount: number }[]>([]);

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
    setFastStreak(profile.fastResponseStreak);

    const ca = gm.saveSystem.getProgress('COUNT_ALL');
    const co = gm.saveSystem.getProgress('COUNT_ON');
    const nb = gm.saveSystem.getProgress('NUMBER_BONDS');

    setCaAcc(gm.saveSystem.getAccuracy('COUNT_ALL'));
    setCoAcc(gm.saveSystem.getAccuracy('COUNT_ON'));
    setNbAcc(gm.saveSystem.getAccuracy('NUMBER_BONDS'));

    setCaCompleted(ca.completedActivities);
    setCoCompleted(co.completedActivities);
    setNbCompleted(nb.completedActivities);

    setCaAvgMs(gm.saveSystem.getAverageResponseTime('COUNT_ALL'));
    setCoAvgMs(gm.saveSystem.getAverageResponseTime('COUNT_ON'));
    setNbAvgMs(gm.saveSystem.getAverageResponseTime('NUMBER_BONDS'));

    setCountOnUnlocked(gm.saveSystem.isCountOnUnlocked());
    setNumberBondsUnlocked(gm.saveSystem.isNumberBondsUnlocked());

    setBeginnerUnlocked(ca.completedActivities >= 10);
    setFastThinkerUnlocked(co.completedActivities >= 10);
    setStreakUnlocked(profile.consecutiveCorrect >= 5);

    setRecentSessions(gm.saveSystem.getSessionHistory().slice(0, 5));

    setCaMisconceptions(gm.saveSystem.getMisconceptionPatterns('COUNT_ALL'));
    setCoMisconceptions(gm.saveSystem.getMisconceptionPatterns('COUNT_ON'));
    setNbMisconceptions(gm.saveSystem.getMisconceptionPatterns('NUMBER_BONDS'));
  };

  const BAR_MAX = 30;

  const allMisconceptions = [
    ...caMisconceptions.map(m => ({ ...m, strategy: 'COUNT_ALL' })),
    ...coMisconceptions.map(m => ({ ...m, strategy: 'COUNT_ON' })),
    ...nbMisconceptions.map(m => ({ ...m, strategy: 'NUMBER_BONDS' })),
  ].sort((a, b) => b.failCount - a.failCount).slice(0, 4);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#FF6EC7', '#CF53F0', '#9B3FDE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>My Progress</Text>

        {/* Stars Badge */}
        <View style={styles.starsBadge}>
          <Text style={styles.starsEmoji}>⭐</Text>
          <Text style={styles.starsText}>{totalStars} Stars</Text>
        </View>

        {/* Achievement Badges */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏅 Achievements</Text>
          <View style={styles.badgesRow}>
            <BadgeItem emoji="🌟" label="Beginner" sublabel={beginnerUnlocked ? `${caCompleted} done` : 'Locked'} unlocked={beginnerUnlocked} />
            <BadgeItem emoji="⚡" label="Fast Thinker" sublabel={fastThinkerUnlocked ? `${coCompleted} done` : 'Locked'} unlocked={fastThinkerUnlocked} />
            <BadgeItem emoji="🔥" label="Streak" sublabel={streakUnlocked ? `${streak} in a row` : 'Locked'} unlocked={streakUnlocked} />
          </View>
        </View>

        {/* Progress Bars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Strategy Progress</Text>
          <ProgressBar
            label="Count All" emoji="⭐" progress={Math.min(1, caCompleted / BAR_MAX)}
            accuracy={caAcc} completed={caCompleted} barColor="#66BB6A" unlocked
          />
          <ProgressBar
            label="Count On" emoji="⚡" progress={Math.min(1, coCompleted / BAR_MAX)}
            accuracy={coAcc} completed={coCompleted} barColor="#29B6F6" unlocked={countOnUnlocked}
          />
          <ProgressBar
            label="Number Bonds" emoji="🔗" progress={Math.min(1, nbCompleted / BAR_MAX)}
            accuracy={nbAcc} completed={nbCompleted} barColor="#FF7043" unlocked={numberBondsUnlocked}
          />
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

        {/* Accuracy Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Accuracy</Text>
          <View style={styles.accuracyRow}>
            <AccuracyDot label="Count All" value={caAcc} color="#66BB6A" />
            <AccuracyDot label="Count On" value={coAcc} color="#29B6F6" unlocked={countOnUnlocked} />
            <AccuracyDot label="Number Bonds" value={nbAcc} color="#FF7043" unlocked={numberBondsUnlocked} />
          </View>
        </View>

        {/* ── NEW: Response Time Section ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱ Response Time</Text>
          <Text style={styles.cardSubtitle}>Target: under 20 seconds per answer</Text>

          <ResponseTimeBar label="Count All" avgMs={caAvgMs} color="#66BB6A" unlocked />
          <ResponseTimeBar label="Count On" avgMs={coAvgMs} color="#29B6F6" unlocked={countOnUnlocked} />
          <ResponseTimeBar label="Number Bonds" avgMs={nbAvgMs} color="#FF7043" unlocked={numberBondsUnlocked} />

          {/* Fast streak */}
          <View style={styles.fastStreakRow}>
            <Text style={styles.fastStreakIcon}>⚡</Text>
            <View style={styles.fastStreakText}>
              <Text style={styles.fastStreakTitle}>Fast Streak</Text>
              <Text style={styles.fastStreakValue}>
                {fastStreak} consecutive answers under 20s
              </Text>
            </View>
          </View>
        </View>

        {/* ── NEW: Session History Section ───────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Recent Sessions</Text>
          {recentSessions.length === 0 ? (
            <Text style={styles.emptyText}>No sessions yet. Start playing!</Text>
          ) : (
            recentSessions.map((s, i) => <SessionHistoryRow key={i} session={s} />)
          )}
        </View>

        {/* ── NEW: Misconceptions / Focus Areas ─────────────────────────── */}
        {allMisconceptions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Focus Areas</Text>
            <Text style={styles.cardSubtitle}>Problems you've found tricky — keep practicing!</Text>
            {allMisconceptions.map((m, i) => {
              const stratInfo = STRATEGY_LABELS[m.strategy];
              return (
                <View key={i} style={styles.misconceptionRow}>
                  <Text style={styles.misconceptionEmoji}>{stratInfo?.emoji ?? '❓'}</Text>
                  <View style={styles.misconceptionInfo}>
                    <Text style={styles.misconceptionCombo}>{m.combo}</Text>
                    <Text style={styles.misconceptionStrategy}>{stratInfo?.label ?? m.strategy}</Text>
                  </View>
                  <View style={[styles.misconceptionBadge, { backgroundColor: stratInfo?.color ?? '#9E9E9E' }]}>
                    <Text style={styles.misconceptionBadgeText}>{m.failCount}×</Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.focusEncouragement}>
              💪 Keep practicing these — you'll get them!
            </Text>
          </View>
        )}

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
function BadgeItem({ emoji, label, sublabel, unlocked }: { emoji: string; label: string; sublabel: string; unlocked: boolean }) {
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
          <Text style={pbStyles.accuracy}>{unlocked ? `${accuracy}%` : '—'}</Text>
        </View>
        <View style={pbStyles.track}>
          <View style={[pbStyles.fill, { width: `${unlocked ? Math.round(progress * 100) : 0}%`, backgroundColor: unlocked ? barColor : '#BDBDBD' }]} />
        </View>
        <Text style={pbStyles.completed}>
          {unlocked ? `${completed} activities completed` : 'Locked — complete previous stage first'}
        </Text>
      </View>
    </View>
  );
}

// ─── Accuracy Dot ─────────────────────────────────────────────────────────────
function AccuracyDot({ label, value, color, unlocked = true }: { label: string; value: number; color: string; unlocked?: boolean }) {
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

// ─── Response Time Bar ────────────────────────────────────────────────────────
function ResponseTimeBar({ label, avgMs, color, unlocked }: { label: string; avgMs: number; color: string; unlocked: boolean }) {
  const avgSec = Math.round(avgMs / 1000);
  const TARGET_SEC = TARGET_RESPONSE_MS / 1000; // 20
  const progress = unlocked && avgSec > 0 ? Math.min(1, avgSec / TARGET_SEC) : 0;
  const isGood = unlocked && avgSec > 0 && avgSec <= TARGET_SEC;

  return (
    <View style={rtStyles.row}>
      <Text style={rtStyles.label}>{label}</Text>
      <View style={rtStyles.barWrapper}>
        <View style={rtStyles.track}>
          <View style={[rtStyles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: isGood ? color : '#FF7043' }]} />
          {/* Target line at 20s */}
          <View style={rtStyles.targetLine} />
        </View>
        <Text style={rtStyles.value}>
          {unlocked && avgSec > 0 ? `${avgSec}s` : '—'}
        </Text>
      </View>
      {unlocked && avgSec > 0 && (
        <Text style={[rtStyles.status, { color: isGood ? '#43A047' : '#FF7043' }]}>
          {isGood ? '✓' : '↓'}
        </Text>
      )}
    </View>
  );
}

// ─── Session History Row ─────────────────────────────────────────────────────
function SessionHistoryRow({ session }: { session: SessionRecord }) {
  const date = new Date(session.completedAt);
  const label = STRATEGY_LABELS[session.strategy];
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  return (
    <View style={shStyles.row}>
      <Text style={shStyles.emoji}>{label?.emoji ?? '📝'}</Text>
      <View style={shStyles.info}>
        <Text style={shStyles.label}>{label?.label ?? session.strategy}</Text>
        <Text style={shStyles.date}>{dateStr}</Text>
      </View>
      <View style={shStyles.stats}>
        <Text style={shStyles.acc}>{session.accuracyPct}%</Text>
        <Text style={shStyles.correct}>{session.totalCorrect}/{session.totalActivities}</Text>
      </View>
      <Text style={shStyles.stars}>⭐{session.totalStars}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingBottom: 110 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', textAlign: 'center', marginTop: 24, marginBottom: 14, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
  starsBadge: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#FFD700', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 40, alignItems: 'center', marginBottom: 20, elevation: 6, shadowColor: '#FF8F00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6 },
  starsEmoji: { fontSize: 28, marginRight: 10 },
  starsText: { fontSize: 24, fontWeight: '900', color: '#5D4037' },
  card: { backgroundColor: 'rgba(255,255,255,0.93)', marginHorizontal: 16, borderRadius: 24, padding: 18, marginBottom: 16, elevation: 6 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: '#4A148C', marginBottom: 10 },
  cardSubtitle: { fontSize: 12, color: '#9E9E9E', fontWeight: 'bold', marginBottom: 12, marginTop: -4 },
  badgesRow: { flexDirection: 'row', justifyContent: 'space-evenly' },
  accuracyRow: { flexDirection: 'row', justifyContent: 'space-around' },
  unlockHintRow: { marginTop: 12, backgroundColor: '#F3E5F5', borderRadius: 12, padding: 12, alignItems: 'center' },
  unlockHintText: { fontSize: 12, color: '#7B1FA2', fontWeight: 'bold', textAlign: 'center' },
  fastStreakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: '#FFF9C4', borderRadius: 14, padding: 12 },
  fastStreakIcon: { fontSize: 28, marginRight: 12 },
  fastStreakText: { flex: 1 },
  fastStreakTitle: { fontSize: 14, fontWeight: '900', color: '#F57F17' },
  fastStreakValue: { fontSize: 13, color: '#795548', fontWeight: 'bold', marginTop: 2 },
  emptyText: { color: '#9E9E9E', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  misconceptionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 10 },
  misconceptionEmoji: { fontSize: 22, marginRight: 10 },
  misconceptionInfo: { flex: 1 },
  misconceptionCombo: { fontSize: 18, fontWeight: '900', color: '#4E342E' },
  misconceptionStrategy: { fontSize: 11, color: '#9E9E9E', fontWeight: 'bold' },
  misconceptionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  misconceptionBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  focusEncouragement: { fontSize: 13, color: '#6D4C41', fontWeight: 'bold', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  backBtn: { marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  backBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 8, elevation: 20 },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  navIcon: { fontSize: 24, marginBottom: 3 },
  navText: { fontSize: 12, fontWeight: 'bold', color: '#616161' },
});

const badgeStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  circle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginBottom: 6, elevation: 4, shadowColor: '#FF8F00', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
  circleGrey: { backgroundColor: '#E0E0E0', shadowColor: '#9E9E9E' },
  emoji: { fontSize: 30 },
  label: { fontSize: 12, fontWeight: '900', color: '#4A148C', textAlign: 'center' },
  sublabel: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold', textAlign: 'center', marginTop: 2 },
});

const pbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  emoji: { fontSize: 26, marginRight: 10, marginTop: 2 },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 14, fontWeight: '900', color: '#4E342E' },
  accuracy: { fontSize: 13, fontWeight: 'bold', color: '#757575' },
  track: { height: 14, backgroundColor: '#E0E0E0', borderRadius: 7, overflow: 'hidden', marginBottom: 3 },
  fill: { height: '100%', borderRadius: 7 },
  completed: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold' },
});

const accStyles = StyleSheet.create({
  item: { alignItems: 'center' },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  value: { fontSize: 16, fontWeight: '900' },
  label: { fontSize: 10, color: '#616161', fontWeight: 'bold', textAlign: 'center', maxWidth: 80 },
});

const rtStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '900', color: '#4E342E', width: 85 },
  barWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { flex: 1, height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'visible', position: 'relative' },
  fill: { height: '100%', borderRadius: 5 },
  targetLine: { position: 'absolute', right: 0, top: -4, width: 3, height: 18, backgroundColor: '#FF7043', borderRadius: 2 },
  value: { fontSize: 13, fontWeight: '900', color: '#4E342E', width: 32, textAlign: 'right' },
  status: { fontSize: 16, fontWeight: '900', marginLeft: 4 },
});

const shStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, padding: 10, marginBottom: 8 },
  emoji: { fontSize: 22, marginRight: 10 },
  info: { flex: 1 },
  label: { fontSize: 13, fontWeight: '900', color: '#4E342E' },
  date: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold', marginTop: 2 },
  stats: { alignItems: 'flex-end', marginRight: 10 },
  acc: { fontSize: 16, fontWeight: '900', color: '#4A148C' },
  correct: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold' },
  stars: { fontSize: 14, fontWeight: '900', color: '#FF8F00' },
});
