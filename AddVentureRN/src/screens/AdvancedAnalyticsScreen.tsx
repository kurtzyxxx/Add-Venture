import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Share, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { SessionRecord } from '../core/SaveSystem';

type Props = NativeStackScreenProps<RootStackParamList, 'AdvancedAnalytics'>;

export interface CompetencyPillar {
  key: string;
  name: string;
  strategyLabel: string;
  emoji: string;
  accuracy: number;
  avgResponseMs: number;
  tier: 'Mastered' | 'In Progress' | 'Needs Reinforcement';
  tierColor: string;
  tierEmoji: string;
  recentSessions: SessionRecord[];
}

const STRATEGY_DIAGNOSTICS: Record<string, { desc: string; advice: string }> = {
  COUNT_ALL: {
    desc: 'Foundational skill: One-to-one correspondence and combining discrete item sets into a single total.',
    advice: 'Practice combining tangible objects (beans, counters, toy fruits) out loud and reinforce counting all items from one.',
  },
  COUNT_ON: {
    desc: 'Intermediate mental model: Retaining the starting anchor addend in memory and counting forward.',
    advice: 'Encourage keeping the larger number in memory (the Starting Anchor) and counting forward only the extra items.',
  },
  NUMBER_BONDS: {
    desc: 'Abstract numeracy: Part-Part-Whole relationship and number composition/decomposition.',
    advice: 'Use physical part-part-whole diagrams or ten-frames on paper to visualize how parts combine to make the target whole.',
  },
};

