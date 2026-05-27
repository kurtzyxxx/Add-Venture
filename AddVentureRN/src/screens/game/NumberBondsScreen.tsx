import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

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

    // Narration for the problem
    Speech.stop();
    Speech.speak(`Let's figure it out! What number should we add to ${p.num2}, to get ${p.num1}?`, { 
      rate: 0.95, 
      pitch: 1.4 // Higher pitch makes it sound more animated/child-like
    });

    const opts = new Set([p.correctAnswer]);
    while(opts.size < 5) {
      const rand = p.correctAnswer + Math.floor(Math.random() * 7) - 3;
      if (rand > 0 && rand <= 9) opts.add(rand);
    }
    setOptions(Array.from(opts).sort((a,b) => a-b));
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === problem?.correctAnswer;
    const { feedback, starsEarned } = await GameManager.getInstance().submitAnswer(isCorrect, 2000);
    
    Alert.alert(isCorrect ? 'Correct!' : 'Incorrect', `${feedback}\nStars: ${starsEarned}`, [
      { text: isCorrect ? 'Next' : 'Try Again', onPress: () => { 
          if(isCorrect) {
            loadNewProblem(); 
          } else {
            setSelectedAnswer(null);
          }
      }}
    ]);
  };

  const useHint = () => {
    if (!problem) return;
    Alert.alert('Hint', GameManager.getInstance().getHint(problem));
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#A5D6A7', '#B2DFDB']}
        style={StyleSheet.absoluteFill}
      />

      {/* Cloud Decorations */}
      <Text style={[styles.cloud, { top: '15%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '25%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '65%', left: '5%', fontSize: 70, opacity: 0.5 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '75%', right: '0%', fontSize: 90, opacity: 0.5 }]}>☁️</Text>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Number Bonds</Text>
        </View>

        <View style={styles.circleButton}>
          <Text style={styles.starIcon}>⭐</Text>
        </View>
      </View>

      {/* Graphic Area */}
      <View style={styles.graphicContainer}>
        {/* Connectors drawn with basic Views to prevent native module crashes */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ position: 'absolute', width: 4, height: 140, backgroundColor: '#4E342E', transform: [{ translateX: -45 }, { translateY: -10 }, { rotate: '40deg' }] }} />
          <View style={{ position: 'absolute', width: 4, height: 140, backgroundColor: '#4E342E', transform: [{ translateX: 45 }, { translateY: -10 }, { rotate: '-40deg' }] }} />
        </View>

        {/* Top Circle (Total) */}
        <View style={[styles.circle, styles.circleTop]}>
          <Text style={styles.circleText}>{problem.num1}</Text>
        </View>

        <View style={styles.bottomCirclesContainer}>
          {/* Bottom Left Circle (Known Part) */}
          <View style={[styles.circle, styles.circleBottomLeft]}>
            <Text style={styles.circleText}>{problem.num2}</Text>
          </View>

          {/* Bottom Right Circle (Unknown Part) */}
          <View style={styles.circleUnknownWrapper}>
            <Text style={[styles.sparkle, { top: -10, left: -20 }]}>✨</Text>
            <Text style={[styles.sparkle, { bottom: -10, right: -20 }]}>✨</Text>
            <View style={[styles.circle, styles.circleUnknown]}>
              <Text style={styles.circleTextUnknown}>?</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Instruction */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>Fill in the missing part!</Text>
        <Text style={styles.arrowIcon}>⤴</Text>
      </View>

      {/* Options Row */}
      <View style={styles.optionsContainer}>
        {options.map((opt, index) => (
          <TouchableOpacity 
            key={opt} 
            style={[
              styles.optionButton, 
              { backgroundColor: optionColors[index % optionColors.length] },
              selectedAnswer === opt && styles.optionSelected
            ]} 
            onPress={() => setSelectedAnswer(opt)}
            activeOpacity={0.8}
          >
            <View style={styles.optionInner}>
              <Text style={styles.optionText}>{opt}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFCA28' }]} onPress={useHint}>
          <Text style={styles.actionBtnText}>Hint</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#66BB6A' }]} onPress={submitAnswer}>
          <Text style={styles.actionBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  cloud: { position: 'absolute', color: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10 },
  circleButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  backIcon: { fontSize: 28, fontWeight: 'bold', color: '#4E342E' },
  starIcon: { fontSize: 24 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  
  graphicContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
  circleTop: { borderWidth: 4, borderColor: '#D500F9', marginBottom: 20 },
  bottomCirclesContainer: { flexDirection: 'row', width: '70%', justifyContent: 'space-between', marginTop: 10 },
  circleBottomLeft: { borderWidth: 4, borderColor: '#00BCD4' },
  circleUnknownWrapper: { position: 'relative' },
  circleUnknown: { borderWidth: 4, borderColor: '#9C27B0', borderStyle: 'dashed' },
  circleText: { fontSize: 48, fontWeight: '900', color: '#4E342E' },
  circleTextUnknown: { fontSize: 48, fontWeight: '900', color: '#9C27B0' },
  sparkle: { position: 'absolute', fontSize: 24, zIndex: 10 },
  
  instructionContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  instructionText: { fontSize: 24, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  arrowIcon: { fontSize: 32, color: '#4E342E', fontWeight: 'bold', transform: [{ rotate: '45deg' }], marginLeft: 10 },
  
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 30 },
  optionButton: { width: 60, height: 70, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.1 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 36, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 20, marginBottom: 30 },
  actionBtn: { flex: 0.45, paddingVertical: 16, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 24, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }
});
