import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';

type Props = NativeStackScreenProps<RootStackParamList, 'NumberBonds'>;

export default function NumberBondsScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);

  useEffect(() => {
    loadNewProblem();
  }, []);

  const loadNewProblem = () => {
    const p = GameManager.getInstance().generateProblem();
    setProblem(p);
    setSelectedAnswer(null);

    const opts = new Set([p.correctAnswer]);
    while(opts.size < 4) {
      const rand = p.correctAnswer + Math.floor(Math.random() * 7) - 3;
      if (rand > 0) opts.add(rand);
    }
    setOptions(Array.from(opts).sort((a,b) => a-b));
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === problem?.correctAnswer;
    const { feedback, starsEarned } = await GameManager.getInstance().submitAnswer(isCorrect, 2000);
    
    Alert.alert(isCorrect ? 'Correct!' : 'Incorrect', `${feedback}\nStars: ${starsEarned}`, [
      { text: isCorrect ? 'Next' : 'Try Again', onPress: () => { if(isCorrect) loadNewProblem(); } }
    ]);
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text>Back</Text></TouchableOpacity>
        <Text style={styles.title}>Number Bonds</Text>
        <TouchableOpacity onPress={() => Alert.alert('Hint', GameManager.getInstance().getHint(problem))} style={styles.hintButton}><Text>Hint</Text></TouchableOpacity>
      </View>

      <View style={styles.bondContainer}>
        {/* Whole */}
        <View style={styles.circleWhole}>
          <Text style={styles.circleText}>{problem.num1}</Text>
        </View>
        
        {/* Connectors (Simulated with lines/views) */}
        <View style={styles.connectorContainer}>
          <View style={styles.connectorLeft} />
          <View style={styles.connectorRight} />
        </View>

        {/* Parts */}
        <View style={styles.partsContainer}>
          <View style={styles.circlePart}>
            <Text style={styles.circleText}>{problem.num2}</Text>
          </View>
          <View style={styles.circlePartUnknown}>
            <Text style={styles.circleTextUnknown}>?</Text>
          </View>
        </View>
      </View>

      <View style={styles.answerArea}>
        <View style={styles.optionsContainer}>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={[styles.optionButton, selectedAnswer === opt && styles.optionSelected]} onPress={() => setSelectedAnswer(opt)}>
              <Text style={[styles.optionText, selectedAnswer === opt && styles.optionTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={submitAnswer}>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { padding: 10, backgroundColor: '#E0E0E0', borderRadius: 8 },
  hintButton: { padding: 10, backgroundColor: '#FFCA28', borderRadius: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E88E5' },
  bondContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circleWhole: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  circlePart: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  circlePartUnknown: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFCA28', justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#F57C00', borderStyle: 'dashed' },
  circleText: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
  circleTextUnknown: { fontSize: 40, fontWeight: 'bold', color: '#F57C00' },
  connectorContainer: { flexDirection: 'row', height: 40, width: 160, justifyContent: 'space-between' },
  connectorLeft: { width: 40, borderLeftWidth: 4, borderBottomWidth: 4, borderColor: '#999', transform: [{ skewX: '-45deg' }] },
  connectorRight: { width: 40, borderRightWidth: 4, borderBottomWidth: 4, borderColor: '#999', transform: [{ skewX: '45deg' }] },
  partsContainer: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginTop: 10 },
  answerArea: { padding: 20 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  optionButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  optionSelected: { backgroundColor: '#1E88E5' },
  optionText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  optionTextSelected: { color: '#FFF' },
  submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' }
});
