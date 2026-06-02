import React, { useEffect, useState } from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AdaptiveProblem, RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { AudioManager } from '../core/AudioManager';

type Props = NativeStackScreenProps<RootStackParamList, 'AdaptiveMode'>;

const STRATEGY_LABELS: Record<string, string> = {
  COUNT_ALL: 'Count All',
  COUNT_ON: 'Count On',
  NUMBER_BONDS: 'Number Bonds',
};

const ROUTE_STRATEGIES: Record<'CountAll' | 'CountOn' | 'NumberBonds', string> = {
  CountAll: 'COUNT_ALL',
  CountOn: 'COUNT_ON',
  NumberBonds: 'NUMBER_BONDS',
};

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍍', '🍊'];

type ReviewFruit = {
  id: string;
  emoji: string;
  dropped: boolean;
  group?: 1 | 2;
};

export default function AdaptiveModeScreen({ route, navigation }: Props) {
  const { strategy, targetRoute, incorrectProblems } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [reviewFruits, setReviewFruits] = useState<ReviewFruit[]>([]);
  const [reviewFruitsIndex, setReviewFruitsIndex] = useState(-1);
  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const canLeaveRef = React.useRef(false);

  const currentProblem = incorrectProblems[currentIndex];

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (canLeaveRef.current) return;
      event.preventDefault();
    });
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      unsubscribe();
      backSubscription.remove();
    };
  }, [navigation]);

  useEffect(() => {
    AudioManager.stopSpeech();
    const introTimer = setTimeout(() => setIsIntroVisible(false), 2600);
    setTimeout(() => {
      AudioManager.speak(
        'You are entering Adaptive Mode. Let us review the questions you missed before the next level.',
        { rate: 0.9, pitch: 1.2 }
      );
    }, 300);

    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (isIntroVisible) return;
    setSelectedAnswer(null);
    setFeedback(null);
    if (!currentProblem) return;

    setOptions(createOptions(currentProblem));
    setReviewFruits(createReviewFruits(currentProblem, strategy));
    setReviewFruitsIndex(currentIndex);
    AudioManager.stopSpeech();
    setTimeout(() => {
      AudioManager.speak(getSpokenPrompt(currentProblem, strategy), { rate: 0.95, pitch: 1.3 });
    }, currentIndex === 0 ? 300 : 300);
  }, [currentIndex, currentProblem, isIntroVisible]);

  const handleSubmit = () => {
    if (!currentProblem || selectedAnswer === null) return;

    if (selectedAnswer !== currentProblem.correctAnswer) {
      setFeedback('incorrect');
      setSelectedAnswer(null);
      setOptions(prev => shuffleOptions(prev));
      AudioManager.stopSpeech();
      AudioManager.speak('Try again. You need to answer this one correctly to continue.', {
        rate: 0.95,
        pitch: 1.2,
      });
      return;
    }

    setFeedback('correct');
    AudioManager.stopSpeech();
    AudioManager.speak('Correct. Great review!', { rate: 0.95, pitch: 1.3 });
    setTimeout(handleNext, 700);
  };

  const handleDropFruit = (fruitId: string) => {
    setReviewFruits(prev => {
      const next = prev.map(fruit =>
        fruit.id === fruitId ? { ...fruit, dropped: true } : fruit
      );
      const droppedCount = next.filter(fruit => fruit.dropped).length;
      const countForSpeech = strategy === 'COUNT_ON'
        ? getCountOnBase(currentProblem) + droppedCount
        : droppedCount;

      AudioManager.stopSpeech();
      AudioManager.speak(`${countForSpeech}`, { rate: 0.95, pitch: 1.35 });
      return next;
    });
  };

  const handleResetFruits = () => {
    setReviewFruits(prev => prev.map(fruit => ({ ...fruit, dropped: false })));
    setSelectedAnswer(null);
    setFeedback(null);
    AudioManager.stopSpeech();
    AudioManager.speak('Fruits reset.', { rate: 0.95, pitch: 1.25 });
  };

  const handleNext = async () => {
    if (currentIndex < incorrectProblems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }

    const gm = GameManager.getInstance();
    const nextStrategy = ROUTE_STRATEGIES[targetRoute];
    await gm.saveSystem.setAdaptiveReviewPending(strategy, false);
    gm.startSession(nextStrategy);
    canLeaveRef.current = true;
    navigation.replace(targetRoute);
  };

  if (!currentProblem) {
    const gm = GameManager.getInstance();
    const nextStrategy = ROUTE_STRATEGIES[targetRoute];
    gm.saveSystem.setAdaptiveReviewPending(strategy, false).then(() => {
      gm.startSession(nextStrategy);
      canLeaveRef.current = true;
      navigation.replace(targetRoute);
    });
    return null;
  }

  const optionColors = ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A', '#29B6F6'];
  const isNumberBond = strategy === 'NUMBER_BONDS' || currentProblem.isMissingPart;
  const prompt = getVisualPrompt(currentProblem, strategy);
  const requiresDrag = requiresDragForStrategy(strategy);
  const canSelectAnswer = feedback !== 'correct';
  const canSubmit = selectedAnswer !== null && feedback !== 'correct';

  if (isIntroVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#7E57C2', '#26A69A', '#9CCC65']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.introWrap}>
          <View style={styles.introBadge}>
            <Text style={styles.introIcon}>✨</Text>
          </View>
          <Text style={styles.introKicker}>Adaptive Mode</Text>
          <Text style={styles.introTitle}>You are entering in Adaptive Mode</Text>
          <Text style={styles.introSubtitle}>
            Review the questions you missed before moving to the next level.
          </Text>
          <View style={styles.introLoadingTrack}>
            <View style={styles.introLoadingFill} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#7E57C2', '#26A69A', '#9CCC65']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.progressPill}>
        <Text style={styles.progressText}>
          Review {currentIndex + 1}/{incorrectProblems.length} · {STRATEGY_LABELS[strategy] ?? strategy}
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>
          {isNumberBond ? 'Find the missing part' : 'Solve this again'}
        </Text>
        <Text style={styles.equation}>{prompt}</Text>
        <View style={styles.oldAnswerBox}>
          <Text style={styles.oldAnswerText}>
            Last answer: {currentProblem.givenAnswer === -1 ? 'Time ran out' : currentProblem.givenAnswer}
          </Text>
        </View>
      </View>

      {requiresDrag && (
        <ReviewDragArea
          strategy={strategy}
          problem={currentProblem}
          fruits={reviewFruits}
          onDropFruit={handleDropFruit}
          onResetFruits={handleResetFruits}
        />
      )}

      <View style={styles.optionsContainer}>
        {options.map((opt, index) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.optionButton,
              { backgroundColor: optionColors[index % optionColors.length] },
              selectedAnswer === opt && styles.optionSelected,
            ]}
            onPress={() => {
              if (!canSelectAnswer) return;
              setSelectedAnswer(opt);
              setFeedback(null);
            }}
            disabled={!canSelectAnswer}
            activeOpacity={0.8}
          >
            <View style={styles.optionInner}>
              <Text style={styles.optionText}>{opt}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {feedback && (
        <View style={[styles.feedbackBox, feedback === 'correct' ? styles.correctBox : styles.incorrectBox]}>
          <Text style={styles.feedbackText}>
            {feedback === 'correct'
              ? 'Correct! You can continue.'
              : 'Try again before moving on.'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.actionBtn,
          {
            backgroundColor:
              feedback === 'correct'
                ? '#43A047'
                : canSubmit
                ? '#FFCA28'
                : '#9E9E9E',
          },
        ]}
        onPress={() => {
          if (canSubmit) handleSubmit();
        }}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        <Text style={styles.actionText}>
          {feedback === 'correct'
            ? currentIndex < incorrectProblems.length - 1
              ? 'Loading Next Review...'
              : 'Starting Next Level...'
            : 'Check Answer'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ReviewDragArea({
  strategy,
  problem,
  fruits,
  onDropFruit,
  onResetFruits,
}: {
  strategy: string;
  problem: AdaptiveProblem;
  fruits: ReviewFruit[];
  onDropFruit: (fruitId: string) => void;
  onResetFruits: () => void;
}) {
  const droppedFruits = fruits.filter(fruit => fruit.dropped);
  const undroppedFruits = fruits.filter(fruit => !fruit.dropped);
  const base = getCountOnBase(problem);
  const extra = getCountOnExtra(problem);
  const countAllGroupOneFinished = fruits.filter(fruit => fruit.group === 1 && !fruit.dropped).length === 0;

  if (strategy === 'COUNT_ON') {
    return (
      <View style={styles.dragSection}>
        <TouchableOpacity style={styles.dragResetButton} onPress={onResetFruits} activeOpacity={0.85}>
          <Text style={styles.dragResetIcon}>↻</Text>
        </TouchableOpacity>
        {undroppedFruits.length > 0 && (
          <View style={styles.fruitSourceCard}>
            <Text style={styles.fruitSourceTitle}>Tree</Text>
            <View style={styles.fruitRow}>
              {undroppedFruits.map(fruit => (
                <DraggableReviewFruit key={fruit.id} fruit={fruit} onDrop={() => onDropFruit(fruit.id)} />
              ))}
            </View>
          </View>
        )}
        <View style={styles.dropZone}>
          <View style={styles.staticBasketBundle}>
            <Text style={styles.basketEmoji}>🧺</Text>
            <View style={styles.basketCountBadge}>
              <Text style={styles.basketCountText}>{base}</Text>
            </View>
          </View>
          {droppedFruits.map(fruit => (
            <View key={fruit.id} style={styles.droppedFruitWrapper}>
              <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
            </View>
          ))}
          {droppedFruits.length === 0 && <Text style={styles.dropHint}>Drop fruits here</Text>}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.groupsWrapper}>
        {[1, 2].map(group => (
          <View key={group} style={[styles.groupCard, { zIndex: group === 1 ? 2 : 1 }]}>
            <View style={styles.groupHeader}>
              <Text style={styles.treeIcon}>🌳</Text>
              <Text style={styles.groupTitle}>Tree {group}</Text>
            </View>
            <View style={styles.fruitRow}>
              {fruits.filter(fruit => fruit.group === group && !fruit.dropped).map(fruit => (
                <DraggableReviewFruit
                  key={fruit.id}
                  fruit={fruit}
                  disabled={group === 2 && !countAllGroupOneFinished}
                  onDrop={() => onDropFruit(fruit.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.countAllDropZone}>
        {droppedFruits.length > 0 && (
          <TouchableOpacity style={styles.countAllDropResetButton} onPress={onResetFruits} activeOpacity={0.85}>
            <Text style={styles.dragResetIcon}>↻</Text>
          </TouchableOpacity>
        )}
        {droppedFruits.map(fruit => (
          <View key={fruit.id} style={styles.countAllDroppedFruitWrapper}>
            <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
          </View>
        ))}
        {droppedFruits.length === 0 && <Text style={styles.countAllDropHint}>Drag all fruits here to count!</Text>}
      </View>
    </>
  );
}

function DraggableReviewFruit({
  fruit,
  disabled = false,
  onDrop,
}: {
  fruit: ReviewFruit;
  disabled?: boolean;
  onDrop: () => void;
}) {
  const pan = React.useRef(new Animated.ValueXY()).current;
  const pressScale = React.useRef(new Animated.Value(1)).current;
  const disabledRef = React.useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        Animated.spring(pressScale, { toValue: 1.2, friction: 4, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        if (gesture.dy > 50) {
          onDrop();
          return;
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        opacity: disabled ? 0.45 : 1,
        zIndex: 100,
      }}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={styles.fruitCircle}>
          <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function getVisualPrompt(problem: AdaptiveProblem, strategy: string): string {
  if (strategy === 'NUMBER_BONDS' || problem.isMissingPart) {
    return `${problem.num2} + ? = ${problem.num1}`;
  }
  return `${problem.num1} + ${problem.num2} = ?`;
}

function getSpokenPrompt(problem: AdaptiveProblem, strategy: string): string {
  if (strategy === 'NUMBER_BONDS' || problem.isMissingPart) {
    return `What number goes with ${problem.num2} to make ${problem.num1}?`;
  }
  return `What is ${problem.num1} plus ${problem.num2}?`;
}

function requiresDragForStrategy(strategy: string): boolean {
  return strategy === 'COUNT_ALL' || strategy === 'COUNT_ON';
}

function createOptions(problem: AdaptiveProblem): number[] {
  const opts = new Set<number>([problem.correctAnswer]);
  while (opts.size < 5) {
    const spread = Math.max(9, problem.correctAnswer + 5);
    opts.add(Math.max(1, Math.floor(Math.random() * spread) + 1));
  }
  return shuffleOptions(Array.from(opts));
}

function createReviewFruits(problem: AdaptiveProblem, strategy: string): ReviewFruit[] {
  const emojiType1 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  let emojiType2 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  while (emojiType2 === emojiType1) {
    emojiType2 = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  }

  if (strategy === 'COUNT_ON') {
    return Array.from({ length: getCountOnExtra(problem) }, (_, index) => ({
      id: `extra_${index}`,
      emoji: emojiType1,
      dropped: false,
    }));
  }

  if (strategy === 'COUNT_ALL') {
    return [
      ...Array.from({ length: problem.num1 }, (_, index) => ({
        id: `g1_${index}`,
        emoji: emojiType1,
        dropped: false,
        group: 1 as const,
      })),
      ...Array.from({ length: problem.num2 }, (_, index) => ({
        id: `g2_${index}`,
        emoji: emojiType2,
        dropped: false,
        group: 2 as const,
      })),
    ];
  }

  return [];
}

function getCountOnBase(problem: AdaptiveProblem): number {
  return Math.max(problem.num1, problem.num2);
}

function getCountOnExtra(problem: AdaptiveProblem): number {
  return Math.min(problem.num1, problem.num2);
}

function shuffleOptions(options: number[]): number[] {
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (options.length > 1 && shuffled.every((value, index) => value === options[index])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  introWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  introBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFCA28',
    borderWidth: 5,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  introIcon: { fontSize: 52 },
  introKicker: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  introTitle: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 5,
  },
  introSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 14,
    textAlign: 'center',
  },
  introLoadingTrack: {
    width: 180,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 30,
    overflow: 'hidden',
  },
  introLoadingFill: {
    width: '68%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FFCA28',
  },
  header: { alignItems: 'center', marginBottom: 18 },
  kicker: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFF',
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  progressPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 18,
  },
  progressText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 8,
    padding: 22,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 22,
  },
  questionLabel: { color: '#546E7A', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  equation: { color: '#4E342E', fontSize: 46, fontWeight: '900', marginBottom: 14 },
  oldAnswerBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  oldAnswerText: { color: '#C62828', fontSize: 14, fontWeight: '900' },
  dragSection: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    position: 'relative',
  },
  dragResetButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFCA28',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    elevation: 5,
  },
  dragResetIcon: {
    color: '#4E342E',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  dragInstructionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
  },
  dragInstructionText: {
    flex: 1,
    color: '#4E342E',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  groupsWrapper: {
    zIndex: 10,
  },
  fruitSourceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    minHeight: 78,
    elevation: 2,
  },
  groupCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, marginBottom: 8, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  treeIcon: { fontSize: 20, marginRight: 6 },
  groupTitle: { fontSize: 14, fontWeight: 'bold', color: '#90A4AE' },
  fruitSourceTitle: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
    textAlign: 'center',
  },
  fruitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fruitCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  fruitEmoji: { fontSize: 28 },
  dropZone: {
    minHeight: 84,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(225,245,254,0.88)',
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countAllDropZone: {
    minHeight: 98,
    backgroundColor: '#E1F5FE',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#81D4FA',
    borderStyle: 'dashed',
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginTop: 4,
    marginBottom: 14,
    position: 'relative',
  },
  countAllDropResetButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFCA28',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 4,
  },
  droppedFruitWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    elevation: 2,
  },
  countAllDroppedFruitWrapper: {
    margin: 3,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  dropHint: {
    color: '#607D8B',
    fontSize: 14,
    fontWeight: '900',
  },
  countAllDropHint: {
    color: '#81D4FA',
    fontSize: 14,
    fontWeight: 'bold',
    position: 'absolute',
  },
  staticBasketBundle: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  basketEmoji: { fontSize: 38 },
  basketCountBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF5252',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  basketCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  optionButton: {
    width: 58,
    height: 66,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionSelected: { borderWidth: 4, borderColor: '#FFF', transform: [{ scale: 1.1 }] },
  optionInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
  },
  optionText: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  feedbackBox: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
    borderWidth: 2,
  },
  correctBox: { backgroundColor: '#E8F5E9', borderColor: '#43A047' },
  incorrectBox: { backgroundColor: '#FFEBEE', borderColor: '#E53935' },
  feedbackText: { color: '#263238', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  actionBtn: {
    width: '80%',
    alignSelf: 'center',
    marginTop: 'auto',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFF',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  actionText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
