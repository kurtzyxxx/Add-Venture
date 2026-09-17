import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// ─── Step 1: Trees & Equation ──────────────────────────────────────────────────
export const StepOneVisual: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      <View style={styles.equationRow}>
        <Animated.View style={[styles.equationPill, { backgroundColor: '#FFEBEE', transform: [{ scale: pulseAnim }] }]}>
          <Text style={[styles.equationText, { color: '#E53935' }]}>2</Text>
        </Animated.View>
        <Text style={styles.equationOperator}>+</Text>
        <Animated.View style={[styles.equationPill, { backgroundColor: '#E0F2F1', transform: [{ scale: pulseAnim }] }]}>
          <Text style={[styles.equationText, { color: '#00897B' }]}>3</Text>
        </Animated.View>
        <Text style={styles.equationOperator}>=</Text>
        <View style={[styles.equationPill, { backgroundColor: '#FFF9C4', borderWidth: 2, borderColor: '#FBC02D' }]}>
          <Text style={[styles.equationText, { color: '#F57F17' }]}>?</Text>
        </View>
      </View>

      <View style={styles.treesRow}>
        <View style={styles.miniTree}>
          <Text style={styles.treeHeader}>🌳 Tree 1</Text>
          <View style={styles.fruitCluster}>
            <Text style={styles.miniFruit}>🍎</Text>
            <Text style={styles.miniFruit}>🍎</Text>
          </View>
          <Text style={styles.treeCountBadge}>2 fruits</Text>
        </View>

        <Text style={styles.plusSign}>+</Text>

        <View style={styles.miniTree}>
          <Text style={styles.treeHeader}>🌳 Tree 2</Text>
          <View style={styles.fruitCluster}>
            <Text style={styles.miniFruit}>🍌</Text>
            <Text style={styles.miniFruit}>🍌</Text>
            <Text style={styles.miniFruit}>🍌</Text>
          </View>
          <Text style={styles.treeCountBadge}>3 fruits</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Step 2: Drag Tree 1 into Basket ──────────────────────────────────────────
