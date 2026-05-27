import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Dimensions, Animated, PanResponder } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { GameManager } from '../../core/GameManager';
import { Problem } from '../../core/ProblemGenerator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { IncorrectModal } from '../../components/IncorrectModal';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'NumberBonds'>;

export default function NumberBondsScreen({ navigation }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [placedAnswer, setPlacedAnswer] = useState<number | null>(null);
  const [hintsDisabled, setHintsDisabled] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showIncorrectModal, setShowIncorrectModal] = useState(false);
  const [options, setOptions] = useState<number[]>([]);

  useEffect(() => {
    loadNewProblem();
  }, []);

  const loadNewProblem = () => {
    const p = GameManager.getInstance().generateProblem();
    setProblem(p);
    setPlacedAnswer(null);

    const profile = GameManager.getInstance().saveSystem.getProfile();
    setHintsDisabled(profile.consecutiveCorrect >= 3);

    // Narration for the problem
    Speech.stop();
    Speech.speak(`Let's figure it out! What number should we add to ${p.num2}, to get ${p.num1}?`, { 
      rate: 0.95, 
      pitch: 1.4 // Higher pitch makes it sound more animated/child-like
    });

    const opts = new Set([p.correctAnswer]);
    while(opts.size < 5) {
      const rand = Math.floor(Math.random() * 9) + 1; // 1 to 9
      opts.add(rand);
    }
    setOptions(Array.from(opts).sort((a,b) => a-b));
  };

  const handleDrop = (answer: number) => {
    setPlacedAnswer(answer);
  };

  const submitCheck = async () => {
    if (placedAnswer === null) return;
    const isCorrect = placedAnswer === problem?.correctAnswer;
    const { feedback, starsEarned } = await GameManager.getInstance().submitAnswer(isCorrect, 2000);
    
    if (isCorrect) {
      Alert.alert('Correct!', `${feedback}\nStars: ${starsEarned}`, [
        { text: 'Next', onPress: () => loadNewProblem() }
      ]);
    } else {
      setShowIncorrectModal(true);
    }
  };

  const handleTryAgain = () => {
    setShowIncorrectModal(false);
    setPlacedAnswer(null);
    setOptions(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const useHint = () => {
    if (!problem || hintsRemaining <= 0) return;
    setHintsRemaining(prev => prev - 1);
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
        
        <View style={[styles.titleContainer, { flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4E342E', marginRight: 10 }}>Hints: {hintsRemaining}</Text>
          <Text style={styles.title}>Number Bonds</Text>
        </View>

        <TouchableOpacity 
          style={[styles.smallHintBtn, { opacity: hintsDisabled || hintsRemaining <= 0 ? 0.5 : 1 }]} 
          onPress={useHint}
          disabled={hintsDisabled || hintsRemaining <= 0}
        >
          <Text style={styles.smallHintText}>Hint</Text>
        </TouchableOpacity>
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

          {/* Bottom Right Circle (Unknown Part or Placed Answer) */}
          <View style={styles.circleUnknownWrapper}>
            {placedAnswer === null ? (
              <>
                <Text style={[styles.sparkle, { top: -10, left: -20 }]}>✨</Text>
                <Text style={[styles.sparkle, { bottom: -10, right: -20 }]}>✨</Text>
                <View style={[styles.circle, styles.circleUnknown]}>
                  <Text style={styles.circleTextUnknown}>?</Text>
                </View>
              </>
            ) : (
              <DraggablePlacedAnswer 
                answer={placedAnswer} 
                onRemove={() => setPlacedAnswer(null)} 
              />
            )}
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
          <DraggableOption 
            key={opt}
            opt={opt}
            color={optionColors[index % optionColors.length]}
            onDrop={() => handleDrop(opt)}
            hidden={placedAnswer === opt}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {placedAnswer !== null && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#66BB6A', width: '80%' }]} onPress={submitCheck}>
            <Text style={styles.actionBtnText}>Check</Text>
          </TouchableOpacity>
        )}
      </View>

      <IncorrectModal 
        visible={showIncorrectModal}
        onTryAgain={handleTryAgain}
        onHint={() => {
          setShowIncorrectModal(false);
          useHint();
        }}
        hintsRemaining={hintsRemaining}
      />
    </SafeAreaView>
  );
}

const DraggableOption = ({ opt, color, onDrop, hidden }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hidden,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dy < -80) {
          onDrop();
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    })
  ).current;

  return (
    <Animated.View {...panResponder.panHandlers} style={[
      styles.optionButton, 
      { backgroundColor: color, transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: 100 },
      hidden && { opacity: 0 }
    ]}>
      <View style={styles.optionInner}>
        <Text style={styles.optionText}>{opt}</Text>
      </View>
    </Animated.View>
  );
};

const DraggablePlacedAnswer = ({ answer, onRemove }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        // If dragged downwards by at least 50 pixels, consider it a drag-back
        if (gesture.dy > 50) {
          onRemove();
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  return (
    <Animated.View {...panResponder.panHandlers} style={[
      styles.circle, styles.circlePlaced,
      { transform: [{ translateX: pan.x }, { translateY: pan.y }], zIndex: 100 }
    ]}>
      <Text style={styles.circleText}>{answer}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7' },
  cloud: { position: 'absolute', color: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10 },
  circleButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  backIcon: { fontSize: 28, fontWeight: 'bold', color: '#4E342E' },
  starIcon: { fontSize: 24 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#4E342E', textShadowColor: '#FFF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 1 },
  smallHintBtn: { backgroundColor: '#FFCA28', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, elevation: 2 },
  smallHintText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  
  graphicContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
  circleTop: { borderWidth: 4, borderColor: '#D500F9', marginBottom: 20 },
  bottomCirclesContainer: { flexDirection: 'row', width: '70%', justifyContent: 'space-between', marginTop: 10 },
  circleBottomLeft: { borderWidth: 4, borderColor: '#00BCD4' },
  circleUnknownWrapper: { position: 'relative' },
  circleUnknown: { borderWidth: 4, borderColor: '#9C27B0', borderStyle: 'dashed' },
  circlePlaced: { borderWidth: 4, borderColor: '#66BB6A', backgroundColor: '#E8F5E9' },
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
