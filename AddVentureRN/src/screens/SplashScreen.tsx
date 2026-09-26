import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../App';
import { AudioManager } from '../core/AudioManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const { width, height } = Dimensions.get('window');

// Floating magical items emerging from the storybook
const FLOATING_ELEMENTS = [
  { char: '🍎', xOffset: -width * 0.32, yTarget: -140, delay: 400, size: 28 },
  { char: '1', xOffset: -width * 0.22, yTarget: -180, delay: 500, size: 24, isNum: true, color: '#FFCA28' },
  { char: '➕', xOffset: -width * 0.08, yTarget: -210, delay: 600, size: 26 },
  { char: '2', xOffset: width * 0.08, yTarget: -210, delay: 650, size: 24, isNum: true, color: '#4DD0E1' },
  { char: '🍌', xOffset: width * 0.22, yTarget: -180, delay: 550, size: 28 },
  { char: '⭐', xOffset: width * 0.32, yTarget: -140, delay: 450, size: 26 },
];

export default function SplashScreen({ navigation }: Props) {
  const hasNavigated = useRef(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // Animation values
  const bookScale = useRef(new Animated.Value(0.4)).current;
  const bookRotate = useRef(new Animated.Value(0)).current;
  const leftPageRotate = useRef(new Animated.Value(0)).current;
  const rightPageRotate = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const oliverScale = useRef(new Animated.Value(0)).current;
  const oliverFloat = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  // Floating items animations
  const floatingAnims = useRef(
    FLOATING_ELEMENTS.map(() => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
      wobble: new Animated.Value(0),
    }))
  ).current;

  const goToHome = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    AudioManager.stopSpeech();
    navigation.replace('Home');
  };

  useEffect(() => {
    // 1. Loading progress bar (0% -> 100% over 4.8 seconds)
    const listenerId = loadingProgress.addListener(({ value }) => {
      setProgressPercent(Math.min(100, Math.round(value * 100)));
    });

    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 4800,
      useNativeDriver: false,
    }).start(() => {
      goToHome();
    });

    // 2. Initial Book Entrance: spring in and center
    Animated.spring(bookScale, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // 3. Playful Book Jiggle before opening
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(bookRotate, { toValue: -4, duration: 80, useNativeDriver: true }),
      Animated.timing(bookRotate, { toValue: 4, duration: 80, useNativeDriver: true }),
      Animated.timing(bookRotate, { toValue: -2, duration: 80, useNativeDriver: true }),
      Animated.timing(bookRotate, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.delay(100),
    ]).start(() => {
      // 4. Open the magical book pages
      Animated.parallel([
        Animated.timing(leftPageRotate, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(rightPageRotate, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(glowScale, {
          toValue: 1.3,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 5. Oliver and Title emerge from the glowing pages
        Animated.parallel([
          Animated.spring(oliverScale, {
            toValue: 1,
            friction: 5,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(titleScale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();

        // 6. Oliver gentle floating loop
        Animated.loop(
          Animated.sequence([
            Animated.timing(oliverFloat, { toValue: -10, duration: 900, useNativeDriver: true }),
            Animated.timing(oliverFloat, { toValue: 0, duration: 900, useNativeDriver: true }),
          ])
        ).start();

        // 7. Animate floating math elements rising out of the book
        floatingAnims.forEach((anim, i) => {
          const item = FLOATING_ELEMENTS[i];
          Animated.sequence([
            Animated.delay(item.delay),
            Animated.parallel([
              Animated.timing(anim.y, {
                toValue: item.yTarget,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.spring(anim.scale, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
              }),
            ]),
          ]).start();

          // Continuous floating wobble loop
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim.wobble, { toValue: 6, duration: 600 + i * 80, useNativeDriver: true }),
              Animated.timing(anim.wobble, { toValue: -6, duration: 600 + i * 80, useNativeDriver: true }),
            ])
          ).start();
        });
      });
    });

    // Friendly welcoming narration
    const voiceTimeout = setTimeout(() => {
      AudioManager.speak('Welcome to Add-Venture! Let us explore math together!', {
        rate: 0.95,
        pitch: 1.3,
      });
    }, 700);

    return () => {
      loadingProgress.removeListener(listenerId);
      clearTimeout(voiceTimeout);
      AudioManager.stopSpeech();
    };
  }, []);

  // Left cover 3D turn
  const leftPageTransform = leftPageRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-110deg'],
  });

  // Right page turn
  const rightPageTransform = rightPageRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '25deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#1E3A8A', '#2563EB']}
        style={styles.gradientBg}
      >
        {/* Background Twinkling Stars */}
        <View style={styles.starField} pointerEvents="none">
          <Text style={[styles.bgStar, { top: '8%', left: '12%', fontSize: 18 }]}>✨</Text>
          <Text style={[styles.bgStar, { top: '15%', right: '14%', fontSize: 24 }]}>⭐</Text>
          <Text style={[styles.bgStar, { top: '25%', left: '8%', fontSize: 16 }]}>🌟</Text>
          <Text style={[styles.bgStar, { top: '35%', right: '10%', fontSize: 20 }]}>✨</Text>
          <Text style={[styles.bgStar, { bottom: '25%', left: '15%', fontSize: 22 }]}>⭐</Text>
          <Text style={[styles.bgStar, { bottom: '20%', right: '12%', fontSize: 16 }]}>🌟</Text>
        </View>

        {/* Header / Logo */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
            },
          ]}
        >
          <View style={styles.castleRow}>
            <Text style={styles.castleEmoji}>🏰</Text>
          </View>
          <Text style={styles.logoShadow}>Add-Venture!</Text>
          <Text style={styles.logoTitle}>Add-Venture!</Text>
          <Text style={styles.subtitle}>✨ The Magical Math Journey ✨</Text>
        </Animated.View>

        {/* Central Stage: Storybook & Emerging Oliver */}
        <View style={styles.stageContainer}>
          {/* Magical Golden Glow radiating from inside the book */}
          <Animated.View
            style={[
              styles.magicalGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Floating Math Elements & Fruits */}
          {FLOATING_ELEMENTS.map((item, i) => (
            <Animated.View
              key={i}
              style={[
                styles.floatingItem,
                {
                  left: width * 0.5 + item.xOffset - item.size / 2,
                  opacity: floatingAnims[i].opacity,
                  transform: [
                    { translateY: floatingAnims[i].y },
                    { translateX: floatingAnims[i].wobble },
                    { scale: floatingAnims[i].scale },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <Text
                style={[
                  styles.floatingText,
                  { fontSize: item.size },
                  item.isNum && { color: item.color, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 },
                ]}
              >
                {item.char}
              </Text>
            </Animated.View>
          ))}

          {/* Oliver the Owl emerging from the book */}
          <Animated.View
            style={[
              styles.oliverContainer,
              {
                transform: [
                  { scale: oliverScale },
                  { translateY: oliverFloat },
                ],
              },
            ]}
          >
            <Image
              source={require('../../assets/android-icon-foreground.png')}
              style={styles.oliverImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* The 3D Storybook */}
          <Animated.View
            style={[
              styles.storybookBase,
              {
                transform: [
                  { scale: bookScale },
                  {
                    rotateZ: bookRotate.interpolate({
                      inputRange: [-10, 10],
                      outputRange: ['-10deg', '10deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Open Pages Background Layer */}
            <View style={styles.openPagesBase}>
              <View style={styles.pageLeftBase}>
                <Text style={styles.pageNumberLeft}>1 + 2</Text>
                <Text style={styles.pageGlyphs}>🍎 + 🍎🍎</Text>
              </View>
              <View style={styles.bookSpine} />
              <View style={styles.pageRightBase}>
                <Text style={styles.pageNumberRight}>= 3 ✨</Text>
                <Text style={styles.pageGlyphs}>⭐⭐⭐</Text>
              </View>
            </View>

            {/* Left Cover (Animates Open) */}
            <Animated.View
              style={[
                styles.leftPageCover,
                {
                  transform: [{ rotateY: leftPageTransform }],
                },
              ]}
            >
              <LinearGradient
                colors={['#8D6E63', '#6D4C41', '#4E342E']}
                style={styles.coverGradient}
              >
                <View style={styles.goldenBorder}>
                  <Text style={styles.coverEmblem}>⭐</Text>
                  <Text style={styles.coverTitle}>MATH</Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Right Page Top Sheet */}
            <Animated.View
              style={[
                styles.rightPageCover,
                {
                  transform: [{ rotateY: rightPageTransform }],
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Bottom Loading Progress Bar */}
        <View style={styles.bottomContainer}>
          <View style={styles.loadingInfoRow}>
            <Text style={styles.loadingLabel}>Loading Adventure...</Text>
            <Text style={styles.loadingPercentText}>{progressPercent}%</Text>
          </View>
          <View style={styles.loadingTrack}>
            <Animated.View
              style={[
                styles.loadingFill,
                {
                  width: loadingProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={['#FFE082', '#FFCA28', '#FFA000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.06,
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
  },
  bgStar: {
    position: 'absolute',
    opacity: 0.65,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: height * 0.02,
    zIndex: 10,
  },
  castleRow: {
    marginBottom: 4,
  },
  castleEmoji: {
    fontSize: 44,
  },
  logoShadow: {
    position: 'absolute',
    top: 52,
    fontSize: 44,
    fontWeight: '900',
    color: '#1A237E',
    letterSpacing: 1.5,
  },
  logoTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFD54F',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E0F2FE',
    marginTop: 6,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  stageContainer: {
    width: '100%',
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  magicalGlow: {
    position: 'absolute',
    width: 220,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFE082',
    opacity: 0.45,
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 35,
    elevation: 20,
    bottom: 50,
  },
  oliverContainer: {
    position: 'absolute',
    bottom: 60,
    zIndex: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oliverImage: {
    width: 170,
    height: 170,
  },
  floatingItem: {
    position: 'absolute',
    bottom: 80,
    zIndex: 20,
  },
  floatingText: {
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  storybookBase: {
    width: 260,
    height: 120,
    position: 'absolute',
    bottom: 20,
    zIndex: 5,
  },
  openPagesBase: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#D7CCC8',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  pageLeftBase: {
    flex: 1,
    backgroundColor: '#FFFDE7',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageRightBase: {
    flex: 1,
    backgroundColor: '#FFF9C4',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookSpine: {
    width: 6,
    backgroundColor: '#BCAAA4',
    height: '100%',
  },
  pageNumberLeft: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E65100',
    marginBottom: 4,
  },
  pageNumberRight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2E7D32',
    marginBottom: 4,
  },
  pageGlyphs: {
    fontSize: 12,
  },
  leftPageCover: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 130,
    zIndex: 8,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  rightPageCover: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 130,
    backgroundColor: '#FFF8E1',
    opacity: 0.3,
    zIndex: 6,
  },
  coverGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldenBorder: {
    borderWidth: 2,
    borderColor: '#FFD54F',
    borderRadius: 8,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEmblem: {
    fontSize: 22,
  },
  coverTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFD54F',
    letterSpacing: 1,
    marginTop: 2,
  },
  bottomContainer: {
    width: Math.min(width * 0.78, 300),
    alignItems: 'center',
    marginBottom: height * 0.02,
    zIndex: 10,
  },
  loadingInfoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  loadingLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF8E1',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingPercentText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFD54F',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingTrack: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    padding: 1.5,
  },
  loadingFill: {
    height: '100%',
    borderRadius: 7,
    overflow: 'hidden',
  },
});
