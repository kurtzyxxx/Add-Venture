import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TutorialStepConfig } from './CountAllTutorialContent';

// ─── Step 1: Start with What Oliver Has ───────────────────────────────────────
export const CountOnStepOneVisual: React.FC = () => {
  const basketPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(basketPulse, { toValue: 1.1, duration: 700, useNativeDriver: true }),
        Animated.timing(basketPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      {/* Equation banner */}
      <View style={styles.equationRow}>
        <View style={[styles.equationPill, { backgroundColor: '#EDE7F6', borderWidth: 2, borderColor: '#B39DDB' }]}>
          <Text style={[styles.equationText, { color: '#512DA8' }]}>5</Text>
        </View>
        <Text style={styles.equationOperator}>+</Text>
        <View style={[styles.equationPill, { backgroundColor: '#E0F2F1', borderWidth: 2, borderColor: '#80CBC4' }]}>
          <Text style={[styles.equationText, { color: '#00796B' }]}>3</Text>
        </View>
        <Text style={styles.equationOperator}>=</Text>
        <View style={[styles.equationPill, { backgroundColor: '#FFF9C4', borderWidth: 2, borderColor: '#FBC02D' }]}>
          <Text style={[styles.equationText, { color: '#F57F17' }]}>?</Text>
        </View>
      </View>

      {/* Starting basket */}
      <Animated.View style={[styles.startBasketCard, { transform: [{ scale: basketPulse }] }]}>
        <Text style={styles.basketBigEmoji}>🧺</Text>
        <View style={styles.startBasketBadge}>
          <Text style={styles.startBasketBadgeText}>Start at 5!</Text>
        </View>
      </Animated.View>
      <Text style={styles.cardHintText}>No need to count 1, 2, 3, 4, 5—Oliver already has 5!</Text>
    </View>
  );
};

