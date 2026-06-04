import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdaptiveProblem, RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { AudioManager } from '../core/AudioManager';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Layout Constants ─────────────────────────────────────────────────────────
// All node positions defined in absolute pixels — shared by nodes AND avatar path
const N1 = { cx: width * 0.22 + 50, cy: height * 0.26 + 50 }; // Count All center
const N2 = { cx: width * 0.55 + 50, cy: height * 0.49 + 50 }; // Count On center
const N3 = { cx: width * 0.25 + 50, cy: height * 0.68 + 50 }; // Number Bonds center

// ─── Moving Cloud ─────────────────────────────────────────────────────────────
interface CloudProps { startX: number; speed: number; y: number; size: number; opacity: number }

const MovingCloud: React.FC<CloudProps> = ({ startX, speed, y, size, opacity }) => {
  const x = useRef(new Animated.Value(startX)).current;

  useEffect(() => {
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      x.setValue(-200);
      Animated.timing(x, {
        toValue: width + 200,
        duration: speed,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished && !cancelled) animate(); });
    };
    // stagger start
    const delay = (startX / width) * speed;
    const t = setTimeout(animate, delay % speed);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return (
    <Animated.Text
      style={[styles.cloud, { top: y, fontSize: size, opacity, transform: [{ translateX: x }] }]}
    >
      ☁️
    </Animated.Text>
  );
};

// ─── Twinkling Star ───────────────────────────────────────────────────────────
interface TwinkleStarProps { x: number | string; y: number | string; size: number; speed: number; delay?: number }

const TwinkleStar: React.FC<TwinkleStarProps> = ({ x, y, size, speed, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: speed, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.3, duration: speed, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0.3, duration: speed, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.8, duration: speed, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.Text
      style={[
        styles.twinkleStar,
        { left: x as any, top: y as any, fontSize: size, opacity, transform: [{ scale }] },
      ]}
    >
      ⭐
    </Animated.Text>
  );
};

// ─── Node Glow Ring ───────────────────────────────────────────────────────────
interface GlowRingProps { color: string; pulse: boolean }

const GlowRing: React.FC<GlowRingProps> = ({ color, pulse }) => {
  const opacity = useRef(new Animated.Value(pulse ? 0.5 : 0.35)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.9, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.glowRing,
        { borderColor: color, opacity, transform: [{ scale }] },
      ]}
    />
  );
};

// ─── Sparkle Particles ────────────────────────────────────────────────────────
const PARTICLE_EMOJIS = ['⭐', '✨', '🌟', '💫', '⭐', '✨', '🌟', '💫'];

interface SparklesProps { trigger: number } // increment to fire

