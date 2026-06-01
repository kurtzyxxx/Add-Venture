import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import * as Speech from 'expo-speech';

interface IncorrectModalProps {
  visible: boolean;
  onTryAgain: () => void;
  onHint: () => void;
  hintsRemaining: number;
  currentTry: number; // 1, 2, or 3
}

const MESSAGES_BY_TRY: Record<number, { title: string[]; subtitle: string; tts: string }> = {
  1: {
    title: ['Oops!', "Not", 'quite.'],
    subtitle: "Let's try again!",
    tts: "Oops! Not quite. Let's try again. You can do it!",
  },
  2: {
    title: ['Almost!', 'One more', 'chance!'],
    subtitle: 'You can do it! 💪',
    tts: "Almost there! You have one more chance. Try your best!",
  },
  3: {
    title: ["Good try!", "Let's see", 'an example!'],
    subtitle: "Here's a similar one for practice 🎯",
    tts: "Good try! Let's look at a similar example to help you learn.",
  },
};

export const IncorrectModal: React.FC<IncorrectModalProps> = ({
  visible,
  onTryAgain,
  onHint,
  hintsRemaining,
  currentTry,
}) => {
  // Shake animation for the star graphic
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  const msg = MESSAGES_BY_TRY[currentTry] ?? MESSAGES_BY_TRY[1];

  useEffect(() => {
    if (!visible) return;

    // Reset
    shakeAnim.setValue(0);
    scaleAnim.setValue(0.5);

    // Pop in + shake sequence
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]),
    ]).start();

    // TTS
    Speech.stop();
    setTimeout(() => {
      Speech.speak(msg.tts, { rate: 0.9, pitch: 1.2 });
    }, 150);
  }, [visible, currentTry]);

  const tryColors = ['#FF5252', '#FF9800', '#9C27B0'];
  const accentColor = tryColors[Math.min(currentTry - 1, 2)];

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.row}>
              <Text style={[styles.titleText, { color: accentColor }]}>{msg.title[0]} </Text>
              <Text style={[styles.titleText, { color: '#66BB6A' }]}>{msg.title[1]} </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.titleText, { color: '#29B6F6' }]}>{msg.title[2]}</Text>
            </View>
          </Animated.View>
          <Text style={styles.subtitleText}>{msg.subtitle}</Text>
        </View>

        {/* Animated Graphic */}
        <Animated.View
          style={[
            styles.graphicContainer,
            { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] },
          ]}
        >
          <Text style={[styles.sparkle, { top: 20, left: 10, fontSize: 24 }]}>✨</Text>
          <Text style={[styles.sparkle, { bottom: 30, right: 10, fontSize: 32 }]}>✨</Text>
          <Text style={[styles.heart, { top: 10, right: 20, fontSize: 28, transform: [{ rotate: '15deg' }] }]}>💖</Text>
          <Text style={[styles.heart, { top: 60, left: 20, fontSize: 18, transform: [{ rotate: '-15deg' }] }]}>💖</Text>
          <Text style={styles.starEmoji}>⭐</Text>
          <Text style={styles.faceEmoji}>
            {currentTry <= 2 ? '🥺' : '😮'}
          </Text>
        </Animated.View>

        {/* Try indicator */}
        <View style={styles.tryRow}>
          {[1, 2, 3].map(t => (
            <View
              key={t}
              style={[
                styles.tryDot,
                {
                  backgroundColor: t < currentTry ? '#E0E0E0' : accentColor,
                  opacity: t <= currentTry ? 1 : 0.3,
                  width: t === currentTry ? 18 : 12,
                  height: t === currentTry ? 18 : 12,
                  borderRadius: t === currentTry ? 9 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
            activeOpacity={0.8}
            onPress={onTryAgain}
          >
            <Text style={styles.primaryBtnText}>
              {currentTry >= 3 ? '➡ Next Example' : '↻ Try Again'}
            </Text>
          </TouchableOpacity>

          {hintsRemaining > 0 && currentTry < 3 && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={onHint}
            >
              <Text style={styles.secondaryBtnText}>💡 Need a hint? ({hintsRemaining} left)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFEAB5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    marginTop: 60,
    alignItems: 'center',
    marginBottom: 20,
  },
  row: { flexDirection: 'row' },
  titleText: {
    fontSize: 36,
    fontWeight: '900',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4037',
    marginTop: 8,
  },
  graphicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: 220,
    width: 220,
    marginBottom: 20,
  },
  starEmoji: {
    fontSize: 160,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 10,
  },
  faceEmoji: {
    position: 'absolute',
    fontSize: 72,
    top: 58,
  },
  sparkle: { position: 'absolute', color: '#FFCA28' },
  heart: { position: 'absolute' },
  tryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  tryDot: { margin: 4 },
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 5,
    borderColor: 'rgba(0,0,0,0.15)',
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  secondaryBtn: {
    backgroundColor: '#FFECB3',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4E342E',
  },
  secondaryBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4E342E',
  },
});