// ─── Step 2: Drag and Count On ────────────────────────────────────────────────
export const CountOnStepTwoVisual: React.FC = () => {
  const dragY = useRef(new Animated.Value(0)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const countBadgeScale = useRef(new Animated.Value(0)).current;
  const [demoCount, setDemoCount] = useState(6);

  useEffect(() => {
    let active = true;
    let currentStepCount = 6;

    const runDragAnim = () => {
      if (!active) return;
      dragY.setValue(0);
      handOpacity.setValue(0);
      countBadgeScale.setValue(0);

      Animated.sequence([
        // Show hand on tree fruit
        Animated.timing(handOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        // Drag fruit down
        Animated.timing(dragY, { toValue: 65, duration: 800, useNativeDriver: true }),
        // Pop count on badge
        Animated.spring(countBadgeScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.delay(650),
        // Fade out
        Animated.timing(handOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(200),
      ]).start(() => {
        if (active) {
          currentStepCount = currentStepCount === 6 ? 7 : currentStepCount === 7 ? 8 : 6;
          setDemoCount(currentStepCount);
          runDragAnim();
        }
      });
    };

    runDragAnim();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      {/* Tree with fruits */}
      <View style={styles.treeContainer}>
        <Text style={styles.treeHeader}>🌳 Tree (Count on 3 more)</Text>
        <View style={styles.treeFruitRow}>
          <Text style={styles.fruitEmoji}>🍎</Text>
          <Animated.View style={{ transform: [{ translateY: dragY }] }}>
            <Text style={styles.fruitEmoji}>🍎</Text>
            <Animated.Text style={[styles.handPointer, { opacity: handOpacity }]}>
              👆
            </Animated.Text>
          </Animated.View>
          <Text style={styles.fruitEmoji}>🍎</Text>
        </View>
      </View>

      <Text style={styles.arrowIcon}>⬇️</Text>

      {/* Basket with count-on badge */}
      <View style={styles.basketContainer}>
        <View style={styles.basketBaseRow}>
          <Text style={{ fontSize: 32 }}>🧺</Text>
          <View style={styles.baseNumberPill}>
            <Text style={styles.baseNumberPillText}>5</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#4E342E', marginHorizontal: 4 }}>+</Text>
          <Animated.View style={[styles.countOnPopBadge, { transform: [{ scale: countBadgeScale }] }]}>
            <Text style={styles.countOnPopText}>{demoCount}!</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

// ─── Step 3: Tap Basket to Hear Counts ─────────────────────────────────────────
export const CountOnStepThreeVisual: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % 3);
    }, 850);
    return () => clearInterval(timer);
  }, []);

  const extraFruits = [
    { num: 6, emoji: '🍎' },
    { num: 7, emoji: '🍎' },
    { num: 8, emoji: '🍎' },
  ];

  return (
    <View style={styles.cardVisualContainer}>
      <Text style={styles.cardHintText}>Tap any added fruit to hear its count!</Text>

      <View style={styles.interactiveBasketBox}>
        {/* Base bundle */}
        <View style={styles.staticBundle}>
          <Text style={{ fontSize: 36 }}>🧺</Text>
          <View style={styles.staticBundleBadge}>
            <Text style={styles.staticBundleText}>5</Text>
          </View>
        </View>

        <Text style={styles.plusDivider}>+</Text>

        {/* Added fruits */}
        <View style={styles.addedFruitsRow}>
          {extraFruits.map((item, idx) => {
            const isSelected = activeIdx === idx;
            return (
              <View key={item.num} style={styles.extraFruitItem}>
                <View
                  style={[
                    styles.extraFruitCircle,
                    isSelected && styles.extraFruitCircleActive,
                  ]}
                >
                  <Text style={styles.fruitEmoji}>{item.emoji}</Text>
                  <View style={[styles.numTag, isSelected && styles.numTagActive]}>
                    <Text style={styles.numTagText}>{item.num}</Text>
                  </View>
                </View>
                {isSelected && <Text style={styles.handSmall}>👆</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.resultBanner}>
        <Text style={styles.resultBannerText}>5 ... 6 ... 7 ... 8 in all! 🌟</Text>
      </View>
    </View>
  );
};

// ─── Step 4: Pick Answer & Submit ─────────────────────────────────────────────
export const CountOnStepFourVisual: React.FC = () => {
  const submitScale = useRef(new Animated.Value(1)).current;
  const starScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const runPulse = () => {
      if (!active) return;
      submitScale.setValue(1);
      starScale.setValue(0);

      Animated.sequence([
        Animated.delay(400),
        Animated.timing(submitScale, { toValue: 1.12, duration: 250, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(submitScale, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(starScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]),
        Animated.delay(900),
      ]).start(() => {
        if (active) runPulse();
      });
    };
    runPulse();
    return () => { active = false; };
  }, []);

  const options = [6, 7, 8, 9];

  return (
    <View style={styles.cardVisualContainer}>
      <View style={styles.optionsRow}>
        {options.map(opt => {
          const isCorrect = opt === 8;
          return (
            <View
              key={opt}
              style={[
                styles.optionBox,
                isCorrect ? styles.optionBoxCorrect : styles.optionBoxNormal,
              ]}
            >
              <Text style={styles.optionBoxText}>{opt}</Text>
              {isCorrect && (
                <View style={styles.checkPill}>
                  <Text style={{ fontSize: 10, color: '#FFF' }}>✓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Stars popup */}
      <Animated.View style={[styles.starsBurst, { transform: [{ scale: starScale }] }]}>
        <Text style={{ fontSize: 26 }}>⭐ ⭐ ⭐</Text>
      </Animated.View>

      {/* Submit button */}
      <Animated.View style={[styles.submitButton, { transform: [{ scale: submitScale }] }]}>
        <Text style={styles.submitButtonText}>Submit ✓</Text>
      </Animated.View>
    </View>
  );
};

// ─── Tutorial Step Definitions ────────────────────────────────────────────────
export const COUNT_ON_TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    stepNumber: 1,
    title: 'Start with Oliver’s Basket!',
    tagline: 'Oliver already has fruits. Start at that number!',
    speechText: 'Welcome to Count On! Oliver already has fruits in his basket. You do not need to count from 1—start at Oliver’s number!',
    renderVisual: () => <CountOnStepOneVisual />,
  },
  {
    stepNumber: 2,
    title: 'Drag & Count On!',
    tagline: 'Drag fruits from the tree to count on: 6, 7, 8!',
    speechText: 'Drag each fruit from the tree to the basket. Listen as Oliver counts on for each fruit that drops in!',
    renderVisual: () => <CountOnStepTwoVisual />,
  },
  {
    stepNumber: 3,
    title: 'Tap to Practice!',
    tagline: 'Tap any fruit in the basket to hear its count.',
    speechText: 'You can tap each fruit in the basket to hear: 6, 7, 8! That tells you the total!',
    renderVisual: () => <CountOnStepThreeVisual />,
  },
  {
    stepNumber: 4,
    title: 'Pick the Answer & Win!',
    tagline: 'Select the total number and press Submit for stars!',
    speechText: 'Pick the matching total number below and press Submit to win stars! You got this!',
    renderVisual: () => <CountOnStepFourVisual />,
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  cardVisualContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 180,
  },
  equationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  equationPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    elevation: 2,
  },
  equationText: {
    fontSize: 26,
    fontWeight: '900',
  },
  equationOperator: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4E342E',
    marginHorizontal: 8,
  },
  startBasketCard: {
    backgroundColor: '#F3E5F5',
    borderWidth: 2,
    borderColor: '#CE93D8',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 8,
  },
  basketBigEmoji: {
    fontSize: 48,
  },
  startBasketBadge: {
    backgroundColor: '#8E24AA',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: -8,
  },
  startBasketBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cardHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5D4037',
    textAlign: 'center',
    marginTop: 4,
  },
  treeContainer: {
    backgroundColor: '#F1F8E9',
    borderWidth: 2,
    borderColor: '#C8E6C9',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    width: '85%',
  },
  treeHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#33691E',
    marginBottom: 4,
  },
  treeFruitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    gap: 12,
  },
  fruitEmoji: {
    fontSize: 26,
  },
  handPointer: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontSize: 24,
  },
  arrowIcon: {
    fontSize: 18,
    marginVertical: 4,
  },
  basketContainer: {
    backgroundColor: '#E0F7FA',
    borderWidth: 2,
    borderColor: '#4DD0E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    width: '85%',
  },
  basketBaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseNumberPill: {
    backgroundColor: '#7E57C2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: -10,
  },
  baseNumberPillText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  countOnPopBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    elevation: 3,
  },
  countOnPopText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  interactiveBasketBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDE7',
    borderWidth: 2,
    borderColor: '#FFF59D',
    borderRadius: 18,
    padding: 12,
    width: '95%',
    marginVertical: 6,
  },
  staticBundle: {
    alignItems: 'center',
  },
  staticBundleBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#7E57C2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  staticBundleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  plusDivider: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4E342E',
    marginHorizontal: 10,
  },
  addedFruitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extraFruitItem: {
    alignItems: 'center',
  },
  extraFruitCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraFruitCircleActive: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
    transform: [{ scale: 1.2 }],
  },
  numTag: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#78909C',
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numTagActive: {
    backgroundColor: '#E65100',
  },
  numTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  handSmall: {
    fontSize: 16,
    marginTop: 2,
  },
  resultBanner: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  resultBannerText: {
    color: '#2E7D32',
    fontWeight: '900',
    fontSize: 13,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  optionBoxNormal: {
    backgroundColor: '#B0BEC5',
  },
  optionBoxCorrect: {
    backgroundColor: '#FFCA28',
    borderWidth: 3,
    borderColor: '#FFA000',
  },
  optionBoxText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  checkPill: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starsBurst: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFF',
    marginTop: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});