const SparkleParticles: React.FC<SparklesProps> = ({ trigger }) => {
  const particles = useRef(
    Array.from({ length: 8 }, () => ({
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (trigger === 0) return;
    particles.forEach((p, i) => {
      p.tx.setValue(0); p.ty.setValue(0);
      p.opacity.setValue(1); p.scale.setValue(0);

      const angle = (i / particles.length) * Math.PI * 2;
      const dist = 65 + Math.random() * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      Animated.parallel([
        Animated.timing(p.tx, { toValue: tx, duration: 700, useNativeDriver: true }),
        Animated.timing(p.ty, { toValue: ty, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(p.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.delay(200),
          Animated.timing(p.scale, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [trigger]);

  return (
    <>
      {particles.map((p, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.sparkleParticle,
            {
              opacity: p.opacity,
              transform: [{ translateX: p.tx }, { translateY: p.ty }, { scale: p.scale }],
            },
          ]}
        >
          {PARTICLE_EMOJIS[i]}
        </Animated.Text>
      ))}
    </>
  );
};

// ─── Completion Stars ─────────────────────────────────────────────────────────
const CompletionStars: React.FC<{ count: number }> = ({ count }) => {
  const anims = useRef(Array.from({ length: 3 }, () => new Animated.Value(0.4))).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 250),
          Animated.timing(a, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.completionStarsRow}>
      {[0, 1, 2].map(i => (
        <Animated.Text
          key={i}
          style={[styles.completionStar, { opacity: i < count ? 1 : 0.2, transform: [{ scale: anims[i] }] }]}
        >
          ⭐
        </Animated.Text>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const [stars, setStars] = useState(0);
  const [countOnUnlocked, setCountOnUnlocked] = useState(false);
  const [numberBondsUnlocked, setNumberBondsUnlocked] = useState(false);
  const [caAcc, setCaAcc] = useState(0);
  const [coAcc, setCoAcc] = useState(0);
  const [nbAcc, setNbAcc] = useState(0);
  const [countAllAdaptivePending, setCountAllAdaptivePending] = useState(false);
  const [countOnAdaptivePending, setCountOnAdaptivePending] = useState(false);

  // ── Avatar path (native driver: translateX / translateY from origin 0,0) ──
  // Avatar destinations: just above each node circle center
  const avatarX = useRef(new Animated.Value(N1.cx - 22)).current;
  const avatarY = useRef(new Animated.Value(N1.cy - 80)).current;
  const avatarBounce = useRef(new Animated.Value(1)).current;

  // ── Unlock burst triggers (increment to fire) ─────────────────────────────
  const [coTrigger, setCoTrigger] = useState(0);
  const [nbTrigger, setNbTrigger] = useState(0);

  // ── Stars badge bounce ────────────────────────────────────────────────────
  const starsBadgeScale = useRef(new Animated.Value(1)).current;

  // ── Header float ─────────────────────────────────────────────────────────
  const headerFloat = useRef(new Animated.Value(0)).current;

  // ── Track previous unlock state ────────────────────────────────────────
  const prevCoUnlocked = useRef(false);
  const prevNbUnlocked = useRef(false);

  useEffect(() => {
    // Castle float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerFloat, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(headerFloat, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    const unsub = navigation.addListener('focus', refreshData);
    refreshData();
    return unsub;
  }, [navigation]);

  const getAdaptiveReviewParams = (
    strategy: string,
    targetRoute: 'CountAll' | 'CountOn' | 'NumberBonds'
  ) => {
    const gm = GameManager.getInstance();
    const pendingProblems = gm.saveSystem.getPendingAdaptiveReviewProblems(strategy);
    const incorrectProblems = pendingProblems.length > 0
      ? pendingProblems
      : gm.saveSystem.getLatestIncorrectProblemsForStrategy(strategy);

    return {
      strategy,
      targetRoute,
      incorrectProblems: incorrectProblems.length > 0
        ? incorrectProblems
        : [createFallbackAdaptiveProblem(strategy)],
    };
  };

  const refreshData = useCallback(() => {
    const gm = GameManager.getInstance();
    const profile = gm.saveSystem.getProfile();
    const ss = gm.saveSystem;

    const newStars = profile.totalStars;
    if (newStars !== stars) {
      Animated.sequence([
        Animated.spring(starsBadgeScale, { toValue: 1.35, friction: 3, useNativeDriver: true }),
        Animated.spring(starsBadgeScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    setStars(newStars);

    const coOk = ss.isCountOnUnlocked();
    const nbOk = ss.isNumberBondsUnlocked();

    // Detect new unlocks
    if (coOk && !prevCoUnlocked.current) {
      setCoTrigger(t => t + 1);
      AudioManager.stopSpeech();
      setTimeout(() => AudioManager.speak('Wow! Count On is now unlocked! Great work!', { rate: 0.9, pitch: 1.3 }), 400);
    }
    if (nbOk && !prevNbUnlocked.current) {
      setNbTrigger(t => t + 1);
      AudioManager.stopSpeech();
      setTimeout(() => AudioManager.speak('Amazing! Number Bonds is now unlocked! You are a superstar!', { rate: 0.9, pitch: 1.3 }), 400);
    }
    prevCoUnlocked.current = coOk;
    prevNbUnlocked.current = nbOk;

    setCountOnUnlocked(coOk);
    setNumberBondsUnlocked(nbOk);
    setCaAcc(ss.getAccuracy('COUNT_ALL'));
    setCoAcc(ss.getAccuracy('COUNT_ON'));
    setNbAcc(ss.getAccuracy('NUMBER_BONDS'));
    setCountAllAdaptivePending(ss.hasAdaptiveReviewPending('COUNT_ALL'));
    setCountOnAdaptivePending(ss.hasAdaptiveReviewPending('COUNT_ON'));

    // Move avatar along path based on unlock state
    const target = nbOk
      ? { x: N3.cx - 22, y: N3.cy - 80 }
      : coOk
        ? { x: N2.cx - 22, y: N2.cy - 80 }
        : { x: N1.cx - 22, y: N1.cy - 80 };

    Animated.parallel([
      Animated.spring(avatarX, { toValue: target.x, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.spring(avatarY, { toValue: target.y, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start(() => {
      // Bounce on arrival
      Animated.sequence([
        Animated.timing(avatarBounce, { toValue: 1.25, duration: 180, useNativeDriver: true }),
        Animated.spring(avatarBounce, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    });
  }, [stars]);

  const startGame = (strategy: string, routeName: 'CountAll' | 'CountOn' | 'NumberBonds') => {
    const gm = GameManager.getInstance();
    if (gm.saveSystem.hasAdaptiveReviewPending(strategy)) {
      navigation.replace('AdaptiveMode', getAdaptiveReviewParams(strategy, routeName));
      return;
    }

    gm.startSession(strategy);
    navigation.navigate(routeName as any);
  };

  // ── Overall progress (0–30 activities to see the full map) ────────────────
  const gm = GameManager.getInstance();
  const totalActivities =
    gm.saveSystem.getProgress('COUNT_ALL').completedActivities +
    gm.saveSystem.getProgress('COUNT_ON').completedActivities +
    gm.saveSystem.getProgress('NUMBER_BONDS').completedActivities;
  const overallProgress = Math.min(1, totalActivities / 30);

  // ── Star counts per node (for completion stars display) ──────────────────
  const caStars = Math.min(3, Math.floor((caAcc / 100) * 3));
  const coStars = Math.min(3, Math.floor((coAcc / 100) * 3));
  const nbStars = Math.min(3, Math.floor((nbAcc / 100) * 3));

  return (
    <View style={styles.container}>
      {/* Background gradient — deep adventure sky */}
      <LinearGradient
        colors={['#0D1B6E', '#1A3A8F', '#7B4FD0', '#FF6B9D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />

      {/* Stars field */}
      {[
        { x: '8%', y: '8%', s: 14, sp: 1200, d: 0 },
        { x: '75%', y: '6%', s: 18, sp: 900, d: 300 },
        { x: '45%', y: '12%', s: 12, sp: 1500, d: 600 },
        { x: '88%', y: '18%', s: 16, sp: 1100, d: 100 },
        { x: '20%', y: '20%', s: 10, sp: 1300, d: 700 },
        { x: '60%', y: '35%', s: 14, sp: 800, d: 200 },
        { x: '5%', y: '42%', s: 12, sp: 1400, d: 450 },
        { x: '92%', y: '38%', s: 10, sp: 1000, d: 350 },
      ].map((s, i) => (
        <TwinkleStar key={i} x={s.x} y={s.y} size={s.s} speed={s.sp} delay={s.d} />
      ))}

      {/* Moving clouds */}
      <MovingCloud startX={-150} speed={22000} y={height * 0.13} size={55} opacity={0.25} />
      <MovingCloud startX={width * 0.4} speed={30000} y={height * 0.08} size={70} opacity={0.2} />
      <MovingCloud startX={width * 0.7} speed={18000} y={height * 0.18} size={48} opacity={0.22} />

      {/* Ground/hills */}
      <View style={styles.groundRow} pointerEvents="none">
        <Svg width={width} height={120} style={styles.hillsSvg}>
          <Path
            d={`M0 120 Q${width * 0.15} 40 ${width * 0.35} 70 Q${width * 0.55} 10 ${width * 0.7} 60 Q${width * 0.85} 30 ${width} 80 L${width} 120 Z`}
            fill="rgba(20,80,20,0.45)"
          />
          <Path
            d={`M0 120 Q${width * 0.2} 60 ${width * 0.45} 85 Q${width * 0.65} 30 ${width * 0.8} 75 Q${width * 0.92} 55 ${width} 90 L${width} 120 Z`}
            fill="rgba(30,100,30,0.35)"
          />
        </Svg>
      </View>

      {/* ── SVG path connecting nodes ─────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          {/* Road shadow */}
          <Path
            d={`M ${N1.cx} ${N1.cy} C ${N1.cx + 120} ${N1.cy + 60}, ${N2.cx - 80} ${N2.cy - 40}, ${N2.cx} ${N2.cy} S ${N3.cx + 100} ${N3.cy - 60}, ${N3.cx} ${N3.cy}`}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={22}
            fill="none"
            strokeLinecap="round"
          />
          {/* Road surface */}
          <Path
            d={`M ${N1.cx} ${N1.cy} C ${N1.cx + 120} ${N1.cy + 60}, ${N2.cx - 80} ${N2.cy - 40}, ${N2.cx} ${N2.cy} S ${N3.cx + 100} ${N3.cy - 60}, ${N3.cx} ${N3.cy}`}
            stroke="rgba(255,230,100,0.55)"
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
          />
          {/* Dashes */}
          <Path
            d={`M ${N1.cx} ${N1.cy} C ${N1.cx + 120} ${N1.cy + 60}, ${N2.cx - 80} ${N2.cy - 40}, ${N2.cx} ${N2.cy} S ${N3.cx + 100} ${N3.cy - 60}, ${N3.cx} ${N3.cy}`}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={3}
            fill="none"
            strokeDasharray="14 14"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* ── Animated player avatar ────────────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.avatarContainer,
          {
            transform: [
              { translateX: avatarX },
              { translateY: avatarY },
              { scale: avatarBounce },
            ],
          },
        ]}
      >
        <Text style={styles.avatarEmoji}>🧒</Text>
        <View style={styles.avatarShadow} />
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <Animated.Text style={[styles.castle, { transform: [{ translateY: headerFloat }] }]}>
          🏰
        </Animated.Text>
        <View style={styles.logoWrapper}>
          <Text style={styles.logoShadow}>Add-Venture</Text>
          <Text style={styles.logoText}>Add-Venture</Text>
        </View>
      </View>

      {/* Stars badge */}
      <Animated.View style={[styles.starsBadge, { transform: [{ scale: starsBadgeScale }] }]}>
        <Text style={styles.starsBadgeText}>⭐ {stars} Stars</Text>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════
          NODE 1 — COUNT ALL (always unlocked)
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.nodeContainer, { left: N1.cx - 50, top: N1.cy - 50 }]}>
        <GlowRing color="#FFCA28" pulse={!countOnUnlocked} />
        <TouchableOpacity
          style={[styles.node, { backgroundColor: '#FFCA28' }]}
          onPress={() => startGame('COUNT_ALL', 'CountAll')}
          activeOpacity={0.82}
        >
          <Text style={styles.nodeIcon}>⭐</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Count All</Text>
        {caAcc > 0 && (
          <>
            <CompletionStars count={caStars} />
            <Text style={styles.nodeAccuracy}>{caAcc}%</Text>
          </>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          NODE 2 — COUNT ON
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.nodeContainer, { left: N2.cx - 50, top: N2.cy - 50 }]}>
        {countOnUnlocked && <GlowRing color="#D500F9" pulse={!numberBondsUnlocked} />}
        {/* Sparkle burst on unlock */}
        <View style={styles.sparkleAnchor} pointerEvents="none">
          <SparkleParticles trigger={coTrigger} />
        </View>
        <TouchableOpacity
          style={[
            styles.node,
            countOnUnlocked ? { backgroundColor: '#D500F9' } : styles.nodeLocked,
          ]}
          onPress={countOnUnlocked ? () => startGame('COUNT_ON', 'CountOn') : undefined}
          disabled={!countOnUnlocked}
          activeOpacity={0.82}
        >
          <Text style={styles.nodeIcon}>{countOnUnlocked ? '⚡' : '🔒'}</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Count On</Text>
        {countOnUnlocked && coAcc > 0 && (
          <>
            <CompletionStars count={coStars} />
            <Text style={styles.nodeAccuracy}>{coAcc}%</Text>
          </>
        )}
        {!countOnUnlocked && (
          <View style={styles.lockHint}>
            <Text style={styles.lockHintText}>
              {countAllAdaptivePending ? 'Finish Adaptive Mode' : '60% on Count All'}
            </Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          NODE 3 — NUMBER BONDS
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.nodeContainer, { left: N3.cx - 50, top: N3.cy - 50 }]}>
        {numberBondsUnlocked && <GlowRing color="#00BFFF" pulse />}
        <View style={styles.sparkleAnchor} pointerEvents="none">
          <SparkleParticles trigger={nbTrigger} />
        </View>
        <TouchableOpacity
          style={[
            styles.node,
            numberBondsUnlocked ? { backgroundColor: '#00BFFF' } : styles.nodeLocked,
          ]}
          onPress={numberBondsUnlocked ? () => startGame('NUMBER_BONDS', 'NumberBonds') : undefined}
          disabled={!numberBondsUnlocked}
          activeOpacity={0.82}
        >
          <Text style={styles.nodeIcon}>{numberBondsUnlocked ? '🔗' : '🔒'}</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Number Bonds</Text>
        {numberBondsUnlocked && nbAcc > 0 && (
          <>
            <CompletionStars count={nbStars} />
            <Text style={styles.nodeAccuracy}>{nbAcc}%</Text>
          </>
        )}
        {!numberBondsUnlocked && (
          <View style={styles.lockHint}>
            <Text style={styles.lockHintText}>
              {countOnAdaptivePending ? 'Finish Adaptive Mode' : '60% on Count On'}
            </Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM NAV
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, { color: '#7B4FD0' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Progress')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createFallbackAdaptiveProblem(strategy: string): AdaptiveProblem {
  if (strategy === 'NUMBER_BONDS') {
    return {
      num1: 2,
      num2: 1,
      correctAnswer: 1,
      givenAnswer: 0,
      strategy,
      isMissingPart: true,
    };
  }

  return {
    num1: 1,
    num2: 1,
    correctAnswer: 2,
    givenAnswer: 0,
    strategy,
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B6E', overflow: 'hidden' },

  // Background
  cloud: { position: 'absolute' },
  twinkleStar: { position: 'absolute' },
  groundRow: { position: 'absolute', bottom: 76, left: 0, right: 0 },
  hillsSvg: { position: 'absolute', bottom: 0 },

  // Avatar
  avatarContainer: { position: 'absolute', left: 0, top: 0, alignItems: 'center', zIndex: 25 },
  avatarEmoji: { fontSize: 40 },
  avatarShadow: {
    width: 34, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: -4,
  },

  // Header
  header: { alignItems: 'center', marginTop: 52, zIndex: 10 },
  castle: { fontSize: 56, textShadowColor: 'rgba(255,255,255,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  logoWrapper: { alignItems: 'center', marginTop: -6 },
  logoShadow: {
    position: 'absolute',
    fontSize: 36, fontWeight: '900', color: '#FF6B9D',
    top: 2, left: 2,
  },
  logoText: {
    fontSize: 36, fontWeight: '900', color: '#FFD700',
    textShadowColor: '#7B4FD0', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 6,
  },

  // Stars badge
  starsBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.95)',
    paddingHorizontal: 22, paddingVertical: 8,
    borderRadius: 24, marginTop: 8, zIndex: 10,
    elevation: 6,
    shadowColor: '#FF8F00', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 6,
  },
  starsBadgeText: { fontSize: 18, fontWeight: '900', color: '#5D4037' },

  // Nodes
  nodeContainer: {
    position: 'absolute',
    width: 100, height: 100,
    alignItems: 'center',
    zIndex: 20,
  },
  node: {
    width: 100, height: 100,
    borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 8,
  },
  nodeLocked: { backgroundColor: '#37474F', borderColor: 'rgba(255,255,255,0.35)', opacity: 0.75 },
  nodeIcon: { fontSize: 42 },
  nodeLabel: {
    marginTop: 74, // below the 100px node
    position: 'absolute',
    fontSize: 15, fontWeight: '900', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
    textAlign: 'center',
    width: 120, left: -10,
  },
  nodeAccuracy: {
    position: 'absolute',
    top: 108,
    marginTop: 22,
    fontSize: 11, fontWeight: 'bold', color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  completionStarsRow: {
    position: 'absolute',
    top: 102, left: -4,
    flexDirection: 'row',
    gap: 1,
    width: 108, justifyContent: 'center',
  },
  completionStar: { fontSize: 14 },

  // Glow ring
  glowRing: {
    position: 'absolute',
    width: 118, height: 118,
    borderRadius: 59,
    borderWidth: 4,
    left: -9, top: -9,
    zIndex: -1,
  },

  // Sparkle particles
  sparkleAnchor: {
    position: 'absolute',
    width: 100, height: 100,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 30,
  },
  sparkleParticle: { position: 'absolute', fontSize: 18 },

  // Lock hint
  lockHint: {
    position: 'absolute',
    top: 116,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
    width: 130, left: -15, alignItems: 'center',
  },
  lockHintText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },

  // Progress ribbon
  progressRibbon: {
    position: 'absolute',
    bottom: 84,
    left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  ribbonLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 'bold', marginBottom: 7, textAlign: 'center' },
  ribbonTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'visible', marginBottom: 5 },
  ribbonFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFCA28', borderRadius: 5 },
  ribbonMarker: {
    position: 'absolute',
    top: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFF', marginLeft: -10,
    elevation: 4,
  },
  ribbonPct: { color: '#FFCA28', fontSize: 11, fontWeight: '900', textAlign: 'right' },

  // Bottom nav
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 76,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingBottom: 8, elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  navIcon: { fontSize: 24, marginBottom: 3 },
  navText: { fontSize: 12, fontWeight: 'bold', color: '#616161' },
});
