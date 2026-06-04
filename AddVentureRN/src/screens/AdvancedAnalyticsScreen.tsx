import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';

type Props = NativeStackScreenProps<RootStackParamList, 'AdvancedAnalytics'>;

const STRATEGY_LABELS: Record<string, string> = {
  COUNT_ALL: 'COUNT ALL',
  COUNT_ON: 'COUNT ON',
  NUMBER_BONDS: 'NUMBER BONDS',
};

const STRATEGY_HINTS: Record<string, string> = {
  COUNT_ALL: 'If your child is struggling with "Count All", try giving them physical objects like beans or blocks to count one by one out loud.',
  COUNT_ON: 'If your child is struggling with "Count On", try using a physical basket for the base number and only count the extras out loud.',
  NUMBER_BONDS: 'If your child is struggling with "Number Bonds", draw a simple part-part-whole diagram on paper so they can visualize the missing part.',
};

export default function AdvancedAnalyticsScreen({ navigation }: Props) {
  const [caAcc, setCaAcc] = useState(0);
  const [coAcc, setCoAcc] = useState(0);
  const [nbAcc, setNbAcc] = useState(0);

  const [caAvgMs, setCaAvgMs] = useState(0);
  const [coAvgMs, setCoAvgMs] = useState(0);
  const [nbAvgMs, setNbAvgMs] = useState(0);

  const [misconceptions, setMisconceptions] = useState<{ combo: string; failCount: number; strategy: string }[]>([]);

  useEffect(() => {
    const gm = GameManager.getInstance();

    setCaAcc(gm.saveSystem.getAccuracy('COUNT_ALL'));
    setCoAcc(gm.saveSystem.getAccuracy('COUNT_ON'));
    setNbAcc(gm.saveSystem.getAccuracy('NUMBER_BONDS'));

    setCaAvgMs(gm.saveSystem.getAverageResponseTime('COUNT_ALL'));
    setCoAvgMs(gm.saveSystem.getAverageResponseTime('COUNT_ON'));
    setNbAvgMs(gm.saveSystem.getAverageResponseTime('NUMBER_BONDS'));

    const ca = gm.saveSystem.getMisconceptionPatterns('COUNT_ALL').map(m => ({ ...m, strategy: 'COUNT_ALL' }));
    const co = gm.saveSystem.getMisconceptionPatterns('COUNT_ON').map(m => ({ ...m, strategy: 'COUNT_ON' }));
    const nb = gm.saveSystem.getMisconceptionPatterns('NUMBER_BONDS').map(m => ({ ...m, strategy: 'NUMBER_BONDS' }));

    const combined = [...ca, ...co, ...nb].sort((a, b) => b.failCount - a.failCount);
    setMisconceptions(combined.slice(0, 5)); // show top 5

  }, []);

  const getTargetTip = () => {
    if (misconceptions.length > 0) {
      return STRATEGY_HINTS[misconceptions[0].strategy] || STRATEGY_HINTS['COUNT_ALL'];
    }
    return "Great job! Keep practicing daily to maintain this accuracy!";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>Advanced Analytics & Learning Gaps</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Performance Trends Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Trends</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2, textAlign: 'left' }]}>Strategy</Text>
            <Text style={styles.tableCol}>Acc.</Text>
            <Text style={styles.tableCol}>Time(s)</Text>
          </View>
          <View style={styles.divider} />

          <TableRow strategy="COUNT ALL" acc={caAcc} avgMs={caAvgMs} />
          <TableRow strategy="COUNT ON" acc={coAcc} avgMs={coAvgMs} />
          <TableRow strategy="NUMBER BONDS" acc={nbAcc} avgMs={nbAvgMs} />
        </View>

        {/* Recurring Misconceptions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recurring Misconceptions</Text>
          <View style={styles.divider} />

          {misconceptions.length === 0 ? (
            <Text style={styles.emptyText}>No major misconceptions detected yet!</Text>
          ) : (
            misconceptions.map((m, idx) => (
              <View key={idx} style={styles.misconceptionBox}>
                <View style={styles.alertCircle}>
                  <Text style={styles.alertIcon}>!</Text>
                </View>
                <View style={styles.misconceptionContent}>
                  <Text style={styles.misconceptionTitle}>{m.combo.toUpperCase()}</Text>
                  <Text style={styles.misconceptionSubtitle}>
                    In {STRATEGY_LABELS[m.strategy] || m.strategy} (Flagged: {m.failCount} times)
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Dynamic Tip Box */}
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            💡 <Text style={{ fontWeight: 'bold' }}>Tip:</Text> {getTargetTip()}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function TableRow({ strategy, acc, avgMs }: { strategy: string, acc: number, avgMs: number }) {
  const timeSec = avgMs > 0 ? (avgMs / 1000).toFixed(1) + 's' : '—';
  const accStr = acc > 0 ? `${acc}%` : '—';

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.rowCell, styles.rowStrategy]}>{strategy}</Text>
      <Text style={styles.rowCell}>{accStr}</Text>
      <Text style={styles.rowCell}>{timeSec}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5E2A9F', // Matches the deep purple background from the UI
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageTitle: {
    fontSize: 18,
    color: '#D1C4E9',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A148C',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tableCol: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9E9E9E',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  rowCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#757575',
    fontWeight: '600',
  },
  rowStrategy: {
    flex: 2,
    textAlign: 'left',
    color: '#424242',
    fontWeight: 'bold',
  },
  misconceptionBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  alertCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFB300',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  misconceptionContent: {
    flex: 1,
  },
  misconceptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  misconceptionSubtitle: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  tipBox: {
    backgroundColor: '#7E57C2',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#9575CD',
  },
  tipText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  }
});