export const StepTwoVisual: React.FC = () => {
  const dragY = useRef(new Animated.Value(0)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const basketBounce = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const runAnim = () => {
      if (!active) return;
      dragY.setValue(0);
      handOpacity.setValue(0);
      basketBounce.setValue(1);
      badgeScale.setValue(0);

      Animated.sequence([
        // Fade in hand
        Animated.timing(handOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        // Drag down
        Animated.timing(dragY, { toValue: 70, duration: 900, useNativeDriver: true }),
        // Basket bounce + counter badge pop
        Animated.parallel([
          Animated.sequence([
            Animated.timing(basketBounce, { toValue: 1.15, duration: 150, useNativeDriver: true }),
            Animated.timing(basketBounce, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
          Animated.spring(badgeScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]),
        // Hold
        Animated.delay(600),
        // Fade out
        Animated.timing(handOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(300),
      ]).start(() => {
        if (active) runAnim();
      });
    };

    runAnim();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      {/* Tree 1 container */}
      <View style={styles.demoTreeBox}>
        <Text style={styles.demoBoxTitle}>🌳 Tree 1 (Drag first!)</Text>
        <View style={styles.demoTreeFruitRow}>
          <Text style={styles.miniFruit}>🍎</Text>
          {/* Animated dragging fruit */}
          <Animated.View
            style={[
              styles.draggingFruitWrapper,
              { transform: [{ translateY: dragY }] },
            ]}
          >
            <Text style={styles.miniFruit}>🍎</Text>
            <Animated.Text style={[styles.handPointer, { opacity: handOpacity }]}>
              👆
            </Animated.Text>
          </Animated.View>
        </View>
      </View>

      {/* Drop arrow indicator */}
      <Text style={styles.arrowDown}>⬇️</Text>

      {/* Basket Drop Zone */}
      <Animated.View style={[styles.demoBasketBox, { transform: [{ scale: basketBounce }] }]}>
        <Text style={styles.demoBasketLabel}>🧺 Drop Zone / Basket</Text>
        <Animated.View style={[styles.counterPopBadge, { transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.counterPopText}>Count: 1!</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ─── Step 3: Drag Tree 2 into Basket ──────────────────────────────────────────
export const StepThreeVisual: React.FC = () => {
  const dragY = useRef(new Animated.Value(0)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const basketBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;
    const runAnim = () => {
      if (!active) return;
      dragY.setValue(0);
      handOpacity.setValue(0);
      basketBounce.setValue(1);

      Animated.sequence([
        Animated.timing(handOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(dragY, { toValue: 70, duration: 900, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(basketBounce, { toValue: 1.15, duration: 150, useNativeDriver: true }),
          Animated.timing(basketBounce, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(600),
        Animated.timing(handOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(300),
      ]).start(() => {
        if (active) runAnim();
      });
    };

    runAnim();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      <View style={styles.demoRowTwoTrees}>
        <View style={[styles.demoTreeBoxHalf, { backgroundColor: '#E8F5E9', opacity: 0.7 }]}>
          <Text style={styles.demoBoxTitle}>🌳 Tree 1</Text>
          <Text style={{ fontSize: 18, color: '#2E7D32', fontWeight: 'bold' }}>✓ Done</Text>
        </View>

        <View style={[styles.demoTreeBoxHalf, { borderColor: '#FFB300', borderWidth: 2 }]}>
          <Text style={[styles.demoBoxTitle, { color: '#E65100' }]}>🔓 Tree 2 Now!</Text>
          <Animated.View
            style={[
              styles.draggingFruitWrapper,
              { transform: [{ translateY: dragY }] },
            ]}
          >
            <Text style={styles.miniFruit}>🍌</Text>
            <Animated.Text style={[styles.handPointer, { opacity: handOpacity }]}>
              👆
            </Animated.Text>
          </Animated.View>
        </View>
      </View>

      <Text style={styles.arrowDown}>⬇️</Text>

      <Animated.View style={[styles.demoBasketBox, { transform: [{ scale: basketBounce }] }]}>
        <Text style={styles.demoBasketLabel}>🧺 Basket with all fruits!</Text>
        <View style={styles.basketFruitsRow}>
          <Text style={styles.miniFruit}>🍎</Text>
          <Text style={styles.miniFruit}>🍎</Text>
          <Text style={styles.miniFruit}>🍌</Text>
          <Text style={styles.miniFruit}>🍌</Text>
          <Text style={styles.miniFruit}>🍌</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Step 4: Tap Basket Fruits to Count ───────────────────────────────────────
export const StepFourVisual: React.FC = () => {
  const activeIdxAnim = useRef(new Animated.Value(0)).current;
  const [highlightIdx, setHighlightIdx] = React.useState(0);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count = (count + 1) % 5;
      setHighlightIdx(count);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  const fruits = [
    { emoji: '🍎', num: 1 },
    { emoji: '🍎', num: 2 },
    { emoji: '🍌', num: 3 },
    { emoji: '🍌', num: 4 },
    { emoji: '🍌', num: 5 },
  ];

  return (
    <View style={styles.cardVisualContainer}>
      <Text style={styles.hintSubtext}>Tap each fruit in the basket to hear its count!</Text>
      
      <View style={styles.basketTapContainer}>
        <View style={styles.basketFruitsRow}>
          {fruits.map((f, i) => {
            const isCurrent = highlightIdx === i;
            return (
              <View key={i} style={styles.fruitTapWrapper}>
                <View
                  style={[
                    styles.fruitTapCircle,
                    isCurrent && { transform: [{ scale: 1.25 }], borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
                  ]}
                >
                  <Text style={styles.miniFruit}>{f.emoji}</Text>
                  {isCurrent && (
                    <View style={styles.tapNumBadge}>
                      <Text style={styles.tapNumText}>{f.num}</Text>
                    </View>
                  )}
                </View>
                {isCurrent && <Text style={styles.tapHand}>👆</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.totalBadge}>
        <Text style={styles.totalBadgeText}>Total = 5 Fruits! 🎉</Text>
      </View>
    </View>
  );
};

// ─── Step 5: Pick Answer & Submit ─────────────────────────────────────────────
export const StepFiveVisual: React.FC = () => {
  const submitScale = useRef(new Animated.Value(1)).current;
  const starOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const runPulse = () => {
      if (!active) return;
      submitScale.setValue(1);
      starOpacity.setValue(0);

      Animated.sequence([
        Animated.delay(400),
        Animated.timing(submitScale, { toValue: 1.1, duration: 300, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(submitScale, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(starOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(800),
        Animated.timing(starOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        if (active) runPulse();
      });
    };
    runPulse();
    return () => { active = false; };
  }, []);

  const options = [3, 4, 5, 6];

  return (
    <View style={styles.cardVisualContainer}>
      {/* Number Options */}
      <View style={styles.optionsDemoRow}>
        {options.map(opt => {
          const isSelected = opt === 5;
          return (
            <View
              key={opt}
              style={[
                styles.demoOptionBtn,
                isSelected ? styles.demoOptionSelected : styles.demoOptionNormal,
              ]}
            >
              <Text style={styles.demoOptionText}>{opt}</Text>
              {isSelected && (
                <View style={styles.checkedBadge}>
                  <Text style={{ fontSize: 11, color: '#FFF' }}>✓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Stars popup */}
      <Animated.View style={[styles.starsRow, { opacity: starOpacity }]}>
        <Text style={{ fontSize: 24 }}>⭐ ⭐ ⭐</Text>
      </Animated.View>

      {/* Submit Button */}
      <Animated.View style={[styles.demoSubmitBtn, { transform: [{ scale: submitScale }] }]}>
        <Text style={styles.demoSubmitText}>Submit ✓</Text>
      </Animated.View>
    </View>
  );
};

// ─── Tutorial Steps Configuration ─────────────────────────────────────────────
export interface TutorialStepConfig {
  stepNumber: number;
  title: string;
  tagline: string;
  speechText: string;
  renderVisual: () => React.ReactNode;
}

export const COUNT_ALL_TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    stepNumber: 1,
    title: 'Look at the Trees!',
    tagline: 'Two trees have yummy fruits to count.',
    speechText: 'Welcome to Count All! Help Oliver count all the fruits from Tree 1 and Tree 2!',
    renderVisual: () => <StepOneVisual />,
  },
  {
    stepNumber: 2,
    title: 'Drag Tree 1 Fruits!',
    tagline: 'First, drag fruits from Tree 1 down into the basket.',
    speechText: 'First, drag the fruits from Tree 1 down to the basket. Listen to the number as each drops in!',
    renderVisual: () => <StepTwoVisual />,
  },
  {
    stepNumber: 3,
    title: 'Then Drag Tree 2!',
    tagline: 'Next, drag all fruits from Tree 2 to gather them together.',
    speechText: 'Next, Tree 2 unlocks! Drag all fruits from Tree 2 down into the basket to gather them all.',
    renderVisual: () => <StepThreeVisual />,
  },
  {
    stepNumber: 4,
    title: 'Tap to Count in Basket!',
    tagline: 'You can tap any fruit in the basket to count them.',
    speechText: 'You can tap any fruit in the basket to count them one by one!',
    renderVisual: () => <StepFourVisual />,
  },
  {
    stepNumber: 5,
    title: 'Pick Answer & Submit!',
    tagline: 'Tap the total number below and press Submit to win stars!',
    speechText: 'Tap the matching total number below, then press Submit to win stars! Good luck!',
    renderVisual: () => <StepFiveVisual />,
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
  treesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  miniTree: {
    backgroundColor: '#F1F8E9',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    padding: 10,
    alignItems: 'center',
    width: '42%',
  },
  treeHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#33691E',
    marginBottom: 6,
  },
  fruitCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 36,
  },
  miniFruit: {
    fontSize: 26,
    marginHorizontal: 3,
  },
  treeCountBadge: {
    marginTop: 4,
    backgroundColor: '#DCEDC8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#33691E',
  },
  plusSign: {
    fontSize: 22,
    fontWeight: '900',
    color: '#558B2F',
  },
  demoTreeBox: {
    backgroundColor: '#F9FBE7',
    borderWidth: 2,
    borderColor: '#DCE775',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    width: '80%',
  },
  demoTreeFruitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  demoBoxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#827717',
    marginBottom: 4,
  },
  draggingFruitWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  handPointer: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontSize: 24,
  },
  arrowDown: {
    fontSize: 18,
    marginVertical: 4,
  },
  demoBasketBox: {
    backgroundColor: '#E1F5FE',
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    width: '85%',
    minHeight: 55,
    justifyContent: 'center',
  },
  demoBasketLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0277BD',
  },
  counterPopBadge: {
    position: 'absolute',
    right: 8,
    top: -10,
    backgroundColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    elevation: 3,
  },
  counterPopText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  demoRowTwoTrees: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  demoTreeBoxHalf: {
    backgroundColor: '#FFFDE7',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1.5,
    borderColor: '#FFF59D',
  },
  basketFruitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  hintSubtext: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
    marginBottom: 8,
  },
  basketTapContainer: {
    backgroundColor: '#E0F7FA',
    borderWidth: 2,
    borderColor: '#80DEEA',
    borderRadius: 16,
    padding: 10,
    width: '95%',
    alignItems: 'center',
  },
  fruitTapWrapper: {
    alignItems: 'center',
    marginHorizontal: 3,
  },
  fruitTapCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#B2EBF2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapNumBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#FF6F00',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapNumText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tapHand: {
    fontSize: 18,
    marginTop: 2,
  },
  totalBadge: {
    marginTop: 10,
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 13,
  },
  optionsDemoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  demoOptionBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  demoOptionNormal: {
    backgroundColor: '#B0BEC5',
  },
  demoOptionSelected: {
    backgroundColor: '#FFCA28',
    borderWidth: 3,
    borderColor: '#FFA000',
  },
  demoOptionText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  checkedBadge: {
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
  starsRow: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoSubmitBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFF',
    marginTop: 4,
  },
  demoSubmitText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});
