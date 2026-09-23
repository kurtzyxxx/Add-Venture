import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';

interface OliverSpeechBalloonProps {
  active: boolean;
  intervalMs?: number;
  displayDurationMs?: number;
}

const BALLOON_MESSAGES = [
  'Say your counting out loud! 🗣️',
  'Count each one out loud! 💬',
  'Say the numbers as you move them! 📢',
];

export const OliverSpeechBalloon: React.FC<OliverSpeechBalloonProps> = ({
  active,
  intervalMs = 10000,
  displayDurationMs = 3500,
}) => {
  const [visible, setVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timers when active status changes
    if (timerRef.current) clearInterval(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    if (!active) {
      setVisible(false);
      opacityAnim.setValue(0);
      return;
    }

    // Schedule periodic reminders
    timerRef.current = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % BALLOON_MESSAGES.length);
      setVisible(true);

      // Pop in animation
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.7);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after displayDurationMs
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
        });
      }, displayDurationMs);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [active, intervalMs, displayDurationMs]);

  const handleDismiss = () => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.balloonContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handleDismiss} style={styles.bubbleCard}>
        <Text style={styles.bubbleText}>{BALLOON_MESSAGES[messageIndex]}</Text>
        {/* Little triangle tail pointing down to Oliver */}
        <View style={styles.tailOuter} />
        <View style={styles.tailInner} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  balloonContainer: {
    position: 'absolute',
    bottom: 50,
    left: -12,
    zIndex: 9999,
    elevation: 10,
    width: 175,
  },
  bubbleCard: {
    backgroundColor: '#FFFDE7',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFA000',
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  bubbleText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4E342E',
    textAlign: 'center',
    lineHeight: 15,
  },
  tailOuter: {
    position: 'absolute',
    bottom: -8,
    left: 28,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFA000',
  },
  tailInner: {
    position: 'absolute',
    bottom: -5,
    left: 29,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFDE7',
  },
});
