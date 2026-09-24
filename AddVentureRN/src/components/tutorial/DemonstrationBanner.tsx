import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DemonstrationBannerProps {
  message: string;
  onSkip?: () => void;
}

export const DemonstrationBanner: React.FC<DemonstrationBannerProps> = ({
  message,
  onSkip,
}) => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.leftRow}>
        <Text style={styles.mascot}>🦉</Text>
        <View style={styles.textContainer}>
          <Text style={styles.kicker}>WATCH & LEARN</Text>
          <Text style={styles.messageText} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>

      {onSkip ? (
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.8}>
          <Text style={styles.skipBtnText}>Skip ⏩</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFE082',
    borderBottomWidth: 3,
    borderBottomColor: '#FFA000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9998,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mascot: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E65100',
    letterSpacing: 0.8,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E2723',
  },
  skipBtn: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  skipBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
