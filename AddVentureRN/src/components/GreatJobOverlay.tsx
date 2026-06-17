import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { MAX_ACTIVITIES_PER_SESSION } from '../core/GameManager';

interface Props {
  visible: boolean;
  stars: number;
  activityCount: number;
  onContinue: () => void;
  starScale: Animated.Value;
  confettiAnim: Animated.Value;
}

export function GreatJobOverlay({ visible, stars, activityCount, onContinue, starScale, confettiAnim }: Props) {
  const CONFETTI = ['🎊', '🎉', '✨', '⭐', '🌟', '💥', '🎈'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={gjStyles.overlay}>
        <View style={gjStyles.card}>
          {/* Confetti row */}
          <View style={gjStyles.confettiRow}>
            {CONFETTI.map((c, i) => (
              <Animated.Text
                key={i}
                style={[
                  gjStyles.confettiItem,
                  {
                    opacity: confettiAnim,
                    transform: [{
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0]
                      })
                    }]
                  }
                ]}
              >
                {c}
              </Animated.Text>
            ))}
          </View>

          {/* Big star */}
          <Animated.Text style={[gjStyles.bigStar, { transform: [{ scale: starScale }] }]}>
            ⭐
          </Animated.Text>

          {/* Great Job! */}
          <Text style={gjStyles.greatJobText}>Great Job!</Text>

          {/* Stars earned */}
          <View style={gjStyles.starsEarnedRow}>
            <Text style={gjStyles.plusStars}>+{stars} {stars === 1 ? 'Star' : 'Stars'}</Text>
            <View style={gjStyles.starIconsRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text key={i} style={[gjStyles.starIcon, { opacity: i < stars ? 1 : 0.25 }]}>⭐</Text>
              ))}
            </View>
          </View>

          {/* Progress indicator */}
          <Text style={gjStyles.progressText}>
            Activity {activityCount} of {MAX_ACTIVITIES_PER_SESSION}
          </Text>

          {/* Continue button */}
          <TouchableOpacity style={gjStyles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={gjStyles.continueBtnText}>
              {activityCount >= MAX_ACTIVITIES_PER_SESSION ? '🏆 Finish!' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const gjStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '82%',
    backgroundColor: '#FFF',
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
  confettiRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 },
  confettiItem: { fontSize: 22 },
  bigStar: { fontSize: 90, marginVertical: 4 },
  greatJobText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FF6F00',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  starsEarnedRow: { alignItems: 'center', marginBottom: 8 },
  plusStars: { fontSize: 30, fontWeight: '900', color: '#43A047', marginBottom: 6 },
  starIconsRow: { flexDirection: 'row', gap: 6 },
  starIcon: { fontSize: 32 },
  progressText: { fontSize: 14, color: '#9E9E9E', fontWeight: 'bold', marginBottom: 20 },
  continueBtn: {
    backgroundColor: '#43A047',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    borderWidth: 3,
    borderColor: '#A5D6A7',
  },
  continueBtnText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
});
