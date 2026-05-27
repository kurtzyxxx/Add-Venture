import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export default function ProgressScreen({ navigation }: Props) {
  const allProgress = GameManager.getInstance().saveSystem.getAllProgress();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Progress</Text>
      
      {allProgress.map(p => (
        <View key={p.strategy} style={styles.card}>
          <Text style={styles.strategyName}>{p.strategy.replace('_', ' ')}</Text>
          <Text>Level: {p.unlockedLevel}</Text>
          <Text>Completed: {p.completedActivities}</Text>
          <Text>Accuracy: {p.totalAttempts > 0 ? Math.round((p.totalCorrect / p.totalAttempts) * 100) : 0}%</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#F5F5F5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  strategyName: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  button: { marginTop: 20, padding: 16, backgroundColor: '#1E88E5', borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
