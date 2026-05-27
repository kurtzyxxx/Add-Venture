import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionSummary'>;

export default function SessionSummaryScreen({ route, navigation }: Props) {
  const { stars, activities, correct } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete!</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statText}>Activities: {activities}</Text>
        <Text style={styles.statText}>Correct: {correct}</Text>
        <Text style={styles.starsText}>⭐ +{stars} Stars!</Text>
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
});