export default function AdvancedAnalyticsScreen({ navigation }: Props) {
  const [pillars, setPillars] = useState<CompetencyPillar[]>([]);
  const [misconceptions, setMisconceptions] = useState<{ combo: string; failCount: number; strategy: string }[]>([]);
  const [allSessions, setAllSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const getMasteryTier = (acc: number): { tier: 'Mastered' | 'In Progress' | 'Needs Reinforcement'; color: string; emoji: string } => {
    if (acc >= 80) return { tier: 'Mastered', color: '#4CAF50', emoji: '🟢' };
    if (acc >= 50) return { tier: 'In Progress', color: '#FFA000', emoji: '🟡' };
    return { tier: 'Needs Reinforcement', color: '#E53935', emoji: '🔴' };
  };

  const loadAnalyticsData = () => {
    const gm = GameManager.getInstance();
    const save = gm.saveSystem;

    // 1. Calculate metrics for the 3 distinct Competency Pillars (FR-PM-01)
    const caAcc = save.getAccuracy('COUNT_ALL');
    const coAcc = save.getAccuracy('COUNT_ON');
    const nbAcc = save.getAccuracy('NUMBER_BONDS');

    const caTime = save.getAverageResponseTime('COUNT_ALL');
    const coTime = save.getAverageResponseTime('COUNT_ON');
    const nbTime = save.getAverageResponseTime('NUMBER_BONDS');

    const caHistory = save.getSessionHistoryForStrategy('COUNT_ALL').slice(0, 5);
    const coHistory = save.getSessionHistoryForStrategy('COUNT_ON').slice(0, 5);
    const nbHistory = save.getSessionHistoryForStrategy('NUMBER_BONDS').slice(0, 5);

    const caTier = getMasteryTier(caAcc);
    const coTier = getMasteryTier(coAcc);
    const nbTier = getMasteryTier(nbAcc);

    const pillarData: CompetencyPillar[] = [
      {
        key: 'COUNT_ALL',
        name: 'Combining Sets',
        strategyLabel: 'Count All',
        emoji: '🍎',
        accuracy: caAcc,
        avgResponseMs: caTime,
        tier: caTier.tier,
        tierColor: caTier.color,
        tierEmoji: caTier.emoji,
        recentSessions: caHistory,
      },
      {
        key: 'COUNT_ON',
        name: 'Mental Counting-On',
        strategyLabel: 'Count On',
        emoji: '⚡',
        accuracy: coAcc,
        avgResponseMs: coTime,
        tier: coTier.tier,
        tierColor: coTier.color,
        tierEmoji: coTier.emoji,
        recentSessions: coHistory,
      },
      {
        key: 'NUMBER_BONDS',
        name: 'Part-Part-Whole Relationships',
        strategyLabel: 'Number Bonds',
        emoji: '🔗',
        accuracy: nbAcc,
        avgResponseMs: nbTime,
        tier: nbTier.tier,
        tierColor: nbTier.color,
        tierEmoji: nbTier.emoji,
        recentSessions: nbHistory,
      },
    ];

    setPillars(pillarData);

    // 2. Fetch recurring misconceptions (failCount >= 2)
    const caMisc = save.getMisconceptionPatterns('COUNT_ALL', 3).map(m => ({ ...m, strategy: 'COUNT_ALL' }));
    const coMisc = save.getMisconceptionPatterns('COUNT_ON', 3).map(m => ({ ...m, strategy: 'COUNT_ON' }));
    const nbMisc = save.getMisconceptionPatterns('NUMBER_BONDS', 3).map(m => ({ ...m, strategy: 'NUMBER_BONDS' }));
    const combinedMisc = [...caMisc, ...coMisc, ...nbMisc].sort((a, b) => b.failCount - a.failCount);
    setMisconceptions(combinedMisc);

    // 3. Longitudinal session trends
    const recent = save.getSessionHistory().slice(0, 7);
    setAllSessions(recent);
  };

  // Export CSV / Printable Learner Summary Report (FR-PM-01)
  const handleExportReport = async () => {
    try {
      const dateStr = new Date().toLocaleDateString();
      let report = `ADD-VENTURE LEARNER DIAGNOSTIC REPORT\nGenerated: ${dateStr}\n\n`;
      report += `=== COMPETENCY PILLARS SUMMARY ===\n`;

      pillars.forEach(p => {
        report += `• ${p.name} (${p.strategyLabel}):\n`;
        report += `  - Mastery Tier: ${p.tier}\n`;
        report += `  - Accuracy: ${p.accuracy}%\n`;
        report += `  - Avg Speed: ${(p.avgResponseMs / 1000).toFixed(1)}s\n`;
      });

      report += `\n=== RECURRING LEARNING GAPS (failCount >= 2) ===\n`;
      if (misconceptions.length === 0) {
        report += `None detected. All practiced combinations meet proficiency.\n`;
      } else {
        misconceptions.forEach(m => {
          report += `• Combination ${m.combo} in ${m.strategy}: Failed ${m.failCount} times\n`;
          const advice = STRATEGY_DIAGNOSTICS[m.strategy]?.advice ?? '';
          report += `  Guidance: ${advice}\n`;
        });
      }

      report += `\n=== CSV FORMATTED EXPORT ===\n`;
      report += `"Strategy","Accuracy_Pct","Avg_Response_Sec","Mastery_Tier"\n`;
      pillars.forEach(p => {
        report += `"${p.name}",${p.accuracy},${(p.avgResponseMs / 1000).toFixed(1)},"${p.tier}"\n`;
      });

      await Share.share({
        title: 'Add-Venture Learner Diagnostic Summary',
        message: report,
      });
    } catch (err) {
      Alert.alert('Export Error', 'Unable to export diagnostic summary.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Diagnostics</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportReport} activeOpacity={0.8}>
          <Text style={styles.exportBtnText}>Export 📄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subtitle */}
        <Text style={styles.pageSubtitle}>Competency Pillars & Formative Evaluation</Text>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1: THREE CORE COMPETENCY PILLARS (FR-PM-01)
        ═══════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>🎯 Core Competency Pillars</Text>
        {pillars.map(pillar => (
          <View key={pillar.key} style={styles.pillarCard}>
            <View style={styles.pillarHeader}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarEmoji}>{pillar.emoji}</Text>
                <View>
                  <Text style={styles.pillarName}>{pillar.name}</Text>
                  <Text style={styles.pillarStrategyLabel}>Strategy: {pillar.strategyLabel}</Text>
                </View>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: pillar.tierColor }]}>
                <Text style={styles.tierBadgeText}>
                  {pillar.tierEmoji} {pillar.tier}
                </Text>
              </View>
            </View>

            {/* Metrics Row */}
            <View style={styles.pillarMetricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Accuracy</Text>
                <Text style={[styles.metricValue, { color: pillar.tierColor }]}>
                  {pillar.accuracy}%
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Avg. Speed</Text>
                <Text style={styles.metricValue}>
                  {pillar.avgResponseMs > 0 ? `${(pillar.avgResponseMs / 1000).toFixed(1)}s` : '—'}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Sessions</Text>
                <Text style={styles.metricValue}>{pillar.recentSessions.length}</Text>
              </View>
            </View>

            {/* Longitudinal Trend Sparkline */}
            <View style={styles.trendRow}>
              <Text style={styles.trendLabel}>Recent Session Trend:</Text>
              <View style={styles.sparklineContainer}>
                {pillar.recentSessions.length === 0 ? (
                  <Text style={styles.noTrendText}>No session records yet</Text>
                ) : (
                  pillar.recentSessions.slice(0, 5).reverse().map((s, idx) => {
                    const heightPct = Math.max(15, s.accuracyPct);
                    const barColor = s.accuracyPct >= 80 ? '#4CAF50' : s.accuracyPct >= 50 ? '#FFA000' : '#E53935';
                    return (
                      <View key={idx} style={styles.sparklineBarWrap}>
                        <View style={[styles.sparklineBar, { height: `${heightPct}%`, backgroundColor: barColor }]} />
                        <Text style={styles.sparklineBarText}>{s.accuracyPct}%</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* Pedagogical Description */}
            <Text style={styles.pillarDesc}>
              {STRATEGY_DIAGNOSTICS[pillar.key]?.desc}
            </Text>
          </View>
        ))}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: RECURRING MISCONCEPTIONS & LEARNING GAPS (failCount >= 2)
        ═══════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>⚠️ Identified Learning Gaps</Text>
        <View style={styles.card}>
          {misconceptions.length === 0 ? (
            <View style={styles.emptyMisconceptionWrap}>
              <Text style={styles.checkIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>No recurring gaps detected!</Text>
              <Text style={styles.emptyText}>
                Your learner demonstrates consistent mastery across all tested combinations.
              </Text>
            </View>
          ) : (
            misconceptions.map((m, idx) => {
              const diag = STRATEGY_DIAGNOSTICS[m.strategy];
              return (
                <View key={idx} style={styles.misconceptionCard}>
                  <View style={styles.miscTopRow}>
                    <View style={styles.miscAlertBadge}>
                      <Text style={styles.miscAlertText}>!</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miscCombo}>Combination: {m.combo}</Text>
                      <Text style={styles.miscSub}>
                        Flagged in {m.strategy} • Failed {m.failCount} times
                      </Text>
                    </View>
                  </View>
                  <View style={styles.adviceBox}>
                    <Text style={styles.adviceTitle}>💡 Recommended Pedagogical Intervention:</Text>
                    <Text style={styles.adviceBody}>{diag?.advice}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: ACTIONABLE EDUCATOR / PARENT RECOMMENDATIONS
        ═══════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>📋 Actionable Learning Plan</Text>
        <View style={styles.recommendationCard}>
          <Text style={styles.recTitle}>✨ Personalized Next Steps:</Text>
          {pillars.some(p => p.tier === 'Needs Reinforcement') ? (
            <Text style={styles.recText}>
              • Prioritize reinforcement on{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {pillars.filter(p => p.tier === 'Needs Reinforcement').map(p => p.name).join(', ')}
              </Text>
              . Focus on physical manipulatives (blocks/beans) to ground abstract equations into tactile counts.
            </Text>
          ) : pillars.some(p => p.tier === 'In Progress') ? (
            <Text style={styles.recText}>
              • Consistent progress is underway. Practice 1 daily 10-problem session to build counting-on speed and transition to mental anchors.
            </Text>
          ) : (
            <Text style={styles.recText}>
              • Outstanding work! Your learner has achieved mastery across all foundational single-digit addition pillars. Encourage independent challenge sessions.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E1066', // Rich deep purple background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  exportBtn: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    elevation: 3,
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#E1BEE7',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD54F',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // Pillar Cards (FR-PM-01)
  pillarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillarEmoji: {
    fontSize: 28,
  },
  pillarName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2E1C14',
  },
  pillarStrategyLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  pillarMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '700',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#37474F',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
  },

  // Trend Sparkline
  trendRow: {
    marginBottom: 10,
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#616161',
    marginBottom: 6,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  noTrendText: {
    fontSize: 11,
    color: '#9E9E9E',
    fontStyle: 'italic',
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
  },
  sparklineBarWrap: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  sparklineBar: {
    width: 16,
    borderRadius: 4,
  },
  sparklineBarText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 2,
  },
  pillarDesc: {
    fontSize: 12,
    color: '#616161',
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // General Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  emptyMisconceptionWrap: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  checkIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2E7D32',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 16,
  },
  misconceptionCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FFE082',
  },
  miscTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  miscAlertBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E65100',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miscAlertText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  miscCombo: {
    fontSize: 15,
    fontWeight: '900',
    color: '#D84315',
  },
  miscSub: {
    fontSize: 11,
    color: '#795548',
    fontWeight: '600',
  },
  adviceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3.5,
    borderLeftColor: '#FFB300',
  },
  adviceTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E65100',
    marginBottom: 2,
  },
  adviceBody: {
    fontSize: 12,
    color: '#4E342E',
    lineHeight: 16,
  },

  // Recommendations Card
  recommendationCard: {
    backgroundColor: '#EDE7F6',
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: '#D1C4E9',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#512DA8',
    marginBottom: 6,
  },
  recText: {
    fontSize: 13,
    color: '#311B92',
    lineHeight: 18,
  },
});
