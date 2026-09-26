import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { AudioManager } from '../core/AudioManager';

interface IncorrectModalProps {
  visible: boolean;
  onContinue: () => void;
  isTimeout?: boolean;
  userAnswer?: number | string | null;
  currentTry?: number;
}

const { width } = Dimensions.get('window');

export const IncorrectModal: React.FC<IncorrectModalProps> = ({
  visible,
  onContinue,
  isTimeout = false,
  userAnswer,
  currentTry = 1,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset and spring pop-in
    scaleAnim.setValue(0.7);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Gentle owl bounce
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    bounceLoop.start();

    // Gentle badge wiggle
    Animated.sequence([
      Animated.delay(150),
      Animated.timing(shakeAnim, { toValue: 8, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();

    // Audio narration
    AudioManager.stopSpeech();
    const narration = isTimeout
      ? "Time's up! That's okay, let's watch Oliver show us how to solve it together!"
      : "Oops! Not quite, but nice try! Let's watch Oliver show us how to solve it!";

    const timeout = setTimeout(() => {
      AudioManager.speak(narration, {
        rate: 0.95,
        pitch: 1.3,
      });
    }, 200);

    return () => {
      bounceLoop.stop();
      clearTimeout(timeout);
    };
  }, [visible, isTimeout]);

  const handlePressContinue = () => {
    AudioManager.stopSpeech();
    onContinue();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handlePressContinue}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Pill Badge */}
          <Animated.View
            style={[
              styles.pillBadge,
              isTimeout ? styles.pillTimeout : styles.pillIncorrect,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <Text style={styles.pillText}>
              {isTimeout ? "⏰ TIME'S UP! ⏰" : "🌱 NICE TRY! 🌱"}
            </Text>
          </Animated.View>

          {/* Animated Mascot Area */}
          <View style={styles.characterContainer}>
            <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
              <Text style={styles.owlEmoji}>🦉</Text>
            </Animated.View>
            <View style={styles.lightbulbBadge}>
              <Text style={styles.lightbulbEmoji}>{isTimeout ? '⌛' : '💡'}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, isTimeout ? styles.titleTimeout : styles.titleIncorrect]}>
            {isTimeout ? "Time's Up!" : 'Oops! Not Quite'}
          </Text>

          {/* User Answer Pill (if provided) */}
          {userAnswer !== undefined && userAnswer !== null && userAnswer !== -1 && (
            <View style={styles.userAnswerChip}>
              <Text style={styles.userAnswerLabel}>Your answer: </Text>
              <Text style={styles.userAnswerValue}>{userAnswer}</Text>
            </View>
          )}

          {/* Encouraging Explanatory Callout */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>
              {isTimeout ? '✨ No worries at all! ✨' : '✨ Mistakes help us learn! ✨'}
            </Text>
            <Text style={styles.explanationBody}>
              {isTimeout
                ? "Let's watch Oliver show us how to solve this step-by-step!"
                : "That's okay! Let's watch Oliver show us how to solve this one together!"}
            </Text>
          </View>

          {/* Friendly Tutorial Call-to-Action Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handlePressContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>
              {isTimeout ? 'Watch Oliver 🦉' : 'Show Me How! 🚀'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    width: Math.min(width * 0.88, 380),
    backgroundColor: '#FFFDF9',
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFE082',
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  pillBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  pillIncorrect: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  pillTimeout: {
    backgroundColor: '#EDE7F6',
    borderWidth: 2,
    borderColor: '#B39DDB',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E65100',
    letterSpacing: 0.8,
  },
  characterContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  owlEmoji: {
    fontSize: 78,
  },
  lightbulbBadge: {
    position: 'absolute',
    bottom: -4,
    right: -10,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD54F',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightbulbEmoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  titleIncorrect: {
    color: '#E65100',
  },
  titleTimeout: {
    color: '#5E35B1',
  },
  userAnswerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    marginVertical: 4,
  },
  userAnswerLabel: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '700',
  },
  userAnswerValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B71C1C',
  },
  explanationBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFE082',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 14,
    width: '100%',
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F57C00',
    marginBottom: 4,
  },
  explanationBody: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#FF6F00',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#E65100',
    elevation: 4,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    marginTop: 4,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
