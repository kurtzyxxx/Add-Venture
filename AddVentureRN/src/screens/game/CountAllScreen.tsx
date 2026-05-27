import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Alert, SafeAreaView } from 'react-native';
import * as Speech from 'expo-speech';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';

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

    Speech.stop();
    Speech.speak(`Help Oliver gather food! Let's count them all!`, { rate: 0.95, pitch: 1.4 });
    
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
      if (droppedCount === next.length) {
        Speech.speak(droppedCount.toString(), { rate: 0.95, pitch: 1.4 });
        Speech.speak("How many fruits in all?", { rate: 0.95, pitch: 1.4 });
      } else {
        Speech.speak(droppedCount.toString(), { rate: 0.95, pitch: 1.4 });
      }
      
      return next;
    });
  };

  const counterTimeout = useRef<any>(null);

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
        if (isCorrect) {
          loadNewProblem();
        } else {
          setOptions(prev => {
            const shuffled = [...prev];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
          });
          setSelectedAnswer(null);
        }
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

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#A5D6A7', '#B2DFDB']}
        style={StyleSheet.absoluteFill}
      />
      {/* Cloud Decorations */}
      <Text style={[styles.cloud, { top: '10%', left: '-5%', fontSize: 80, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '20%', right: '-10%', fontSize: 100, opacity: 0.6 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '60%', left: '5%', fontSize: 70, opacity: 0.5 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: '70%', right: '0%', fontSize: 90, opacity: 0.5 }]}>☁️</Text>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finishSession} style={styles.circleButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
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
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Count All</Text>
        </View>
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

        {/* Groups or Final Question */}
        {!allDropped ? (
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
        ) : (
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>How many fruits in all?</Text>
          </View>
        )}

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
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#66BB6A' }]} onPress={submitAnswer}>
            <Text style={styles.actionBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
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
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  cloud: { position: 'absolute', color: '#FFF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10 },
  circleButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  backIcon: { fontSize: 28, fontWeight: 'bold', color: '#4E342E' },
  titleContainer: { alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  timeText: { fontSize: 18, fontWeight: 'bold', color: '#4E342E' },
  badgesContainer: { flexDirection: 'row' },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, elevation: 2 },
  badgeText: { fontWeight: 'bold', color: '#FF9800' },
  content: { flex: 1, paddingHorizontal: 20 },
  instructionCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 20, alignItems: 'center', marginBottom: 20, elevation: 3 },
  owlPlaceholder: { width: 60, height: 60, backgroundColor: '#E0F7FA', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  instructionText: { flex: 1, fontSize: 16, color: '#4E342E', fontWeight: 'bold' },
  equationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  equationNumber: { fontSize: 48, fontWeight: '900' },
  equationSymbol: { fontSize: 40, fontWeight: '900', color: '#263238', marginHorizontal: 8 },
  groupsWrapper: { zIndex: 10 },
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, zIndex: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  treeIcon: { fontSize: 24, marginRight: 8 },
  groupTitle: { fontSize: 18, fontWeight: 'bold', color: '#90A4AE' },
  questionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  questionText: { fontSize: 36, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1, textAlign: 'center' },
  fruitRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  fruitCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#EEEEEE' },
  emoji: { fontSize: 32 },
  dropZone: { flex: 1, backgroundColor: '#E1F5FE', borderRadius: 16, borderWidth: 3, borderColor: '#81D4FA', borderStyle: 'dashed', padding: 16, justifyContent: 'center', alignItems: 'center', zIndex: 1, marginTop: 8 },
  dropZoneHint: { color: '#81D4FA', fontSize: 18, fontWeight: 'bold', position: 'absolute' },
  droppedFruitWrapper: { margin: 4 },
  dropCounterBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FF5252', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  dropCounterText: { color: '#FFF', fontWeight: 'bold', fontSize: 20 },
  answerArea: { backgroundColor: 'transparent', padding: 10 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 10, marginBottom: 20 },
  optionButton: { width: 60, height: 70, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.1 }] },
  optionInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 16 },
  optionText: { fontSize: 36, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 20 },
  actionBtn: { width: '60%', paddingVertical: 16, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, borderWidth: 3, borderColor: '#FFF' },
  actionBtnText: { fontSize: 24, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }
});
