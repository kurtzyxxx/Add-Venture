import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface PulseViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Scale pulse range (default 1.0 → 1.08) */
  maxScale?: number;
  /** Pulse duration in ms (default 900) */
  duration?: number;
  /** Set false to freeze the pulse (e.g., when disabled) */
  active?: boolean;
}

/**
 * A view that continuously pulses its scale — useful for hint buttons,
 * correct-answer glow, and mastery badges.
 */
export const PulseView: React.FC<PulseViewProps> = ({
  children,
  style,
  maxScale = 1.08,
  duration = 900,
  active = true,
}) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: maxScale,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulse.setValue(1);
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [active]);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulse }] }]}>
      {children}
    </Animated.View>
  );
};
