import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { AudioManager } from '../core/AudioManager';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Layout Constants ─────────────────────────────────────────────────────────
// Node centers placed along a natural winding S-curve through the orchard
const N1 = { cx: width * 0.24 + 45, cy: height * 0.27 + 40 }; // Apple Orchard (Count All)
const N2 = { cx: width * 0.54 + 45, cy: height * 0.47 + 40 }; // Orange Grove (Count On)
const N3 = { cx: width * 0.26 + 45, cy: height * 0.65 + 40 }; // Harmony Tree (Number Bonds)

// ─── Drifting Daylight Cloud ──────────────────────────────────────────────────
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
    const delay = (startX / width) * speed;
    const t = setTimeout(animate, delay % speed);
    return () => { cancelled = true; clearTimeout(t); };
  }, [speed, startX]);

  return (
    <Animated.Text
      style={[styles.cloud, { top: y, fontSize: size, opacity, transform: [{ translateX: x }] }]}
    >
      ☁️
    </Animated.Text>
  );
};

// ─── Floating Orchard Sparkle ─────────────────────────────────────────────────
interface SparkleProps { x: number | string; y: number | string; size: number; speed: number; delay?: number }

const OrchardSparkle: React.FC<SparkleProps> = ({ x, y, size, speed, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0.9, duration: speed, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.25, duration: speed, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0.2, duration: speed, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.7, duration: speed, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale, speed]);

  return (
    <Animated.Text
      style={[
        styles.orchardSparkle,
        { left: x as any, top: y as any, fontSize: size, opacity, transform: [{ scale }] },
      ]}
    >
      ✨
    </Animated.Text>
  );
};

// ─── Pulsing Glow Ring Around Active Node ────────────────────────────────────
interface GlowRingProps { color: string; pulse: boolean }

const GlowRing: React.FC<GlowRingProps> = ({ color, pulse }) => {
  const opacity = useRef(new Animated.Value(pulse ? 0.6 : 0.3)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.95, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.18, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulse, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.glowRing,
        { borderColor: color, opacity, transform: [{ scale }] },
      ]}
    />
  );
};

// ─── Sparkle Burst on Unlock ─────────────────────────────────────────────────
const PARTICLE_EMOJIS = ['🍎', '✨', '🍊', '🌟', '🌳', '✨', '⭐', '💫'];

const SparkleParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
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
      const dist = 65 + Math.random() * 35;
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
  }, [trigger, particles]);

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
  return (
    <View style={styles.completionStarsRow}>
      {[0, 1, 2].map(i => (
        <Text key={i} style={[styles.completionStar, { opacity: i < count ? 1 : 0.25 }]}>
          ⭐
        </Text>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(1);
  const [countOnUnlocked, setCountOnUnlocked] = useState(false);
  const [numberBondsUnlocked, setNumberBondsUnlocked] = useState(false);
  const [caAcc, setCaAcc] = useState(0);
  const [coAcc, setCoAcc] = useState(0);
  const [nbAcc, setNbAcc] = useState(0);
  const [oliverSpeech, setOliverSpeech] = useState<string | null>(null);

  // ── Oliver Mascot movement and bounce ──────────────────────────────────────
  const avatarX = useRef(new Animated.Value(N1.cx - 24)).current;
  const avatarY = useRef(new Animated.Value(N1.cy - 78)).current;
  const avatarBounce = useRef(new Animated.Value(1)).current;

  // ── Unlock burst triggers ─────────────────────────────────────────────────
  const [coTrigger, setCoTrigger] = useState(0);
  const [nbTrigger, setNbTrigger] = useState(0);

  // ── Badges animations ─────────────────────────────────────────────────────
  const starsBadgeScale = useRef(new Animated.Value(1)).current;
  const playBtnPulse = useRef(new Animated.Value(1)).current;
  const titleFloat = useRef(new Animated.Value(0)).current;

  const prevCoUnlocked = useRef(false);
  const prevNbUnlocked = useRef(false);
  const oliverSpeechTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Title gentle floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleFloat, { toValue: -6, duration: 1800, useNativeDriver: true }),
        Animated.timing(titleFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Play button inviting pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(playBtnPulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(playBtnPulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    const unsub = navigation.addListener('focus', refreshData);
    refreshData();
    return () => {
      unsub();
      if (oliverSpeechTimeout.current) clearTimeout(oliverSpeechTimeout.current);
    };
  }, [navigation]);

  const refreshData = useCallback(() => {
    AudioManager.startBgm();
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

    // Calculate streak from profile or stars
    const currentStreak = Math.max(1, profile.consecutiveCorrect > 0 ? profile.consecutiveCorrect : Math.min(10, Math.floor(newStars / 5) + 1));
    setStreak(currentStreak);

    const coOk = ss.isCountOnUnlocked();
    const nbOk = ss.isNumberBondsUnlocked();

    // Detect new unlocks with Oliver voice celebration
    if (coOk && !prevCoUnlocked.current) {
      setCoTrigger(t => t + 1);
      AudioManager.stopSpeech();
      setTimeout(() => AudioManager.playVoiceClip('unlock_orange_grove'), 350);
    }
    if (nbOk && !prevNbUnlocked.current) {
      setNbTrigger(t => t + 1);
      AudioManager.stopSpeech();
      setTimeout(() => AudioManager.playVoiceClip('unlock_harmony_tree'), 350);
    }
    prevCoUnlocked.current = coOk;
    prevNbUnlocked.current = nbOk;

    setCountOnUnlocked(coOk);
    setNumberBondsUnlocked(nbOk);
    setCaAcc(ss.getAccuracy('COUNT_ALL'));
    setCoAcc(ss.getAccuracy('COUNT_ON'));
    setNbAcc(ss.getAccuracy('NUMBER_BONDS'));

    // Move Oliver mascot along the orchard road to the highest active node
    const target = nbOk
      ? { x: N3.cx - 24, y: N3.cy - 78 }
      : coOk
        ? { x: N2.cx - 24, y: N2.cy - 78 }
        : { x: N1.cx - 24, y: N1.cy - 78 };

    Animated.parallel([
      Animated.spring(avatarX, { toValue: target.x, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.spring(avatarY, { toValue: target.y, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        Animated.timing(avatarBounce, { toValue: 1.3, duration: 180, useNativeDriver: true }),
        Animated.spring(avatarBounce, { toValue: 1, friction: 3.5, useNativeDriver: true }),
      ]).start();
    });
  }, [stars, avatarBounce, avatarX, avatarY, starsBadgeScale]);

  // ── Oliver Mascot Interaction ───────────────────────────────────────────────
  const handleTapOliver = () => {
    Animated.sequence([
      Animated.timing(avatarBounce, { toValue: 1.35, duration: 150, useNativeDriver: true }),
      Animated.spring(avatarBounce, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    const clipIdx = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
    const clipKey = `home_greeting_${clipIdx}` as const;
    const greetingTexts = [
      "I'm Oliver! Tap a tree to start our adventure!",
      "Ready to count together? You're doing great!",
      "Tap Play Next to jump right into the game!",
    ];
    const pickedText = greetingTexts[clipIdx - 1];

    setOliverSpeech(pickedText.length > 32 ? 'Hoot! Let’s play math!' : pickedText);
    AudioManager.stopSpeech();
    AudioManager.playVoiceClip(clipKey);

    if (oliverSpeechTimeout.current) clearTimeout(oliverSpeechTimeout.current);
    oliverSpeechTimeout.current = setTimeout(() => setOliverSpeech(null), 3500);
  };

  // ── Game Launcher with friendly audio prompt ───────────────────────────────
  const startGame = (strategy: string, routeName: 'CountAll' | 'CountOn' | 'NumberBonds', announcement?: string) => {
    AudioManager.playSfx('click');
    AudioManager.stopSpeech();
    if (announcement) {
      AudioManager.speak(announcement, { rate: 0.95, pitch: 1.3 });
    }
    const gm = GameManager.getInstance();
    gm.startSession(strategy);
    navigation.navigate(routeName as any);
  };

  // ── Determine Next Active Play Target ───────────────────────────────────────
  const getNextPlayTarget = () => {
    if (numberBondsUnlocked) {
      return {
        strategy: 'NUMBER_BONDS',
        route: 'NumberBonds' as const,
        title: 'PLAY: HARMONY TREE 🌳',
        announcement: 'Off to the Harmony Tree!',
      };
    }
    if (countOnUnlocked) {
      return {
        strategy: 'COUNT_ON',
        route: 'CountOn' as const,
        title: 'PLAY: ORANGE GROVE 🍊',
        announcement: 'Off to the Orange Grove!',
      };
    }
    return {
      strategy: 'COUNT_ALL',
      route: 'CountAll' as const,
      title: 'PLAY: APPLE ORCHARD 🍎',
      announcement: 'Off to the Apple Orchard!',
    };
  };

  const nextTarget = getNextPlayTarget();

  const caStars = Math.min(3, Math.floor((caAcc / 100) * 3));
  const coStars = Math.min(3, Math.floor((coAcc / 100) * 3));
  const nbStars = Math.min(3, Math.floor((nbAcc / 100) * 3));

  return (
    <View style={styles.container}>
      {/* ── Sunny Orchard Sky & Hills Background ─────────────────────────────── */}
      <LinearGradient
        colors={['#4FC3F7', '#81D4FA', '#C8E6C9', '#A5D6A7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating Sparkles & Soft Orchard Clouds */}
      <MovingCloud startX={-140} speed={24000} y={height * 0.11} size={50} opacity={0.65} />
      <MovingCloud startX={width * 0.45} speed={32000} y={height * 0.06} size={64} opacity={0.55} />
      <MovingCloud startX={width * 0.8} speed={19000} y={height * 0.16} size={42} opacity={0.6} />

      {[
        { x: '10%', y: '12%', s: 15, sp: 1100, d: 0 },
        { x: '82%', y: '10%', s: 18, sp: 950, d: 250 },
        { x: '48%', y: '16%', s: 13, sp: 1400, d: 500 },
        { x: '90%', y: '22%', s: 16, sp: 1200, d: 150 },
        { x: '12%', y: '38%', s: 14, sp: 1300, d: 350 },
        { x: '86%', y: '42%', s: 14, sp: 1000, d: 400 },
      ].map((s, i) => (
        <OrchardSparkle key={i} x={s.x} y={s.y} size={s.s} speed={s.sp} delay={s.d} />
      ))}

      {/* Rolling Grassy Hills at the bottom */}
      <View style={styles.groundRow} pointerEvents="none">
        <Svg width={width} height={140} style={styles.hillsSvg}>
          <Path
            d={`M0 140 Q${width * 0.2} 45 ${width * 0.42} 75 Q${width * 0.65} 25 ${width * 0.85} 65 Q${width * 0.95} 40 ${width} 70 L${width} 140 Z`}
            fill="#43A047"
          />
          <Path
            d={`M0 140 Q${width * 0.25} 65 ${width * 0.52} 90 Q${width * 0.72} 45 ${width * 0.88} 80 L${width} 140 Z`}
            fill="#2E7D32"
          />
        </Svg>
      </View>

      {/* ── Cobblestone Orchard Adventure Path ──────────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          {/* Path Border / Shadow */}
          <Path
            d={`M ${N1.cx} ${N1.cy} C ${N1.cx + 120} ${N1.cy + 55}, ${N2.cx - 80} ${N2.cy - 35}, ${N2.cx} ${N2.cy} S ${N3.cx + 100} ${N3.cy - 55}, ${N3.cx} ${N3.cy}`}
            stroke="rgba(62, 39, 35, 0.25)"
            strokeWidth={26}
            fill="none"
            strokeLinecap="round"
          />
          {/* Path Surface (Golden Cobblestone) */}
          <Path
            d={`M ${N1.cx} ${N1.cy} C ${N1.cx + 120} ${N1.cy + 55}, ${N2.cx - 80} ${N2.cy - 35}, ${N2.cx} ${N2.cy} S ${N3.cx + 100} ${N3.cy - 55}, ${N3.cx} ${N3.cy}`}
            stroke="#FFE082"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />
          {/* Dashed Center Guide */}
          <Path
            d={`M ${N1.cx} ${N1.cy} C ${N1.cx + 120} ${N1.cy + 55}, ${N2.cx - 80} ${N2.cy - 35}, ${N2.cx} ${N2.cy} S ${N3.cx + 100} ${N3.cy - 55}, ${N3.cx} ${N3.cy}`}
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
            fill="none"
            strokeDasharray="12 12"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* ── Oliver the Owl Mascot (Interactive Hopper) ───────────────────────── */}
      <Animated.View
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
        <TouchableOpacity onPress={handleTapOliver} activeOpacity={0.85} style={styles.oliverTouchWrap}>
          {oliverSpeech && (
            <View style={styles.oliverSpeechBubble}>
              <Text style={styles.oliverSpeechText}>{oliverSpeech}</Text>
              <View style={styles.oliverSpeechTail} />
            </View>
          )}
          <View style={styles.oliverCircle}>
            <Text style={styles.oliverEmoji}>🦉</Text>
          </View>
          <View style={styles.avatarShadow} />
        </TouchableOpacity>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — TITLE & REWARD BADGES (STARS & STREAK)
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <Animated.View style={[styles.titleRow, { transform: [{ translateY: titleFloat }] }]}>
          <Text style={styles.titleIcon}>🌳</Text>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoShadow}>Add-Venture</Text>
            <Text style={styles.logoText}>Add-Venture</Text>
          </View>
          <Text style={styles.titleIcon}>🍎</Text>
        </Animated.View>

        {/* Badges Row: Stars + Streak */}
        <View style={styles.badgesRow}>
          <Animated.View style={[styles.starsBadge, { transform: [{ scale: starsBadgeScale }] }]}>
            <Text style={styles.starsBadgeText}>⭐ {stars} Stars</Text>
          </Animated.View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>🔥 {streak} Streak</Text>
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          NODE 1 — APPLE ORCHARD (Count All - Always Unlocked)
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.nodeContainer, { left: N1.cx - 48, top: N1.cy - 48 }]}>
        <GlowRing color="#E53935" pulse={!countOnUnlocked} />
        <TouchableOpacity
          style={[styles.node, styles.appleNode]}
          onPress={() => startGame('COUNT_ALL', 'CountAll', 'Welcome to the Apple Orchard!')}
          activeOpacity={0.82}
        >
          <Text style={styles.nodeIcon}>🍎</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Apple Orchard</Text>
        <Text style={styles.nodeSublabel}>Count All</Text>
        {caAcc > 0 && (
          <View style={styles.nodeStatsRow}>
            <CompletionStars count={caStars} />
            <Text style={styles.nodeAccuracy}>{caAcc}%</Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          NODE 2 — ORANGE GROVE (Count On)
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.nodeContainer, { left: N2.cx - 48, top: N2.cy - 48 }]}>
        {countOnUnlocked && <GlowRing color="#FB8C00" pulse={!numberBondsUnlocked} />}
        <View style={styles.sparkleAnchor} pointerEvents="none">
          <SparkleParticles trigger={coTrigger} />
        </View>
        <TouchableOpacity
          style={[
            styles.node,
            countOnUnlocked ? styles.orangeNode : styles.nodeLocked,
          ]}
          onPress={countOnUnlocked ? () => startGame('COUNT_ON', 'CountOn', 'Welcome to the Orange Grove!') : undefined}
          disabled={!countOnUnlocked}
          activeOpacity={0.82}
        >
          <Text style={styles.nodeIcon}>{countOnUnlocked ? '🍊' : '🔒'}</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Orange Grove</Text>
        <Text style={styles.nodeSublabel}>Count On</Text>
        {countOnUnlocked && coAcc > 0 && (
          <View style={styles.nodeStatsRow}>
            <CompletionStars count={coStars} />
            <Text style={styles.nodeAccuracy}>{coAcc}%</Text>
          </View>
        )}
        {!countOnUnlocked && (
          <View style={styles.lockHint}>
            <Text style={styles.lockHintText}>Reach 60% on Apple Orchard</Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          NODE 3 — HARMONY TREE (Number Bonds)
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.nodeContainer, { left: N3.cx - 48, top: N3.cy - 48 }]}>
        {numberBondsUnlocked && <GlowRing color="#2E7D32" pulse />}
        <View style={styles.sparkleAnchor} pointerEvents="none">
          <SparkleParticles trigger={nbTrigger} />
        </View>
        <TouchableOpacity
          style={[
            styles.node,
            numberBondsUnlocked ? styles.treeNode : styles.nodeLocked,
          ]}
          onPress={numberBondsUnlocked ? () => startGame('NUMBER_BONDS', 'NumberBonds', 'Welcome to the Harmony Tree!') : undefined}
          disabled={!numberBondsUnlocked}
          activeOpacity={0.82}
        >
          <Text style={styles.nodeIcon}>{numberBondsUnlocked ? '🌳' : '🔒'}</Text>
        </TouchableOpacity>
        <Text style={styles.nodeLabel}>Harmony Tree</Text>
        <Text style={styles.nodeSublabel}>Number Bonds</Text>
        {numberBondsUnlocked && nbAcc > 0 && (
          <View style={styles.nodeStatsRow}>
            <CompletionStars count={nbStars} />
            <Text style={styles.nodeAccuracy}>{nbAcc}%</Text>
          </View>
        )}
        {!numberBondsUnlocked && (
          <View style={styles.lockHint}>
            <Text style={styles.lockHintText}>Reach 60% on Orange Grove</Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          BIG "CONTINUE ADVENTURE" PLAY BUTTON (Grade-1 Friendly)
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.playActionWrap}>
        <Animated.View style={{ transform: [{ scale: playBtnPulse }], width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.bigPlayButton}
            onPress={() => startGame(nextTarget.strategy, nextTarget.route, nextTarget.announcement)}
            activeOpacity={0.85}
          >
            <Text style={styles.bigPlayButtonText}>{nextTarget.title}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM NAV BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.8}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, { color: '#2E7D32' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Progress')} activeOpacity={0.8}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#A5D6A7', overflow: 'hidden' },

  // Background
  cloud: { position: 'absolute' },
  orchardSparkle: { position: 'absolute' },
  groundRow: { position: 'absolute', bottom: 72, left: 0, right: 0 },
  hillsSvg: { position: 'absolute', bottom: 0 },

  // Oliver Mascot Avatar
  avatarContainer: { position: 'absolute', left: 0, top: 0, zIndex: 35 },
  oliverTouchWrap: { alignItems: 'center' },
  oliverCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF8E1',
    borderWidth: 3,
    borderColor: '#FFB300',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  oliverEmoji: { fontSize: 32 },
  avatarShadow: {
    width: 36,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    marginTop: 2,
  },
  oliverSpeechBubble: {
    position: 'absolute',
    bottom: 58,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#8D6E63',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 120,
    alignItems: 'center',
  },
  oliverSpeechText: {
    color: '#4E342E',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  oliverSpeechTail: {
    position: 'absolute',
    bottom: -6,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#8D6E63',
    transform: [{ rotate: '45deg' }],
  },

  // Header
  header: { alignItems: 'center', marginTop: 46, zIndex: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleIcon: { fontSize: 30 },
  logoWrapper: { alignItems: 'center' },
  logoShadow: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    color: '#2E7D32',
    top: 2,
    left: 2,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(46, 125, 50, 0.75)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },

  // Badges (Stars & Streak)
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  starsBadge: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#FFB300',
    elevation: 5,
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  starsBadgeText: { fontSize: 15, fontWeight: '900', color: '#E65100' },
  streakBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#FF7043',
    elevation: 5,
    shadowColor: '#E64A19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  streakBadgeText: { fontSize: 15, fontWeight: '900', color: '#D84315' },

  // Nodes
  nodeContainer: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    zIndex: 20,
  },
  node: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
  },
  appleNode: { backgroundColor: '#E53935' },
  orangeNode: { backgroundColor: '#FB8C00' },
  treeNode: { backgroundColor: '#2E7D32' },
  nodeLocked: {
    backgroundColor: '#78909C',
    borderColor: 'rgba(255,255,255,0.4)',
    opacity: 0.8,
  },
  nodeIcon: { fontSize: 44 },
  nodeLabel: {
    marginTop: 98,
    position: 'absolute',
    fontSize: 14,
    fontWeight: '900',
    color: '#1B5E20',
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
    width: 130,
    left: -17,
  },
  nodeSublabel: {
    marginTop: 114,
    position: 'absolute',
    fontSize: 11,
    fontWeight: '800',
    color: '#33691E',
    textAlign: 'center',
    width: 120,
    left: -12,
  },
  nodeStatsRow: {
    position: 'absolute',
    top: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 120,
    left: -12,
  },
  nodeAccuracy: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
    backgroundColor: 'rgba(46, 125, 50, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  completionStarsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  completionStar: { fontSize: 13 },

  // Glow ring
  glowRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    left: -8,
    top: -8,
    zIndex: -1,
  },

  // Sparkle particles
  sparkleAnchor: {
    position: 'absolute',
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  sparkleParticle: { position: 'absolute', fontSize: 20 },

  // Lock hint
  lockHint: {
    position: 'absolute',
    top: 130,
    backgroundColor: 'rgba(55, 71, 79, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    width: 140,
    left: -22,
    alignItems: 'center',
  },
  lockHintText: {
    color: '#FFE082',
    fontSize: 9.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Big Play Next Button
  playActionWrap: {
    position: 'absolute',
    bottom: 84,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 30,
  },
  bigPlayButton: {
    width: '90%',
    maxWidth: 320,
    height: 52,
    backgroundColor: '#43A047',
    borderRadius: 26,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bigPlayButtonText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 6,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  navIcon: { fontSize: 22, marginBottom: 2 },
  navText: { fontSize: 11.5, fontWeight: 'bold', color: '#757575' },
});
