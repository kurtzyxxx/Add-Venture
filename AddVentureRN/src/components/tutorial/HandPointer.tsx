import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface HandPointerProps {
  x: Animated.Value;
  y: Animated.Value;
  scale?: Animated.Value;
  visible: boolean;
  label?: string;
}

export const HandPointer: React.FC<HandPointerProps> = ({
  x,
  y,
  scale,
  visible,
  label,
}) => {
  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          transform: [
            { translateX: x },
            { translateY: y },
            { scale: scale ?? 1 },
          ],
        },
      ]}
    >
      {/* Hand icon: Restored previous 👆 emoji, adjusted down slightly to align to target */}
      <View style={styles.handWrapper}>
        <Text style={styles.handIcon}>👆</Text>
      </View>

      {/* Floating Tooltip positioned below the hand, centered on x = 0 */}
      {label ? (
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{label}</Text>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    zIndex: 99999,
    elevation: 50,
  },
  handWrapper: {
    position: 'absolute',
    left: -24,
    top: 10, // Adjusted down a little bit to match exactly where it is pointing
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  handIcon: {
    fontSize: 44,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
  },
  tooltipContainer: {
    position: 'absolute',
    top: 60,
    left: -125,
    width: 250,
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
