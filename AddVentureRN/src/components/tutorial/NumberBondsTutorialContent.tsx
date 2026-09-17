import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TutorialStepConfig } from './CountAllTutorialContent';

// ─── Step 1: Meet the Number Bond Tree ─────────────────────────────────────────
export const NumberBondsStepOneVisual: React.FC = () => {
  const treePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(treePulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(treePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      {/* Mini Tree Illustration */}
      <Animated.View style={[styles.miniTreeIllustration, { transform: [{ scale: treePulse }] }]}>
        {/* Canopy */}
        <View style={styles.miniCanopy}>
          <Text style={styles.miniCanopyLabel}>🌳 Tree Branches (10 Fruits)</Text>
          <View style={styles.miniFruitRow}>
            <Text style={styles.tinyFruit}>🍎</Text>
            <Text style={styles.tinyFruit}>🍎</Text>
            <Text style={styles.tinyFruit}>🍎</Text>
            <Text style={styles.tinyFruit}>🍎</Text>
            <Text style={styles.tinyFruit}>🍎</Text>
          </View>
        </View>

        {/* Dual Baskets & Trunk */}
        <View style={styles.dualBasketsRow}>
          {/* Left basket */}
          <View style={styles.miniBasket}>
            <Text style={styles.basketIcon}>🧺</Text>
            <View style={styles.fixedBadge}>
              <Text style={styles.fixedBadgeText}>4</Text>
            </View>
          </View>

          {/* Plus sign */}
          <Text style={styles.plusSign}>+</Text>

          {/* Right basket */}
          <View style={[styles.miniBasket, styles.miniBasketRight]}>
            <Text style={styles.basketIcon}>🧺</Text>
            <View style={styles.missingBadge}>
              <Text style={styles.missingBadgeText}>?</Text>
            </View>
          </View>
        </View>

        {/* V-Bond Lines & Total */}
        <View style={styles.vBondContainer}>
          <Text style={styles.vLineText}>\  /</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>Total = 10</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Step 2: Check the Left Basket ───────────────────────────────────────────
export const NumberBondsStepTwoVisual: React.FC = () => {
  const highlightAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(highlightAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      <View style={styles.stepTwoCard}>
        <Animated.View style={[styles.focusBasketBox, { transform: [{ scale: highlightAnim }] }]}>
          <Text style={styles.basketIconLarge}>🧺</Text>
          <View style={styles.basketFruitsInside}>
            <Text style={{ fontSize: 18 }}>🍎 🍎 🍎 🍎</Text>
          </View>
          <View style={styles.partPill}>
            <Text style={styles.partPillText}>Fixed Part: 4</Text>
          </View>
        </Animated.View>

        <Text style={styles.explainText}>
          The left basket holds the known part (4). Look at the total on the trunk (10) to see what is missing!
        </Text>
      </View>
    </View>
  );
};

// ─── Step 3: Drag Fruits to Right Basket ──────────────────────────────────────
export const NumberBondsStepThreeVisual: React.FC = () => {
  const dragY = useRef(new Animated.Value(0)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const basketScale = useRef(new Animated.Value(1)).current;
  const [basketCount, setBasketCount] = useState(1);

  useEffect(() => {
    let active = true;
    let count = 1;

    const runDrag = () => {
      if (!active) return;
      dragY.setValue(0);
      handOpacity.setValue(0);
      basketScale.setValue(1);

      Animated.sequence([
        Animated.timing(handOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(dragY, { toValue: 65, duration: 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(basketScale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
          Animated.timing(basketScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(600),
        Animated.timing(handOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(300),
      ]).start(() => {
        if (active) {
          count = count >= 6 ? 1 : count + 1;
          setBasketCount(count);
          runDrag();
        }
      });
    };

    runDrag();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.cardVisualContainer}>
      {/* Tree canopy with drag fruit */}
      <View style={styles.demoCanopyBox}>
        <Text style={styles.demoCanopyTitle}>🌳 Tree Branches</Text>
        <View style={styles.demoBranchFruitRow}>
          <Text style={{ fontSize: 24 }}>🍎</Text>
          <Animated.View style={{ transform: [{ translateY: dragY }] }}>
            <Text style={{ fontSize: 24 }}>🍎</Text>
            <Animated.Text style={[styles.handPointer, { opacity: handOpacity }]}>
              👆
            </Animated.Text>
          </Animated.View>
          <Text style={{ fontSize: 24 }}>🍎</Text>
        </View>
      </View>

      <Text style={styles.arrowDown}>⬇️</Text>

      {/* Right basket drop area */}
      <Animated.View style={[styles.demoRightBasket, { transform: [{ scale: basketScale }] }]}>
        <Text style={styles.basketIconLarge}>🧺</Text>
        <Text style={styles.demoRightBasketLabel}>Right Basket (Answer Area)</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterBadgeText}>Added: {basketCount}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Step 4: Select Choice & Submit ───────────────────────────────────────────
export const NumberBondsStepFourVisual: React.FC = () => {
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
        Animated.timing(submitScale, { toValue: 1.12, duration: 250, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(submitScale, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(starOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
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

  const options = [4, 5, 6, 7];

  return (
    <View style={styles.cardVisualContainer}>
      <View style={styles.choicesRow}>
        {options.map(opt => {
          const isCorrect = opt === 6;
          return (
            <View
              key={opt}
              style={[
                styles.choiceBtn,
                isCorrect ? styles.choiceBtnSelected : styles.choiceBtnNormal,
              ]}
            >
              <Text style={styles.choiceBtnText}>{opt}</Text>
              {isCorrect && (
                <View style={styles.checkPill}>
                  <Text style={{ fontSize: 10, color: '#FFF' }}>✓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Animated.View style={[styles.starsBurst, { opacity: starOpacity }]}>
        <Text style={{ fontSize: 24 }}>⭐ 4 + 6 = 10! ⭐</Text>
      </Animated.View>

      <Animated.View style={[styles.submitButton, { transform: [{ scale: submitScale }] }]}>
        <Text style={styles.submitButtonText}>Submit ✓</Text>
      </Animated.View>
    </View>
  );
};

// ─── Tutorial Step Definitions ────────────────────────────────────────────────
export const NUMBER_BONDS_TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    stepNumber: 1,
    title: 'Meet the Number Bond Tree!',
    tagline: 'See the two baskets and the total number on the trunk.',
    speechText: 'Welcome to Number Bonds! The tree shows two baskets and the total number on the trunk!',
    renderVisual: () => <NumberBondsStepOneVisual />,
  },
  {
    stepNumber: 2,
    title: 'Check the Left Basket!',
    tagline: 'The left basket holds the fixed number pair.',
    speechText: 'The left basket already has a fixed number of fruits. Look at the total on the trunk to see how many we need in all!',
    renderVisual: () => <NumberBondsStepTwoVisual />,
  },
  {
    stepNumber: 3,
    title: 'Drag Fruits from Tree to Basket!',
    tagline: 'Drag fruits down from the branches into the right basket.',
    speechText: 'Drag fruits from the tree branches down into the right basket to fill in the missing number!',
    renderVisual: () => <NumberBondsStepThreeVisual />,
  },
  {
    stepNumber: 4,
    title: 'Select Choice & Submit!',
    tagline: 'Pick the matching number and tap Submit to win stars!',
    speechText: 'Pick the matching number below and press Submit to complete the bond and earn your stars! Have fun!',
    renderVisual: () => <NumberBondsStepFourVisual />,
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  cardVisualContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 180,
  },
  miniTreeIllustration: {
    alignItems: 'center',
    width: '95%',
  },
  miniCanopy: {
    backgroundColor: '#C8E6C9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#81C784',
    padding: 8,
    alignItems: 'center',
    width: '90%',
  },
  miniCanopyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  miniFruitRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tinyFruit: {
    fontSize: 20,
  },
  dualBasketsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  miniBasket: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFD54F',
    borderRadius: 20,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 66,
    height: 84,
  },
  miniBasketRight: {
    borderStyle: 'dashed',
    borderColor: '#FF9800',
  },
  basketIcon: {
    fontSize: 28,
  },
  basketIconLarge: {
    fontSize: 38,
  },
  fixedBadge: {
    backgroundColor: '#0288D1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  fixedBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  missingBadge: {
    backgroundColor: '#E65100',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  missingBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  plusSign: {
    fontSize: 24,
    fontWeight: '900',
    color: '#5D4037',
  },
  vBondContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  vLineText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#5D4037',
    letterSpacing: 10,
  },
  totalBadge: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  totalBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  stepTwoCard: {
    alignItems: 'center',
    width: '90%',
  },
  focusBasketBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2.5,
    borderColor: '#FFB300',
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: 140,
    height: 165,
  },
  basketFruitsInside: {
    marginVertical: 4,
  },
  partPill: {
    backgroundColor: '#0288D1',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  partPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  explainText: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  demoCanopyBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#A5D6A7',
    borderRadius: 14,
    padding: 6,
    alignItems: 'center',
    width: '80%',
  },
  demoCanopyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 2,
  },
  demoBranchFruitRow: {
    flexDirection: 'row',
    gap: 12,
    height: 36,
    alignItems: 'center',
  },
  handPointer: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontSize: 22,
  },
  arrowDown: {
    fontSize: 18,
    marginVertical: 4,
  },
  demoRightBasket: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
    borderRadius: 22,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
    height: 105,
  },
  demoRightBasketLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E65100',
  },
  counterBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  counterBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  choicesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  choiceBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  choiceBtnNormal: {
    backgroundColor: '#B0BEC5',
  },
  choiceBtnSelected: {
    backgroundColor: '#FFCA28',
    borderWidth: 3,
    borderColor: '#FFA000',
  },
  choiceBtnText: {
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
