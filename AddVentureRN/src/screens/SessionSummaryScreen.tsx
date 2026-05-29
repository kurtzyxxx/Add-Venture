import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionSummary'>;

export default function SessionSummaryScreen({ route, navigation }: Props) {
  const { stars, activities, correct, recurringErrors } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete!</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statText}>Activities: {activities}</Text>
        <Text style={styles.statText}>Correct: {correct}</Text>
        <Text style={styles.statText}>Accuracy: {Math.round((correct / activities) * 100) || 0}%</Text>
        <Text style={styles.starsText}>⭐ +{stars} Stars!</Text>
        <View style={styles.practiceBox}>
          <Text style={styles.practiceTitle}>Areas Needing Practice:</Text>
          <Text style={styles.practiceText}>
            {recurringErrors && recurringErrors.length > 0 
              ? recurringErrors.join(', ')
              : (correct === activities ? "None! Perfect Score!" : "Keep practicing!")}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 40,
  },
  statsCard: {
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    elevation: 4,
  },
  statText: {
    fontSize: 24,
    color: '#333',
    marginBottom: 12,
  },
  starsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFB300',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#FFCA28',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  practiceBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 5,
  },
  practiceText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
  }
});
