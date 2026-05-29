import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';

interface IncorrectModalProps {
  visible: boolean;
  onTryAgain: () => void;
  onHint: () => void;
  hintsRemaining: number;
  isTryLimitReached?: boolean;
}

export const IncorrectModal: React.FC<IncorrectModalProps> = ({ visible, onTryAgain, onHint, hintsRemaining, isTryLimitReached }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <View style={styles.row}>
            <Text style={[styles.titleText, { color: '#FF5252' }]}>Oops! </Text>
            <Text style={[styles.titleText, { color: '#66BB6A' }]}>Not </Text>
            <Text style={[styles.titleText, { color: '#29B6F6' }]}>quite.</Text>
          </View>
          <View style={styles.row}>
            {isTryLimitReached ? (
              <>
                <Text style={[styles.titleText, { color: '#FF9800' }]}>Let's </Text>
                <Text style={[styles.titleText, { color: '#66BB6A' }]}>move </Text>
                <Text style={[styles.titleText, { color: '#9C27B0' }]}>on!</Text>
              </>
            ) : (
              <>
                <Text style={[styles.titleText, { color: '#FF9800' }]}>Let's </Text>
                <Text style={[styles.titleText, { color: '#66BB6A' }]}>try </Text>
                <Text style={[styles.titleText, { color: '#9C27B0' }]}>again!</Text>
              </>
            )}
          </View>
        </View>

        {/* Cute Star Graphic using Composed Emojis */}
        <View style={styles.graphicContainer}>
          <Text style={[styles.sparkle, { top: 20, left: 10, fontSize: 24 }]}>✨</Text>
          <Text style={[styles.sparkle, { bottom: 30, right: 10, fontSize: 32 }]}>✨</Text>
          <Text style={[styles.heart, { top: 10, right: 20, fontSize: 28, transform: [{ rotate: '15deg' }] }]}>💖</Text>
          <Text style={[styles.heart, { top: 60, left: 20, fontSize: 18, transform: [{ rotate: '-15deg' }] }]}>💖</Text>
          <Text style={[styles.heart, { bottom: 50, right: 40, fontSize: 24, transform: [{ rotate: '25deg' }] }]}>💗</Text>
          
          <Text style={styles.starEmoji}>⭐</Text>
          {/* Sad Face layered perfectly on top */}
          <Text style={styles.faceEmoji}>🥺</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            activeOpacity={0.8}
            onPress={onTryAgain}
          >
            <Text style={styles.primaryBtnText}>{isTryLimitReached ? 'Next Problem →' : '↻ Try Again'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryBtn, hintsRemaining <= 0 && { opacity: 0.5 }]} 
            activeOpacity={0.8}
            onPress={onHint}
            disabled={hintsRemaining <= 0}
          >
            <Text style={styles.secondaryBtnText}>Need a hint?</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFEAB5', // Soft peach/yellow
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    marginTop: 60,
    alignItems: 'center',
    marginBottom: 40,
  },
  row: {
    flexDirection: 'row',
  },
  titleText: {
    fontSize: 36,
    fontWeight: '900',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  graphicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: 250,
    width: 250,
    marginBottom: 50,
  },
  starEmoji: {
    fontSize: 180,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 10,
  },
  faceEmoji: {
    position: 'absolute',
    fontSize: 80,
    top: 65, // Adjust this so the eyes align perfectly in the middle of the star
  },
  sparkle: {
    position: 'absolute',
    color: '#FFCA28',
  },
  heart: {
    position: 'absolute',
  },
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#FF8F00',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 5,
    borderColor: '#E65100',
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
    fontSize: 22,
    fontWeight: '900',
    color: '#4E342E',
  },
});
