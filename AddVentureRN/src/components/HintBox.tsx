import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioManager } from '../core/AudioManager';

interface HintBoxProps {
  text: string | null;
  onDismiss?: () => void;
}

export function HintBox({ text, onDismiss }: HintBoxProps) {
  useEffect(() => {
    if (!text) return;

    AudioManager.stopSpeech();
    const timer = setTimeout(() => {
      AudioManager.speak(text, { rate: 0.95, pitch: 1.2 });
    }, 180);

    return () => clearTimeout(timer);
  }, [text]);

  if (!text) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.sparkle, styles.sparkleOne]}>✦</Text>
          <Text style={[styles.sparkle, styles.sparkleTwo]}>✦</Text>
          <Text style={[styles.sparkle, styles.sparkleThree]}>✦</Text>
          <Text style={[styles.sparkle, styles.sparkleFour]}>✦</Text>

          <View style={styles.contentRow}>
            <View style={styles.owlWrap}>
              <Text style={styles.owl}>🦉</Text>
            </View>

            <View style={styles.speechBubble}>
              <Text style={styles.title}>Need a hint?</Text>
              <Text style={styles.hintText}>{text}</Text>
              <View style={styles.bubbleTail} />
            </View>
          </View>

          <View style={styles.blocksRow}>
            <Text style={styles.star}>⭐</Text>
            <View style={[styles.block, styles.redBlock]}>
              <Text style={styles.blockText}>1</Text>
            </View>
            <View style={styles.stack}>
              <View style={[styles.block, styles.purpleBlock]}>
                <Text style={styles.blockText}>4</Text>
              </View>
              <View style={[styles.block, styles.greenBlock]}>
                <Text style={styles.blockText}>3</Text>
              </View>
              <View style={[styles.block, styles.yellowBlock]}>
                <Text style={styles.blockText}>2</Text>
              </View>
            </View>
            <View style={[styles.block, styles.blueBlock]}>
              <Text style={styles.blockText}>5</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.gotItButton} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.gotItText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36, 55, 56, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#FFFDF7',
    borderColor: '#FFFFFF',
    borderWidth: 5,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  owlWrap: {
    width: 98,
    height: 116,
    borderRadius: 49,
    backgroundColor: '#FFE8BF',
    borderWidth: 4,
    borderColor: '#8D6E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -6,
    elevation: 3,
  },
  owl: {
    fontSize: 66,
    textShadowColor: 'rgba(93, 64, 55, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 3,
  },
  speechBubble: {
    flex: 1,
    minHeight: 108,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#6D4C41',
    borderRadius: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  bubbleTail: {
    position: 'absolute',
    left: 10,
    bottom: -13,
    width: 22,
    height: 22,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#6D4C41',
    transform: [{ rotate: '-28deg' }],
  },
  title: {
    color: '#4E342E',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 3,
  },
  hintText: {
    color: '#4E342E',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  blocksRow: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 10,
  },
  stack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  block: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: 'rgba(78, 52, 46, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -5,
  },
  blockText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  redBlock: { backgroundColor: '#EF5350' },
  yellowBlock: { backgroundColor: '#FFCA28' },
  greenBlock: { backgroundColor: '#66BB6A' },
  blueBlock: { backgroundColor: '#42A5F5' },
  purpleBlock: { backgroundColor: '#AB47BC' },
  star: {
    fontSize: 31,
    marginRight: 4,
    marginBottom: 4,
  },
  gotItButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: '#AB47BC',
    borderWidth: 4,
    borderColor: '#7B1FA2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  gotItText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
  sparkle: {
    position: 'absolute',
    color: '#FFCA28',
    fontSize: 28,
    fontWeight: '900',
  },
  sparkleOne: { top: 25, left: 26 },
  sparkleTwo: { top: 58, right: 18, color: '#EC407A', fontSize: 24 },
  sparkleThree: { bottom: 101, left: 36, color: '#29B6F6', fontSize: 20 },
  sparkleFour: { bottom: 87, right: 42, color: '#66BB6A', fontSize: 18 },
});
