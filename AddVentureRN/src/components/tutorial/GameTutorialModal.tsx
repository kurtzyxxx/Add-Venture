import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { AudioManager } from '../../core/AudioManager';
import { TutorialStepConfig } from './CountAllTutorialContent';

const { width } = Dimensions.get('window');

interface GameTutorialModalProps {
  visible: boolean;
  gameTitle: string;
  steps: TutorialStepConfig[];
  onClose: (dontShowAgain: boolean) => void;
}

export const GameTutorialModal: React.FC<GameTutorialModalProps> = ({
  visible,
  gameTitle,
  steps,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Animations
  const modalScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const owlBounce = useRef(new Animated.Value(1)).current;

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Owl gentle floating animation
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(owlBounce, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(owlBounce, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  // Entrance and step change animation & TTS speech
  useEffect(() => {
    if (!visible) {
      AudioManager.stopSpeech();
      return;
    }

    // Modal popup animation
    Animated.spring(modalScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Content fade in
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Trigger TTS for this step
    AudioManager.stopSpeech();
    const timeout = setTimeout(() => {
      AudioManager.speak(currentStep.speechText, {
        rate: 0.9,
        pitch: 1.25,
      });
    }, 150);

    return () => {
      clearTimeout(timeout);
    };
  }, [visible, currentStepIndex]);

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    AudioManager.stopSpeech();
    onClose(dontShowAgain);
  };

  const handleReplaySpeech = () => {
    AudioManager.stopSpeech();
    AudioManager.speak(currentStep.speechText, {
      rate: 0.9,
      pitch: 1.25,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleComplete}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.modalCard, { transform: [{ scale: modalScale }] }]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.titleWrapper}>
              <Text style={styles.gameBadge}>{gameTitle}</Text>
              <Text style={styles.headerSubtitle}>
                Step {currentStep.stepNumber} of {steps.length}
              </Text>
            </View>

            <TouchableOpacity style={styles.skipButton} onPress={handleComplete} activeOpacity={0.7}>
              <Text style={styles.skipButtonText}>Skip ✕</Text>
            </TouchableOpacity>
          </View>

          {/* Oliver Owl & Speech Bubble */}
          <View style={styles.characterRow}>
            <Animated.View style={[styles.owlWrapper, { transform: [{ scale: owlBounce }] }]}>
              <Text style={styles.owlEmoji}>🦉</Text>
              <Text style={styles.characterName}>Oliver</Text>
            </Animated.View>

            <TouchableOpacity
              style={styles.speechBubble}
              onPress={handleReplaySpeech}
              activeOpacity={0.8}
            >
              <View style={styles.speechBubbleHeader}>
                <Text style={styles.stepTitle}>{currentStep.title}</Text>
                <Text style={styles.speakerIcon}>🔊</Text>
              </View>
              <Text style={styles.stepTagline}>{currentStep.tagline}</Text>
            </TouchableOpacity>
          </View>

          {/* Step Visual Container */}
          <Animated.View style={[styles.visualCard, { opacity: contentOpacity }]}>
            {currentStep.renderVisual()}
          </Animated.View>

          {/* Step Indicator Dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentStepIndex(index)}
                style={[
                  styles.dot,
                  index === currentStepIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {!isFirstStep ? (
              <TouchableOpacity style={styles.backBtn} onPress={handlePrev} activeOpacity={0.8}>
                <Text style={styles.backBtnText}>⮌ Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 85 }} />
            )}

            {!isLastStep ? (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.nextBtnText}>Next ➔</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.playBtn} onPress={handleComplete} activeOpacity={0.8}>
                <Text style={styles.playBtnText}>Let's Play! 🚀</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Don't show again toggle */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setDontShowAgain(prev => !prev)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkboxBox, dontShowAgain && styles.checkboxBoxChecked]}>
              {dontShowAgain && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Don't show automatically next time</Text>
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
    padding: 16,
  },
  modalCard: {
    width: Math.min(width * 0.94, 440),
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 18,
    borderWidth: 3,
    borderColor: '#FFE082',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWrapper: {
    flexDirection: 'column',
  },
  gameBadge: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E65100',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8D6E63',
  },
  skipButton: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#546E7A',
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  owlWrapper: {
    alignItems: 'center',
    marginRight: 10,
  },
  owlEmoji: {
    fontSize: 44,
  },
  characterName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#795548',
    marginTop: -2,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFE082',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
  },
  speechBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#3E2723',
    flex: 1,
  },
  speakerIcon: {
    fontSize: 16,
    marginLeft: 6,
  },
  stepTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D4037',
    lineHeight: 18,
  },
  visualCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 26,
    backgroundColor: '#FF9800',
  },
  dotInactive: {
    width: 10,
    backgroundColor: '#CFD8DC',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 18,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
  nextBtn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    elevation: 3,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  playBtn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  playBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9E9E9E',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  checkboxCheck: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
});
