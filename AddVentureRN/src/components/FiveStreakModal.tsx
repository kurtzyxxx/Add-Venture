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

interface FiveStreakModalProps {
  visible: boolean;
  streakCount?: number;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const FiveStreakModal: React.FC<FiveStreakModalProps> = ({
  visible,
  streakCount = 5,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const starSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset and animate popup
    scaleAnim.setValue(0.7);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Gentle bounce loop for owl
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    bounceLoop.start();

    // Speak narrator reward message
    AudioManager.stopSpeech();
    const timeout = setTimeout(() => {
      AudioManager.speak('Wow! You are amazing! This time try counting on your own.', {
        rate: 0.9,
        pitch: 1.3,
      });
    }, 200);

    return () => {
      bounceLoop.stop();
      clearTimeout(timeout);
    };
  }, [visible]);

  const handleReady = () => {
    AudioManager.stopSpeech();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleReady}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Top Streak Pill */}
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>🔥 {streakCount} IN A ROW! 🔥</Text>
          </View>

          {/* Character & Crown */}
          <View style={styles.characterContainer}>
            <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
              <Text style={styles.crownEmoji}>👑</Text>
              <Text style={styles.owlEmoji}>🦉</Text>
            </Animated.View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Wow! You are amazing!</Text>

          {/* Subtitle / Challenge Callout */}
          <View style={styles.badgeBox}>
            <Text style={styles.badgeBoxTitle}>🌟 Ready for Independence? 🌟</Text>
            <Text style={styles.badgeBoxBody}>
              This time, try counting completely on your own!
            </Text>
          </View>

          {/* Explanation note */}
          <View style={styles.rulesNote}>
            <Text style={styles.ruleItem}>
              ✨ Counting number clues and voice hints will now be hidden.
            </Text>
            <Text style={styles.ruleItem}>
              🗣️ Remember to say your numbers out loud as you count!
            </Text>
          </View>

          {/* Ready Button */}
          <TouchableOpacity style={styles.readyButton} onPress={handleReady} activeOpacity={0.85}>
            <Text style={styles.readyButtonText}>I'm Ready! 🚀</Text>
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
    width: Math.min(width * 0.9, 390),
    backgroundColor: '#FFFDF6',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: '#FFB300',
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  streakPill: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
  },
  streakPillText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  characterContainer: {
    alignItems: 'center',
    marginVertical: 4,
    height: 76,
    justifyContent: 'center',
  },
  crownEmoji: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: -6,
  },
  owlEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#E65100',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
    textShadowColor: '#FFE082',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgeBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFE082',
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeBoxTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F57F17',
    marginBottom: 3,
  },
  badgeBoxBody: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4E342E',
    textAlign: 'center',
  },
  rulesNote: {
    backgroundColor: '#F1F8E9',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#7CB342',
  },
  ruleItem: {
    fontSize: 12.5,
    color: '#33691E',
    fontWeight: '700',
    marginVertical: 2,
    lineHeight: 17,
  },
  readyButton: {
    backgroundColor: '#43A047',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 36,
    elevation: 4,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    width: '90%',
    alignItems: 'center',
  },
  readyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
