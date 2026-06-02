import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { AudioManager } from '../core/AudioManager';
import { MAX_ACTIVITIES_PER_SESSION } from '../core/GameManager';

interface GreatJobOverlayProps {
  visible: boolean;
  stars: number;
  activityCount: number;
  onContinue: () => void;
  /** If true, shows a "Mastered!" golden celebration instead of "Great Job!" */
  isMastery?: boolean;
  /** Mastery progress for current item, e.g. { consecutiveCorrect: 2, needed: 3 } */
  masteryProgress?: { consecutiveCorrect: number; needed: number } | null;
}

const CONFETTI = ['🎊', '🎉', '✨', '⭐', '🌟', '💥', '🎈'];
const STAR_COUNT = 5;

export const GreatJobOverlay: React.FC<GreatJobOverlayProps> = ({
  visible,
  stars,
  activityCount,
  onContinue,
  isMastery = false,
  masteryProgress = null,
}) => {
  // Core animations
  const starScale = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0)).current;

  // Star burst — 5 stars radiating out
  const burstAnims = useRef(
    Array.from({ length: STAR_COUNT }, () => ({
      translate: new Animated.ValueXY({ x: 0, y: 0 }),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    starScale.setValue(0);
    confettiAnim.setValue(0);
    titleScale.setValue(0);
    burstAnims.forEach(a => {
      a.translate.setValue({ x: 0, y: 0 });
      a.opacity.setValue(0);
      a.scale.setValue(0);
    });

    // TTS
    const message = isMastery
      ? 'Incredible! You mastered it! Amazing work!'
      : `Amazing! You got it! ${stars} ${stars === 1 ? 'star' : 'stars'}!`;
    AudioManager.stopSpeech();
    AudioManager.speak(message, { rate: 0.9, pitch: 1.3 });

    // Animate burst stars (radiate outward)
    const angles = Array.from({ length: STAR_COUNT }, (_, i) => (i * 360) / STAR_COUNT);
    const burstAnimations = angles.map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const distance = 90;
      return Animated.parallel([
        Animated.timing(burstAnims[i].translate, {
          toValue: { x: Math.cos(rad) * distance, y: Math.sin(rad) * distance },
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(burstAnims[i].opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(burstAnims[i].scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel([
      Animated.spring(starScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(confettiAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(titleScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ...burstAnimations,
    ]).start();
  }, [visible]);

  const isSessionDone = activityCount >= MAX_ACTIVITIES_PER_SESSION;
  const titleText = isMastery ? '🏆 Mastered!' : 'Great Job!';
  const titleColor = isMastery ? '#FF6F00' : '#FF6F00';
  const titleShadow = isMastery ? '#FFD700' : '#FFD700';
  const mainBgColor = isMastery ? '#FFFDE7' : '#FFF';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: mainBgColor }]}>

          {/* Confetti row */}
          <View style={styles.confettiRow}>
            {CONFETTI.map((c, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.confettiItem,
                  {
                    opacity: confettiAnim,
                    transform: [
                      {
                        translateY: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {c}
              </Animated.Text>
            ))}
          </View>

          {/* Burst stars + main star */}
          <View style={styles.starBurstContainer}>
            {burstAnims.map((a, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.burstStar,
                  {
                    opacity: a.opacity,
                    transform: [
                      { translateX: a.translate.x },
                      { translateY: a.translate.y },
                      { scale: a.scale },
                    ],
                  },
                ]}
              >
                ⭐
              </Animated.Text>
            ))}
            <Animated.Text style={[styles.bigStar, { transform: [{ scale: starScale }] }]}>
              {isMastery ? '🏆' : '⭐'}
            </Animated.Text>
          </View>

          {/* Title */}
          <Animated.Text
            style={[
              styles.greatJobText,
              {
                color: titleColor,
                textShadowColor: titleShadow,
                transform: [{ scale: titleScale }],
              },
            ]}
          >
            {titleText}
          </Animated.Text>

          {/* Stars earned */}
          <View style={styles.starsEarnedRow}>
            <Text style={styles.plusStars}>
              +{stars} {stars === 1 ? 'Star' : 'Stars'}
            </Text>
            <View style={styles.starIconsRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text key={i} style={[styles.starIcon, { opacity: i < stars ? 1 : 0.25 }]}>
                  ⭐
                </Text>
              ))}
            </View>
          </View>

          {/* Mastery progress bar (only for mastery reinforcement problems) */}
          {masteryProgress && !isMastery && (
            <View style={styles.masteryProgressContainer}>
              <Text style={styles.masteryLabel}>
                🔥 Keep Going! {masteryProgress.consecutiveCorrect}/{masteryProgress.needed} correct
              </Text>
              <View style={styles.masteryTrack}>
                <View
                  style={[
                    styles.masteryFill,
                    {
                      width: `${(masteryProgress.consecutiveCorrect / masteryProgress.needed) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Activity progress */}
          <Text style={styles.progressText}>
            Activity {activityCount} of {MAX_ACTIVITIES_PER_SESSION}
          </Text>

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.continueBtn, isMastery && styles.continueBtnMastery]}
            onPress={onContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {isSessionDone ? '🏆 Finish!' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    borderRadius: 32,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  confettiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  confettiItem: { fontSize: 22 },
  starBurstContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  burstStar: {
    position: 'absolute',
    fontSize: 24,
  },
  bigStar: { fontSize: 90 },
  greatJobText: {
    fontSize: 42,
    fontWeight: '900',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  starsEarnedRow: { alignItems: 'center', marginBottom: 8 },
  plusStars: { fontSize: 28, fontWeight: '900', color: '#43A047', marginBottom: 6 },
  starIconsRow: { flexDirection: 'row', gap: 6 },
  starIcon: { fontSize: 30 },
  masteryProgressContainer: {
    width: '100%',
    marginBottom: 10,
    alignItems: 'center',
  },
  masteryLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E65100',
    marginBottom: 6,
  },
  masteryTrack: {
    width: '80%',
    height: 12,
    backgroundColor: '#FFE0B2',
    borderRadius: 6,
    overflow: 'hidden',
  },
  masteryFill: {
    height: '100%',
    backgroundColor: '#FF6F00',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  continueBtn: {
    backgroundColor: '#43A047',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    borderWidth: 3,
    borderColor: '#A5D6A7',
  },
  continueBtnMastery: {
    backgroundColor: '#FF6F00',
    borderColor: '#FFD700',
  },
  continueBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
});
