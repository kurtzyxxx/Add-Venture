import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';

interface HintModalProps {
  visible: boolean;
  hintText: string;
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({ visible, hintText, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          
          {/* Owl and Speech Bubble */}
          <View style={styles.graphicContainer}>
            <View style={styles.owlContainer}>
              <Text style={styles.owlEmoji}>🦉</Text>
            </View>
            
            <View style={styles.speechBubble}>
              <Text style={styles.hintText}>{hintText}</Text>
              {/* Little triangle for speech bubble */}
              <View style={styles.speechBubbleTail} />
            </View>
          </View>
          
          {/* Action Button */}
          <TouchableOpacity 
            style={styles.primaryBtn} 
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.primaryBtnText}>Got it!</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  graphicContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
    marginTop: 20,
  },
  owlContainer: {
    marginRight: 10,
  },
  owlEmoji: {
    fontSize: 70,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 3,
    borderColor: '#4E342E',
    position: 'relative',
  },
  speechBubbleTail: {
    position: 'absolute',
    left: -15,
    top: 25,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 15,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#4E342E',
  },
  hintText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4E342E',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#9C27B0', // Purple color from the image
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
