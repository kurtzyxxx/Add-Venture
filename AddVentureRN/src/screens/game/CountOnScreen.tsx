import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Alert, SafeAreaView } from 'react-native';
import * as Speech from 'expo-speech';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';

type Props = NativeStackScreenProps<RootStackParamList, 'CountOn'>;

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];

export default function CountOnScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [baseN, setBaseN] = useState(0);
  const [extraM, setExtraM] = useState(0);
  
  const [fruits, setFruits] = useState<{ id: string, emoji: string, dropped: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [dropCounter, setDropCounter] = useState(0);
  const [timer, setTimer] = useState(0);

  const dropZoneLayout = useRef<{x: number, y: number, width: number, height: number} | null>(null);

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
    
    // Count On usually starts with the larger number in the basket
    const base = Math.max(p.num1, p.num2);
    const extra = Math.min(p.num1, p.num2);
    setBaseN(base);
    setExtraM(extra);
    
    const newFruits: { id: string, emoji: string, dropped: boolean }[] = [];
    const emojiType = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    
    // We only spawn the 'extra' fruits to be dragged from the tree
    for (let i = 0; i < extra; i++) {
      newFruits.push({ id: `tree_${i}`, emoji: emojiType, dropped: false });
    }
    
    setFruits(newFruits);
    setDropCounter(0);
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
      
      const currentTotal = baseN + droppedCount;
      Speech.stop();
      Speech.speak(currentTotal.toString(), { rate: 0.9, pitch: 1.1 });
      
      return next;
    });
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
        <Text style={styles.mainTitle}>Count On</Text>
        
        <View style={styles.instructionCard}>
          <View style={styles.owlPlaceholder}>
            <Text style={{fontSize: 40}}>🦉</Text>
          </View>
          <Text style={styles.instructionText}>
            Help Oliver gather the additional number of fruits! He already has {baseN} fruits in his basket, and needs {extraM} more from the tree.
          </Text>
        </View>

        {/* Equation */}
        <View style={styles.equationContainer}>
          <Text style={[styles.equationNumber, { color: '#FF5252' }]}>{baseN}</Text>
          <Text style={styles.equationSymbol}> + </Text>
          <Text style={[styles.equationNumber, { color: '#00BFA5' }]}>{extraM}</Text>
          <Text style={styles.equationSymbol}> = </Text>
          <Text style={[styles.equationNumber, { color: '#FFCA28' }]}>?</Text>
        </View>

        {/* The Tree (Source) */}
        <View style={[styles.groupCard, { zIndex: 10 }]}>
          <View style={styles.groupHeader}>
            <Text style={styles.treeIcon}>🌳</Text>
            <Text style={styles.groupTitle}>The Tree</Text>
          </View>
          <View style={styles.fruitRow}>
            {fruits.filter(f => !f.dropped).map(fruit => (
              <DraggableFruit key={fruit.id} fruit={fruit} onDrop={() => handleDrop(fruit.id)} />
            ))}
            {fruits.filter(f => !f.dropped).length === 0 && (
              <Text style={styles.emptyTreeText}>No more fruits left!</Text>
            )}
          </View>
        </View>

        {/* Oliver's Basket (Drop Zone) */}
        <View style={styles.basketZone}>
          <View style={styles.groupHeader}>
            <Text style={styles.treeIcon}>🧺</Text>
            <Text style={[styles.groupTitle, { color: '#8D6E63' }]}>Oliver's Basket</Text>
          </View>
          
          <View style={styles.basketStats}>
            <Text style={styles.basketStatsText}>Fruits inside: {baseN + dropCounter}</Text>
          </View>

          <View style={styles.fruitRow}>
            {/* The static Base fruits inside the basket visually represented as one big icon or scattered */}
            <View style={styles.staticBasketBundle}>
               <Text style={{fontSize: 48}}>🧺</Text>
               <View style={styles.basketCountBadge}>
                 <Text style={styles.basketCountText}>{baseN}</Text>
               </View>
            </View>
            <Text style={styles.equationSymbol}> + </Text>
            
            {/* Dropped fruits */}
            {fruits.filter(f => f.dropped).map(fruit => (
              <View key={fruit.id} style={styles.droppedFruitWrapper}>
                <Text style={styles.emoji}>{fruit.emoji}</Text>
              </View>
            ))}
            
            {!allDropped && (
               <Text style={styles.dropZoneHint}>Drag fruits here!</Text>
            )}
          </View>
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

const DraggableFruit = ({ fruit, onDrop }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
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
    <Animated.View {...panResponder.panHandlers} style={[{ transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: 100 }]}>
      <View style={styles.fruitCircle}>
        <Text style={styles.emoji}>{fruit.emoji}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3E0' }, // slightly warm background for Count On
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  backButton: { padding: 8 },
  backIcon: { fontSize: 28, color: '#9E9E9E', transform: [{ scaleX: -1 }] },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#546E7A' },
  badgesContainer: { flexDirection: 'row' },
  badge: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 14, fontWeight: 'bold', color: '#FFCA28' },
  content: { flex: 1, padding: 16, zIndex: 10 },
  mainTitle: { fontSize: 24, fontWeight: '900', color: '#FF9800', textAlign: 'center', marginBottom: 12 },
  instructionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  owlPlaceholder: { width: 60, height: 60, backgroundColor: '#FFF', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 2 },
  instructionText: { flex: 1, fontSize: 16, color: '#37474F' },
  equationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  equationNumber: { fontSize: 48, fontWeight: '900' },
  equationSymbol: { fontSize: 40, fontWeight: '900', color: '#263238', marginHorizontal: 8 },
  
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  treeIcon: { fontSize: 24, marginRight: 8 },
  groupTitle: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  fruitRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  fruitCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F1F8E9', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#DCEDC8' },
  emoji: { fontSize: 32 },
  emptyTreeText: { color: '#9E9E9E', fontStyle: 'italic', paddingVertical: 20 },
  
  basketZone: { flex: 1, backgroundColor: '#EFEBE9', borderRadius: 16, borderWidth: 3, borderColor: '#BCAAA4', borderStyle: 'dashed', padding: 16, zIndex: 1, marginTop: 8 },
  basketStats: { position: 'absolute', top: 12, right: 12, backgroundColor: '#8D6E63', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  basketStatsText: { color: '#FFF', fontWeight: 'bold' },
  staticBasketBundle: { position: 'relative', margin: 10 },
  basketCountBadge: { position: 'absolute', right: -10, bottom: -5, backgroundColor: '#FF5252', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  basketCountText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  dropZoneHint: { color: '#BCAAA4', fontSize: 18, fontWeight: 'bold', marginLeft: 16 },
  droppedFruitWrapper: { margin: 4, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  
  answerArea: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
  optionsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  optionButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  optionSelected: { backgroundColor: '#FF9800' },
  optionText: { fontSize: 24, fontWeight: 'bold', color: '#37474F' },
  optionTextSelected: { color: '#FFF' },
  submitButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 30, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 20, fontWeight: '900' }
});
