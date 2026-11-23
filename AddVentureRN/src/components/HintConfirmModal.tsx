import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioManager } from '../core/AudioManager';

interface HintConfirmModalProps {
  visible: boolean;
  hintsRemaining: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function HintConfirmModal({
  visible,
  hintsRemaining,
  onCancel,
  onConfirm,
}: HintConfirmModalProps) {
  useEffect(() => {
    if (!visible) return;
    AudioManager.stopSpeech();
    AudioManager.speak('Want Oliver to show you how? Tap Show Me!', { rate: 0.9, pitch: 1.25 });
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconBubble}>
            <Text style={styles.icon}>🦉</Text>
          </View>

          <Text style={styles.title}>Watch Oliver? 💡</Text>
          <Text style={styles.message}>
            Oliver will show you how to solve this step-by-step!
          </Text>

          <View style={styles.hintCounter}>
            {[1, 2, 3].map(slot => (
              <Text key={slot} style={[styles.hintDot, { opacity: slot <= hintsRemaining ? 1 : 0.2 }]}>
                💡
              </Text>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.85}>
              <Text style={styles.cancelText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmText}>Show Me! 🦉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 35, 45, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF7D6',
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#FFF',
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 22,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  iconBubble: {
    position: 'absolute',
    top: -42,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFCA28',
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  icon: { fontSize: 42 },
  title: {
    color: '#4E342E',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  message: {
    color: '#6D4C41',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  hintCounter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  hintDot: { fontSize: 22 },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: '#ECEFF1',
    borderWidth: 3,
    borderColor: '#B0BEC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: '#66BB6A',
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  cancelText: { color: '#455A64', fontSize: 17, fontWeight: '900' },
  confirmText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
});
