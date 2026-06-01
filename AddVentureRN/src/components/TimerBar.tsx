import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  timeLeft: number;
  totalTime: number;
}

export const TimerBar: React.FC<Props> = ({ timeLeft, totalTime }) => {
  // Guard against division by zero
  const safeTotal = totalTime > 0 ? totalTime : 120;
  const initialRatio = Math.max(0, Math.min(1, timeLeft / safeTotal));
  
  const widthAnim = useRef(new Animated.Value(initialRatio)).current;

  useEffect(() => {
    const currentRatio = Math.max(0, Math.min(1, timeLeft / safeTotal));
    Animated.timing(widthAnim, {
      toValue: currentRatio,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [timeLeft, safeTotal]);

  const barColor = widthAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 1],
    outputRange: ['#FF5252', '#FF9800', '#FFCA28', '#66BB6A']
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, { 
        width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: barColor 
      }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 14,
    width: 140,
    backgroundColor: '#E0F2F1',
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    marginVertical: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 5,
  }
});
