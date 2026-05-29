import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';

interface DraggableFruitProps {
  fruit: { id: string; emoji: string; dropped: boolean; group?: 1 | 2 };
  onDrop: () => void;
  disabled?: boolean;
}

export function DraggableFruit({ fruit, onDrop, disabled = false }: DraggableFruitProps) {
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
}

const styles = StyleSheet.create({
  fruitCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: '#EEEEEE' },
  emoji: { fontSize: 30 },
});
