import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AudioManager } from '../../core/AudioManager';
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

        {/* V-Bond Lines & Total Fruits */}
        <View style={styles.vBondContainer}>
          <Text style={styles.vLineText}>\  /</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>TOTAL FRUITS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 110, marginTop: 2 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <Text key={i} style={{ fontSize: 13, marginHorizontal: 1 }}>🍎</Text>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Step 2: Count Left Basket First ──────────────────────────────────────────
export const NumberBondsStepTwoVisual: React.FC = () => {
  const [activeFruitIdx, setActiveFruitIdx] = useState(0);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count = (count + 1) % 4;
      setActiveFruitIdx(count);
    }, 850);
    return () => clearInterval(interval);
  }, []);

  const fruits = [1, 2, 3, 4];

  const handleFruitTap = (num: number) => {
    setActiveFruitIdx(num - 1);
    AudioManager.stopSpeech();
    AudioManager.speak(`${num}`, { rate: 0.95, pitch: 1.35 });
  };

  return (
    <View style={styles.cardVisualContainer}>
      <Text style={styles.explainText}>
        Count each fruit in the left basket first to know where to start!
      </Text>

      <View style={styles.stepTwoCard}>
        <View style={styles.focusBasketBox}>
          <Text style={styles.basketIconLarge}>🧺</Text>
          <View style={styles.leftBasketCountRow}>
            {fruits.map(num => {
              const isCounted = num <= activeFruitIdx + 1;
              const isCurrent = num === activeFruitIdx + 1;
              return (
                <TouchableOpacity
                  key={num}
                  activeOpacity={0.75}
                  onPress={() => handleFruitTap(num)}
                  style={styles.tapFruitWrapper}
                >
                  <View
                    style={[
                      styles.tapFruitCircle,
                      isCounted && { borderColor: '#FFB300', backgroundColor: '#FFF9C4' },
                      isCurrent && { transform: [{ scale: 1.2 }], borderColor: '#FF9800', elevation: 4 },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>🍎</Text>
                    {isCounted && (
                      <View style={styles.numTagBadge}>
                        <Text style={styles.numTagBadgeText}>{num}</Text>
                      </View>
                    )}
                  </View>
                  {isCurrent && <Text style={styles.tapHandMini}>👆</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.partPill}>
            <Text style={styles.partPillText}>Left Basket: 4 Fruits</Text>
          </View>
        </View>

        <Text style={styles.subExplainText}>
          Count 1, 2, 3, 4! Keep 4 in your head, then count on!
        </Text>
      </View>
    </View>
  );
};

// ─── Step 3: Drag & Count On to Right Basket ─────────────────────────────────
export const NumberBondsStepThreeVisual: React.FC = () => {
  const dragY = useRef(new Animated.Value(0)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const basketScale = useRef(new Animated.Value(1)).current;
  const [basketCount, setBasketCount] = useState(1);

  // Left basket has 4. Next number clue begins at 4 + 1 = 5, then 6, 7...
  const baseLeft = 4;
  const currentTotal = baseLeft + basketCount;

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
          count = count >= 3 ? 1 : count + 1;
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
      <Text style={styles.explainText}>
        Narrator starts counting from the next number of the left basket!
      </Text>

      {/* Canopy with draggable fruit */}
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

      {/* Dual preview: Left basket (4) + Right basket receiving fruit */}
      <View style={styles.dualBasketsPreviewRow}>
        <View style={styles.previewLeftBasket}>
          <Text style={{ fontSize: 20 }}>🧺</Text>
          <Text style={styles.previewBasketLabel}>Left: 4</Text>
        </View>
        <Text style={styles.plusSign}>+</Text>
        <Animated.View style={[styles.previewRightBasket, { transform: [{ scale: basketScale }] }]}>
          <Text style={{ fontSize: 20 }}>🧺</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              Count: {currentTotal}! ({baseLeft}+{basketCount})
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

// ─── Step 4: Tap Either Basket in Any Order to Count ──────────────────────────
export const NumberBondsTapToCountVisual: React.FC = () => {
  const [countedMap, setCountedMap] = useState<{ [key: string]: number }>({
    left_0: 1,
    right_0: 2,
  });
  const [highlightKey, setHighlightKey] = useState<string | null>('right_0');

  // Demonstrate arbitrary-order tapping: left 0 -> right 0 -> left 1 -> right 1 -> left 2
  useEffect(() => {
    const demoOrder = ['left_0', 'right_0', 'left_1', 'right_1', 'left_2'];
    let step = 2;
    const interval = setInterval(() => {
      const key = demoOrder[step % demoOrder.length];
      setHighlightKey(key);
      setCountedMap(prev => {
        const nextNum = Object.keys(prev).length >= 5 ? 1 : Object.keys(prev).length + 1;
        if (nextNum === 1) return { [key]: 1 };
        return { ...prev, [key]: nextNum };
      });
      step++;
    }, 950);
    return () => clearInterval(interval);
  }, []);

  const leftFruits = ['left_0', 'left_1', 'left_2'];
  const rightFruits = ['right_0', 'right_1'];

  const handleFruitTap = (key: string) => {
    setHighlightKey(key);
    setCountedMap(prev => {
      const nextNum = prev[key] ?? Object.keys(prev).length + 1;
      AudioManager.stopSpeech();
      AudioManager.speak(`${nextNum}`, { rate: 0.95, pitch: 1.35 });
      return { ...prev, [key]: nextNum };
    });
  };

  return (
    <View style={styles.cardVisualContainer}>
      <Text style={styles.explainText}>
        Tap fruits in EITHER basket in any order to count them all!
      </Text>

      <View style={styles.dualBasketsInteractiveRow}>
        {/* Left Basket Cluster */}
        <View style={styles.interactiveBasketCol}>
          <Text style={styles.interactiveBasketTitle}>🧺 Left Basket</Text>
          <View style={styles.miniClusterRow}>
            {leftFruits.map(key => {
              const isSelected = highlightKey === key;
              const assignedNum = countedMap[key];
              const isCounted = assignedNum !== undefined;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.tapFruitWrapper}
                  activeOpacity={0.7}
                  onPress={() => handleFruitTap(key)}
                >
                  <View
                    style={[
                      styles.tapFruitCircle,
                      isCounted && { borderColor: '#FFB300', backgroundColor: '#FFF9C4' },
                      isSelected && styles.tapFruitCircleActive,
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>🍎</Text>
                    {isCounted && (
                      <View style={styles.numTagBadge}>
                        <Text style={styles.numTagBadgeText}>{assignedNum}</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && <Text style={styles.tapHandMini}>👆</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.plusSign}>+</Text>

        {/* Right Basket Cluster */}
        <View style={styles.interactiveBasketCol}>
          <Text style={styles.interactiveBasketTitle}>🧺 Right Basket</Text>
          <View style={styles.miniClusterRow}>
            {rightFruits.map(key => {
              const isSelected = highlightKey === key;
              const assignedNum = countedMap[key];
              const isCounted = assignedNum !== undefined;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.tapFruitWrapper}
                  activeOpacity={0.7}
                  onPress={() => handleFruitTap(key)}
                >
                  <View
                    style={[
                      styles.tapFruitCircle,
                      isCounted && { borderColor: '#FFB300', backgroundColor: '#FFF9C4' },
                      isSelected && styles.tapFruitCircleActive,
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>🍎</Text>
                    {isCounted && (
                      <View style={styles.numTagBadge}>
                        <Text style={styles.numTagBadgeText}>{assignedNum}</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && <Text style={styles.tapHandMini}>👆</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.streakInfoPill}>
        <Text style={styles.streakInfoText}>⚡ 5-Streak Mode: Silent highlight (mental math mode!)</Text>
      </View>
    </View>
  );
};

// ─── Step 5: Select Choice & Submit ───────────────────────────────────────────
export const NumberBondsStepFiveVisual: React.FC = () => {
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
    tagline: 'See the two baskets and the total fruits on the trunk.',
    speechText: 'Welcome to Number Bonds! The tree shows two baskets and the total fruits on the trunk! Tap the total box to count them up close in the modal!',
    renderVisual: () => <NumberBondsStepOneVisual />,
  },
  {
    stepNumber: 2,
    title: 'Count Left Basket First!',
    tagline: 'Count each fruit in the left basket individually to know where to start.',
    speechText: 'Count each fruit in the left basket individually first! One, two, three, four! Keep that starting number in your head!',
    renderVisual: () => <NumberBondsStepTwoVisual />,
  },
  {
    stepNumber: 3,
    title: 'Drag Fruits & Count On!',
    tagline: 'Drag fruits down into the right basket to count on from the left basket.',
    speechText: 'Now count on from the left basket! Drag fruits into the right basket and count: 5, 6, 7... to reach the total!',
    renderVisual: () => <NumberBondsStepThreeVisual />,
  },
  {
    stepNumber: 4,
    title: 'Tap to Count & Total Modal!',
    tagline: 'Tap either basket or tap the Total Box to count all fruits.',
    speechText: 'You can tap fruits in either basket in any order to count sequentially, or tap the Total Box to count all fruits in the popup modal! On a 5-streak, fruits highlight silently!',
    renderVisual: () => <NumberBondsTapToCountVisual />,
  },
  {
    stepNumber: 5,
    title: 'Select Choice & Submit!',
    tagline: 'Pick the matching number and tap Submit to win stars!',
    speechText: 'Pick the matching number below and press Submit to complete the bond and earn your stars! Have fun!',
    renderVisual: () => <NumberBondsStepFiveVisual />,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
    alignItems: 'center',
  },
  totalBadgeText: {
    color: '#FFE082',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: 175,
    minHeight: 145,
  },
  leftBasketCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 6,
  },
  subExplainText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
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
  dualBasketsPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  previewLeftBasket: {
    backgroundColor: '#E1F5FE',
    borderWidth: 1.5,
    borderColor: '#0288D1',
    borderRadius: 14,
    padding: 6,
    alignItems: 'center',
  },
  previewBasketLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0288D1',
  },
  previewRightBasket: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1.5,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 6,
    alignItems: 'center',
  },
  dualBasketsInteractiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 6,
    width: '95%',
  },
  interactiveBasketCol: {
    backgroundColor: '#FFFDE7',
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    flex: 1,
  },
  interactiveBasketTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5D4037',
    marginBottom: 4,
  },
  miniClusterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  tapFruitWrapper: {
    alignItems: 'center',
  },
  tapFruitCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapFruitCircleActive: {
    borderColor: '#FF9800',
    transform: [{ scale: 1.15 }],
  },
  numTagBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    backgroundColor: '#E65100',
    borderRadius: 7,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numTagBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  tapHandMini: {
    fontSize: 14,
    marginTop: 2,
  },
  streakInfoPill: {
    marginTop: 8,
    backgroundColor: '#EDE7F6',
    borderWidth: 1,
    borderColor: '#B39DDB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  streakInfoText: {
    fontSize: 11,
    color: '#512DA8',
    fontWeight: '700',
  },
});
