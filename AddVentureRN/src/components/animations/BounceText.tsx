import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle } from 'react-native';

interface BounceTextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  delay?: number;
}

/**
 * Text that bounces in on mount using a spring animation.
 */
export const BounceText: React.FC<BounceTextProps> = ({ children, style, delay = 0 }) => {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.Text style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.Text>
  );
};
