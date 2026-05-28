import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [stars, setStars] = useState(0);
  const [userName, setUserName] = useState('');
  const [countOnUnlocked, setCountOnUnlocked] = useState(false);
  const [numberBondsUnlocked, setNumberBondsUnlocked] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const gm = GameManager.getInstance();
      const profile = gm.saveSystem.getProfile();
      setStars(profile.totalStars);
      setUserName(profile.name);
      
      if (profile.name === 'Learner') {
        setShowNameModal(true);
      }

      // Unlock chain: Count On needs 60% accuracy on Count All
      const countOnOk = gm.saveSystem.isCountOnUnlocked();
      setCountOnUnlocked(countOnOk);

      // Number Bonds needs 60% accuracy on Count On
      const numberBondsOk = gm.saveSystem.isNumberBondsUnlocked();
      setNumberBondsUnlocked(numberBondsOk);
    });

    // Floating animation for nodes
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();

    return unsubscribe;
  }, [navigation]);

  const startGame = (strategy: string, routeName: keyof RootStackParamList) => {
    GameManager.getInstance().startSession(strategy);
    navigation.navigate(routeName as any);
  };

  const saveName = async () => {
    if (tempName.trim().length > 0) {
      const gm = GameManager.getInstance();
      const profile = gm.saveSystem.getProfile();
      profile.name = tempName.trim();
      await gm.saveSystem.saveProfile(profile);
      setUserName(profile.name);
      setShowNameModal(false);
    }
  };

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10]
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF4081', '#FF9800', '#CDDC39', '#00BCD4', '#9C27B0']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background Decorations */}
      <FloatingDecoration emoji="✨" top="10%" left="15%" fontSize={24} />
      <FloatingDecoration emoji="⭐" top="20%" right="10%" fontSize={30} />
      <FloatingDecoration emoji="💖" top="25%" right="25%" fontSize={18} />
      <FloatingDecoration emoji="🌟" top="45%" left="10%" fontSize={36} />
      <FloatingDecoration emoji="⭐" top="65%" right="15%" fontSize={32} />
      <FloatingDecoration emoji="💖" top="75%" left="15%" fontSize={24} />
      <FloatingDecoration emoji="✨" top="85%" right="25%" fontSize={18} />

      {/* Path Line */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          <Path
            d={`M ${width * 0.3} ${height * 0.35} C ${width * 0.8} ${height * 0.35}, ${width * 0.9} ${height * 0.55}, ${width * 0.5} ${height * 0.75}`}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={15}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M ${width * 0.3} ${height * 0.35} C ${width * 0.8} ${height * 0.35}, ${width * 0.9} ${height * 0.55}, ${width * 0.5} ${height * 0.75}`}
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={4}
            fill="none"
            strokeDasharray="10 10"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Header / Logo */}
      <View style={styles.header}>
        <Text style={styles.castle}>🏰</Text>
        <Text style={styles.logoTextStroke}>Add-Venture</Text>
        <Text style={styles.logoText}>Add-Venture</Text>
        {userName !== 'Learner' && userName !== '' && (
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
        )}
      </View>

      {/* Stars Badge */}
      <View style={styles.starsBadge}>
        <Text style={styles.starsBadgeText}>⭐ {stars} Stars</Text>
      </View>

      {/* Node 1 — Count All (always unlocked) */}
      <Animated.View style={[styles.nodeContainer, { top: '32%', left: '15%', transform: [{ translateY }] }]}>
        <TouchableOpacity
          style={[styles.node, { backgroundColor: '#FFCA28' }]}
          onPress={() => startGame('COUNT_ALL', 'CountAll')}
          activeOpacity={0.8}
        >
          <Text style={styles.nodeIcon}>⭐</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Count All</Text>
      </Animated.View>

      {/* Node 2 — Count On (locked until Count All ≥ 60%) */}
      <Animated.View style={[styles.nodeContainer, { top: '54%', right: '15%', transform: [{ translateY }] }]}>
        <TouchableOpacity
          style={[
            styles.node,
            countOnUnlocked ? { backgroundColor: '#D500F9' } : styles.nodeLocked
          ]}
          onPress={countOnUnlocked ? () => startGame('COUNT_ON', 'CountOn') : undefined}
          disabled={!countOnUnlocked}
          activeOpacity={countOnUnlocked ? 0.8 : 1}
        >
          <Text style={styles.nodeIcon}>{countOnUnlocked ? '⚡' : '🔒'}</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Count On</Text>
      </Animated.View>

      {/* Node 3 — Number Bonds (locked until Count On ≥ 60%) */}
      <Animated.View style={[styles.nodeContainer, { top: '74%', left: '30%', transform: [{ translateY }] }]}>
        <TouchableOpacity
          style={[
            styles.node,
            numberBondsUnlocked ? { backgroundColor: '#00BFFF' } : styles.nodeLocked
          ]}
          onPress={numberBondsUnlocked ? () => startGame('NUMBER_BONDS', 'NumberBonds') : undefined}
          disabled={!numberBondsUnlocked}
          activeOpacity={numberBondsUnlocked ? 0.8 : 1}
        >
          <Text style={styles.nodeIcon}>{numberBondsUnlocked ? '🔗' : '🔒'}</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Number Bonds</Text>
      </Animated.View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, { color: '#880E4F' }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Progress')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Name Modal */}
      <Modal visible={showNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Welcome to Add-Venture!</Text>
            <Text style={styles.modalSub}>Choose a fun Display Name!</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Type your name here..."
              placeholderTextColor="#9E9E9E"
              value={tempName}
              onChangeText={setTempName}
              maxLength={15}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
              <Text style={styles.saveBtnText}>Let's Play!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const FloatingDecoration = ({ emoji, top, left, right, bottom, fontSize }: any) => {
  const anim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    const move = () => {
      Animated.timing(anim, {
        toValue: {
          x: Math.random() * 40 - 20,
          y: Math.random() * 40 - 20,
        },
        duration: 3000 + Math.random() * 2000,
        useNativeDriver: true,
      }).start(() => move());
    };
    move();
  }, []);

  return (
    <Animated.Text style={[styles.decoration, { top, left, right, bottom, fontSize, transform: [{ translateX: anim.x }, { translateY: anim.y }] }]}>
      {emoji}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  decoration: {
    position: 'absolute',
    opacity: 0.8,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    zIndex: 10,
  },
  castle: {
    fontSize: 60,
    marginBottom: -10,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  logoTextStroke: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFD700',
    position: 'absolute',
    top: 55,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#D50000',
    marginTop: 5,
  },
  starsBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    zIndex: 10,
    elevation: 4,
  },
  starsBadgeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6F00',
  },
  nodeContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 20,
  },
  node: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nodeLocked: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
  nodeIcon: {
    fontSize: 40,
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  lockHint: {
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockHintText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#616161',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4A148C',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 20,
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  saveBtn: {
    backgroundColor: '#FF4081',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
