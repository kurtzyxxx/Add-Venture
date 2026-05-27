import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Alert, SafeAreaView } from 'react-native';
import * as Speech from 'expo-speech';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';

type Props = NativeStackScreenProps<RootStackParamList, 'CountAll'>;

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];

export default function CountAllScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [fruits, setFruits] = useState<{ id: string, emoji: string, dropped: boolean, group: 1 | 2 }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [dropCounter, setDropCounter] = useState(0);
  const [showCounter, setShowCounter] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    loadNewProblem();
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadNewProblem = () => {
    const p = GameManager.getInstance().generateProblem();
    setProblem(p);
    
    const newFruits: { id: string, emoji: string, dropped: boolean, group: 1 | 2 }[] = [];
    const emojiType1 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    let emojiType2 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    while (emojiType1 === emojiType2) {
      emojiType2 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    }
    
    for (let i = 0; i < p.num1; i++) newFruits.push({ id: `g1_${i}`, emoji: emojiType1, dropped: false, group: 1 });
    for (let i = 0; i < p.num2; i++) newFruits.push({ id: `g2_${i}`, emoji: emojiType2, dropped: false, group: 2 });
    
    setFruits(newFruits);
    setDropCounter(0);
    setShowCounter(false);
    setSelectedAnswer(null);
    setTimer(0);

    const opts = new Set([p.correctAnswer]);
    while(opts.size < 4) {
      const rand = p.correctAnswer + Math.floor(Math.random() * 7) - 3;
      if (rand > 0) opts.add(rand);
    }
    setOptions(Array.from(opts).sort((a,b) => a-b));
  };

  const handleDrop = (fruitId: string) => {
    setFruits(prev => {
      const next = prev.map(f => f.id === fruitId ? { ...f, dropped: true } : f);
      const droppedCount = next.filter(f => f.dropped).length;
      setDropCounter(droppedCount);
      triggerDropCounter();
      
      Speech.stop();
      Speech.speak(droppedCount.toString(), { rate: 0.9, pitch: 1.1 });
      
      return next;
    });
  };

  const counterTimeout = useRef<NodeJS.Timeout | null>(null);

  const triggerDropCounter = () => {
    setShowCounter(true);
    if (counterTimeout.current) clearTimeout(counterTimeout.current);
    counterTimeout.current = setTimeout(() => {
      setShowCounter(false);
    }, 500);
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null) {
      Alert.alert('Hold on', 'Please select an answer first!');
      return;
    }
    
    const isCorrect = selectedAnswer === problem?.correctAnswer;
    const { feedback, starsEarned } = await GameManager.getInstance().submitAnswer(isCorrect, timer * 1000);
    
    Alert.alert(isCorrect ? 'Correct!' : 'Incorrect', `${feedback}\nStars Earned: ${starsEarned}`, [
      { text: isCorrect ? 'Next Problem' : 'Try Again', onPress: () => {
        if (isCorrect) loadNewProblem();
      }}
    ]);
  };

  const finishSession = () => {
    const session = GameManager.getInstance().endSession();
    if (session) {
      navigation.replace('SessionSummary', { 
        stars: session.totalStars, 
        activities: session.totalActivities,
        correct: session.totalCorrect 
      });
    }
  };

  if (!problem) return <View style={styles.container}><Text>Loading...</Text></View>;

  const allDropped = fruits.every(f => f.dropped);
  const isGroup1Finished = fruits.filter(f => f.group === 1 && !f.dropped).length === 0;
  const profile = GameManager.getInstance().saveSystem.getProfile();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finishSession} style={styles.backButton}>
          <Text style={styles.backIcon}>↩</Text>
        </TouchableOpacity>
        
        <Text style={styles.timeText}>Time: {formatTime(timer)}</Text>
        
        <View style={styles.badgesContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ +{profile.totalStars}</Text>
          </View>
          <View style={[styles.badge, { marginLeft: 8 }]}>
            <Text style={styles.badgeText}>L{profile.currentDifficulty}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <Text style={styles.mainTitle}>Count All</Text>
        <View style={styles.instructionCard}>
          <View style={styles.owlPlaceholder}>
            <Text style={{fontSize: 40}}>🦉</Text>
          </View>
          <Text style={styles.instructionText}>
            Help Oliver gather food! Count and drag the fruits to the drop zone.
          </Text>
        </View>

        {/* Equation */}
        <View style={styles.equationContainer}>
          <Text style={[styles.equationNumber, { color: '#FF5252' }]}>{problem.num1}</Text>
          <Text style={styles.equationSymbol}> + </Text>
          <Text style={[styles.equationNumber, { color: '#00BFA5' }]}>{problem.num2}</Text>
          <Text style={styles.equationSymbol}> = </Text>
          <Text style={[styles.equationNumber, { color: '#FFCA28' }]}>?</Text>
        </View>

        {/* Groups */}
        <View style={styles.groupsWrapper}>
          <View style={[styles.groupCard, { zIndex: 2 }]}>
            <View style={styles.groupHeader}>
              <Text style={styles.treeIcon}>🌳</Text>
              <Text style={styles.groupTitle}>Tree 1</Text>
            </View>
            <View style={styles.fruitRow}>
              {fruits.filter(f => f.group === 1 && !f.dropped).map(fruit => (
                <DraggableFruit key={fruit.id} fruit={fruit} disabled={false} onDrop={() => handleDrop(fruit.id)} />
              ))}
            </View>
          </View>

          <View style={[styles.groupCard, { zIndex: 1 }]}>
            <View style={styles.groupHeader}>
              <Text style={styles.treeIcon}>🌳</Text>
              <Text style={styles.groupTitle}>Tree 2</Text>
            </View>
            <View style={styles.fruitRow}>
              {fruits.filter(f => f.group === 2 && !f.dropped).map(fruit => (
                <DraggableFruit 
                  key={fruit.id} 
                  fruit={fruit} 
                  disabled={!isGroup1Finished} 
                  onDrop={() => handleDrop(fruit.id)} 
                />
              ))}
            </View>
          </View>
        </View>

        {/* Drop Zone */}
        <View style={styles.dropZone}>
          {!allDropped && <Text style={styles.dropZoneHint}>Drag all fruits here to count!</Text>}
          <View style={styles.fruitRow}>
            {fruits.filter(f => f.dropped).map(fruit => (
              <View key={fruit.id} style={styles.droppedFruitWrapper}>
                <Text style={styles.emoji}>{fruit.emoji}</Text>
              </View>
            ))}
          </View>
          {showCounter && (
            <View style={styles.dropCounterBadge}>
              <Text style={styles.dropCounterText}>{dropCounter}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Answer Area */}
      <View style={[styles.answerArea, { opacity: allDropped ? 1 : 0.5 }]} pointerEvents={allDropped ? 'auto' : 'none'}>
        <View style={styles.optionsContainer}>
          {options.map(opt => (
            <TouchableOpacity 
              key={opt} 
              style={[styles.optionButton, selectedAnswer === opt && styles.optionSelected]}
              onPress={() => setSelectedAnswer(opt)}
            >
              <Text style={[styles.optionText, selectedAnswer === opt && styles.optionTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={submitAnswer}>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const DraggableFruit = ({ fruit, onDrop, disabled }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dy > 50) {
          onDrop();
          return;
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    })
  ).current;

  return (
    <Animated.View {...panResponder.panHandlers} style={[{ transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: 100, opacity: disabled ? 0.5 : 1 }]}>
      <View style={styles.fruitCircle}>
        <Text style={styles.emoji}>{fruit.emoji}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9F6' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  backButton: { padding: 8 },
  backIcon: { fontSize: 28, color: '#9E9E9E', transform: [{ scaleX: -1 }] },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#546E7A' },
  badgesContainer: { flexDirection: 'row' },
  badge: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 14, fontWeight: 'bold', color: '#FFCA28' },
  content: { flex: 1, padding: 16, zIndex: 10 },
  mainTitle: { fontSize: 24, fontWeight: '900', color: '#FF5252', textAlign: 'center', marginBottom: 12 },
  instructionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  owlPlaceholder: { width: 60, height: 60, backgroundColor: '#FFF', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 2 },
  instructionText: { flex: 1, fontSize: 16, color: '#37474F' },
  equationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  equationNumber: { fontSize: 48, fontWeight: '900' },
  equationSymbol: { fontSize: 40, fontWeight: '900', color: '#263238', marginHorizontal: 8 },
  groupsWrapper: { zIndex: 10 },
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, zIndex: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  treeIcon: { fontSize: 24, marginRight: 8 },
  groupTitle: { fontSize: 18, fontWeight: 'bold', color: '#90A4AE' },
  fruitRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  fruitCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#EEEEEE' },
  emoji: { fontSize: 32 },
  dropZone: { flex: 1, backgroundColor: '#E1F5FE', borderRadius: 16, borderWidth: 3, borderColor: '#81D4FA', borderStyle: 'dashed', padding: 16, justifyContent: 'center', alignItems: 'center', zIndex: 1, marginTop: 8 },
  dropZoneHint: { color: '#81D4FA', fontSize: 18, fontWeight: 'bold', position: 'absolute' },
  droppedFruitWrapper: { margin: 4 },
  dropCounterBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FF5252', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  dropCounterText: { color: '#FFF', fontWeight: 'bold', fontSize: 20 },
  answerArea: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
  optionsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  optionButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  optionSelected: { backgroundColor: '#00BFA5' },
  optionText: { fontSize: 24, fontWeight: 'bold', color: '#37474F' },
  optionTextSelected: { color: '#FFF' },
  submitButton: { backgroundColor: '#00E676', padding: 16, borderRadius: 30, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 20, fontWeight: '900' }
});
