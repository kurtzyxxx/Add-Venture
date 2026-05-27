import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [stars, setStars] = useState(0);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const profile = GameManager.getInstance().saveSystem.getProfile();
      setStars(profile.totalStars);
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
      </View>

      {/* Nodes */}
      <Animated.View style={[styles.nodeContainer, { top: '25%', left: '15%', transform: [{ translateY }] }]}>
        <TouchableOpacity style={[styles.node, { backgroundColor: '#FFCA28' }]} onPress={() => startGame('COUNT_ALL', 'CountAll')} activeOpacity={0.8}>
          <Text style={styles.nodeIcon}>⭐</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Count All</Text>
      </Animated.View>

      <Animated.View style={[styles.nodeContainer, { top: '50%', right: '15%', transform: [{ translateY }] }]}>
        <TouchableOpacity style={[styles.node, { backgroundColor: '#D500F9' }]} onPress={() => startGame('COUNT_ON', 'CountOn')} activeOpacity={0.8}>
          <Text style={styles.nodeIcon}>🔒</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Count On</Text>
      </Animated.View>

      <Animated.View style={[styles.nodeContainer, { top: '70%', left: '30%', transform: [{ translateY }] }]}>
        <TouchableOpacity style={[styles.node, { backgroundColor: '#00BFFF' }]} onPress={() => startGame('NUMBER_BONDS', 'NumberBonds')} activeOpacity={0.8}>
          <Text style={styles.nodeIcon}>🔒</Text>
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
    color: '#FFD700', // Yellow outline/stroke simulation
    position: 'absolute',
    top: 55,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#D50000', // Red fill
    marginTop: 5,
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
  }
});
