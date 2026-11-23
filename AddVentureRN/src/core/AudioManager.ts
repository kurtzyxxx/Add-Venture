import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export type VoicePersona = 'oliver' | 'teacher';

export interface PersonaConfig {
  id: VoicePersona;
  name: string;
  icon: string;
  subtitle: string;
  description: string;
  pitch: number;
  rate: number;
  samplePhrase: string;
}

export const VOICE_PERSONAS: Record<VoicePersona, PersonaConfig> = {
  oliver: {
    id: 'oliver',
    name: 'Oliver the Owl',
    icon: '🦉',
    subtitle: 'Playful Mascot (Default)',
    description: 'Bright, high-spirited cartoon voice loved by kids',
    pitch: 1.30,
    rate: 0.80,
    samplePhrase: "Hoot hoot! I'm Oliver! Let's pick some fruits and count together!",
  },
  teacher: {
    id: 'teacher',
    name: 'Teacher Grace',
    icon: '👩‍🏫',
    subtitle: 'Gentle Elementary Teacher',
    description: 'Warm, patient & encouraging elementary guide',
    pitch: 1.15,
    rate: 0.78,
    samplePhrase: "Hello! You are doing amazing work in math today. Let's practice!",
  },
};

export interface AudioSettings {
  musicEnabled: boolean;
  soundsEnabled: boolean;
  tutorialsEnabled?: boolean;
  voicePersona?: VoicePersona;
}

export type SfxType = 'applause' | 'correct' | 'wrong' | 'pop' | 'click';

export const DEFAULT_SPEECH_RATE = 0.78; // Target rate for Grade 1 numeracy comprehension (FR-CO-01, NFR-AC-01)

const settings: AudioSettings = {
  musicEnabled: true,
  soundsEnabled: true,
  voicePersona: 'oliver',
};

const SOUND_ASSETS: Record<string, any> = {
  intro: require('../../assets/intro.wav'),
  bgm: require('../../assets/bgm.mp3'),
  applause: require('../../assets/applause.mp3'),
  correct: require('../../assets/correct.wav'),
  wrong: require('../../assets/wrong.wav'),
  pop: require('../../assets/pop.wav'),
  click: require('../../assets/click.wav'),
};

const NEURAL_VOICE_CLIPS: Record<string, any> = {
  welcome: require('../../assets/voice/welcome.mp3'),
  home_greeting_1: require('../../assets/voice/home_greeting_1.mp3'),
  home_greeting_2: require('../../assets/voice/home_greeting_2.mp3'),
  home_greeting_3: require('../../assets/voice/home_greeting_3.mp3'),
  unlock_orange_grove: require('../../assets/voice/unlock_orange_grove.mp3'),
  unlock_harmony_tree: require('../../assets/voice/unlock_harmony_tree.mp3'),
  five_streak: require('../../assets/voice/five_streak.mp3'),
  great_job_3: require('../../assets/voice/great_job_3.mp3'),
  great_job_2: require('../../assets/voice/great_job_2.mp3'),
  great_job_1: require('../../assets/voice/great_job_1.mp3'),
  mastery_completed: require('../../assets/voice/mastery_completed.mp3'),
  oops_try_again: require('../../assets/voice/oops_try_again.mp3'),
  times_up: require('../../assets/voice/times_up.mp3'),
  practice_makes_perfect: require('../../assets/voice/practice_makes_perfect.mp3'),
  want_hint: require('../../assets/voice/want_hint.mp3'),
  drag_all_fruits: require('../../assets/voice/drag_all_fruits.mp3'),
  fruits_reset: require('../../assets/voice/fruits_reset.mp3'),
  num_1: require('../../assets/voice/num_1.mp3'),
  num_2: require('../../assets/voice/num_2.mp3'),
  num_3: require('../../assets/voice/num_3.mp3'),
  num_4: require('../../assets/voice/num_4.mp3'),
  num_5: require('../../assets/voice/num_5.mp3'),
  num_6: require('../../assets/voice/num_6.mp3'),
  num_7: require('../../assets/voice/num_7.mp3'),
  num_8: require('../../assets/voice/num_8.mp3'),
  num_9: require('../../assets/voice/num_9.mp3'),
  num_10: require('../../assets/voice/num_10.mp3'),
};

export type NeuralVoiceClipKey = keyof typeof NEURAL_VOICE_CLIPS;

const BGM_NORMAL_VOL = 0.22;
const BGM_DUCKED_VOL = 0.05;

let bgmSound: Audio.Sound | null = null;
let currentVoiceSound: Audio.Sound | null = null;
let isBgmPlaying = false;
let isDucked = false;
let audioModeConfigured = false;
let bestVoiceIdentifier: string | undefined = undefined;
let voicesLoaded = false;

async function detectBestVoice(): Promise<string | undefined> {
  if (voicesLoaded) return bestVoiceIdentifier;
  try {
    const available = await Speech.getAvailableVoicesAsync();
    if (available && available.length > 0) {
      const englishVoices = available.filter(
        v => v.language && v.language.toLowerCase().startsWith('en')
      );

      // Prioritize friendly, high-quality female or child-friendly system voices
      const preferred = englishVoices.find(v => {
        const id = (v.identifier || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return (
          id.includes('female') ||
          name.includes('female') ||
          id.includes('sfg') || // Google TTS high-quality female
          id.includes('tpd') ||
          name.includes('samantha') ||
          name.includes('karen') ||
          name.includes('victoria') ||
          name.includes('serena')
        );
      });

      bestVoiceIdentifier = preferred?.identifier || (englishVoices.length > 0 ? englishVoices[0].identifier : undefined);
    }
    voicesLoaded = true;
  } catch (_) {
    voicesLoaded = true;
  }
  return bestVoiceIdentifier;
}

detectBestVoice().catch(() => {});

async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });
    audioModeConfigured = true;
  } catch (_) {
    // Non-fatal if platform constraints prevent setting audio mode
  }
}

let isBgmLoading = false;

async function internalStartBgm(): Promise<void> {
  if (!settings.musicEnabled) return;
  if (bgmSound || isBgmLoading) {
    if (bgmSound) {
      try {
        const status = await bgmSound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await bgmSound.playAsync();
          isBgmPlaying = true;
        }
      } catch (_) {}
    }
    return;
  }

  isBgmLoading = true;
  await ensureAudioMode();
  try {
    const { sound } = await Audio.Sound.createAsync(
      SOUND_ASSETS.bgm,
      {
        isLooping: true,
        volume: isDucked ? BGM_DUCKED_VOL : BGM_NORMAL_VOL,
        shouldPlay: settings.musicEnabled,
      }
    );

    // If music was turned off while sound was loading, discard immediately
    if (!settings.musicEnabled) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
      isBgmLoading = false;
      return;
    }

    // Guard against race conditions
    if (bgmSound) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
      isBgmLoading = false;
      return;
    }

    bgmSound = sound;
    isBgmPlaying = true;
  } catch (err) {
    console.warn('[AudioManager] startBgm failed:', err);
  } finally {
    isBgmLoading = false;
  }
}

async function internalPauseBgm(): Promise<void> {
  isBgmPlaying = false;
  if (bgmSound) {
    try {
      await bgmSound.pauseAsync();
    } catch (_) {}
  }
}

async function internalResumeBgm(): Promise<void> {
  if (!settings.musicEnabled) return;
  if (!bgmSound) {
    await internalStartBgm();
  } else {
    try {
      const status = await bgmSound.getStatusAsync();
      if (status.isLoaded) {
        if (!status.isPlaying) {
          await bgmSound.playAsync();
        }
        isBgmPlaying = true;
      } else {
        await internalStopBgm();
        await internalStartBgm();
      }
    } catch (_) {
      await internalStopBgm();
      await internalStartBgm();
    }
  }
}

async function internalStopBgm(): Promise<void> {
  const sound = bgmSound;
  bgmSound = null;
  isBgmPlaying = false;
  if (sound) {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (_) {}
  }
}

async function internalDuckBgm(): Promise<void> {
  isDucked = true;
  if (bgmSound && isBgmPlaying) {
    try {
      const status = await bgmSound.getStatusAsync();
      if (status.isLoaded) {
        await bgmSound.setVolumeAsync(BGM_DUCKED_VOL);
      }
    } catch (_) {}
  }
}

let introSound: Audio.Sound | null = null;

async function internalPlayIntroMusic(): Promise<void> {
  if (!settings.musicEnabled) return;
  await ensureAudioMode();
  try {
    if (introSound) {
      await introSound.stopAsync();
      await introSound.unloadAsync();
      introSound = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      SOUND_ASSETS.intro,
      {
        shouldPlay: true,
        volume: 0.65,
        isLooping: false,
      }
    );
    introSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (introSound === sound) introSound = null;
      }
    });
  } catch (err) {
    console.warn('[AudioManager] internalPlayIntroMusic failed:', err);
  }
}

async function internalStopIntroMusic(): Promise<void> {
  try {
    if (introSound) {
      await introSound.stopAsync();
      await introSound.unloadAsync();
      introSound = null;
    }
  } catch (_) {}
}

async function internalUnduckBgm(): Promise<void> {
  isDucked = false;
  if (bgmSound && isBgmPlaying) {
    try {
      const status = await bgmSound.getStatusAsync();
      if (status.isLoaded) {
        await bgmSound.setVolumeAsync(BGM_NORMAL_VOL);
      }
    } catch (_) {}
  }
}

export const AudioManager = {
  DEFAULT_SPEECH_RATE,

  hydrate(nextSettings: AudioSettings) {
    const prevMusic = settings.musicEnabled;
    settings.musicEnabled = nextSettings.musicEnabled;
    settings.soundsEnabled = true; // Sounds must always be enabled per user specification
    settings.tutorialsEnabled = nextSettings.tutorialsEnabled ?? true;
    settings.voicePersona = nextSettings.voicePersona === 'teacher' ? 'teacher' : 'oliver';

    if (!settings.musicEnabled) {
      internalPauseBgm();
      internalStopIntroMusic();
    } else if (!prevMusic && nextSettings.musicEnabled) {
      internalResumeBgm();
    }
  },

  getSettings(): AudioSettings {
    return { ...settings };
  },

  getPersona(): PersonaConfig {
    const key = settings.voicePersona ?? 'oliver';
    return VOICE_PERSONAS[key] ?? VOICE_PERSONAS.oliver;
  },

  setPersona(persona: VoicePersona) {
    settings.voicePersona = persona;
  },

  previewPersona(persona: VoicePersona) {
    const cfg = VOICE_PERSONAS[persona];
    if (!cfg || !settings.soundsEnabled) return;
    this.stopSpeech();

    // If previewing Oliver, use his studio neural clip!
    if (persona === 'oliver') {
      this.playVoiceClip('welcome');
      return;
    }

    this.speak(cfg.samplePhrase, {
      pitch: cfg.pitch,
      rate: cfg.rate,
    });
  },

  // ─── Pre-rendered Studio Neural Voice Audio Clips (Option 3) ──────────────
  hasVoiceClip(key: string): keyof typeof NEURAL_VOICE_CLIPS | null {
    return (key in NEURAL_VOICE_CLIPS) ? (key as NeuralVoiceClipKey) : null;
  },

  async playVoiceClip(key: NeuralVoiceClipKey, onDone?: () => void): Promise<void> {
    if (!settings.soundsEnabled) {
      onDone?.();
      return;
    }
    await ensureAudioMode();
    try {
      const asset = NEURAL_VOICE_CLIPS[key];
      if (!asset) {
        onDone?.();
        return;
      }

      if (currentVoiceSound) {
        try {
          await currentVoiceSound.stopAsync();
          await currentVoiceSound.unloadAsync();
        } catch (_) {}
        currentVoiceSound = null;
      }

      Speech.stop();
      internalDuckBgm();

      const { sound } = await Audio.Sound.createAsync(
        asset,
        { shouldPlay: true, volume: 1.0 }
      );
      currentVoiceSound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          internalUnduckBgm();
          sound.unloadAsync().catch(() => {});
          if (currentVoiceSound === sound) {
            currentVoiceSound = null;
          }
          onDone?.();
        }
      });
    } catch (err) {
      console.warn(`[AudioManager] playVoiceClip (${key}) error:`, err);
      internalUnduckBgm();
      onDone?.();
    }
  },

  // ─── Intro Music (assets/intro.wav) ───────────────────────────────────────
  playIntroMusic() {
    internalPlayIntroMusic();
  },

  stopIntroMusic() {
    internalStopIntroMusic();
  },

  // ─── Background Music (BGM) ──────────────────────────────────────────────
  startBgm() {
    internalStartBgm();
  },

  pauseBgm() {
    internalPauseBgm();
  },

  resumeBgm() {
    internalResumeBgm();
  },

  stopBgm() {
    internalStopBgm();
  },

  duckBgm() {
    internalDuckBgm();
  },

  unduckBgm() {
    internalUnduckBgm();
  },

  // ─── Sound Effects (SFX) ─────────────────────────────────────────────────
  async playSfx(type: SfxType): Promise<void> {
    if (!settings.soundsEnabled) return;
    await ensureAudioMode();
    try {
      const asset = SOUND_ASSETS[type];
      if (!asset) return;
      const vol =
        type === 'applause'
          ? 0.7
          : type === 'pop' || type === 'click'
          ? 0.45
          : 0.6;
      const { sound } = await Audio.Sound.createAsync(
        asset,
        { shouldPlay: true, volume: vol }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.warn(`[AudioManager] playSfx (${type}) error:`, err);
    }
  },

  // ─── Speech Synthesis with Auto-Ducking & Persona Settings ────────────────
  speak(text: string, options?: Speech.SpeechOptions) {
    if (!settings.soundsEnabled) return;
    internalDuckBgm();

    const persona = this.getPersona();
    const finalOptions: Speech.SpeechOptions = {
      rate: persona.rate,
      pitch: persona.pitch,
      language: 'en-US',
      ...(bestVoiceIdentifier ? { voice: bestVoiceIdentifier } : {}),
      ...options,
      onDone: () => {
        internalUnduckBgm();
        options?.onDone?.();
      },
      onStopped: () => {
        internalUnduckBgm();
        options?.onStopped?.();
      },
      onError: (err) => {
        internalUnduckBgm();
        options?.onError?.(err);
      },
    };
    Speech.speak(text, finalOptions);
  },

  speakAsync(text: string, options?: Speech.SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!settings.soundsEnabled || !text || text.trim() === '') {
        resolve();
        return;
      }

      internalDuckBgm();

      const persona = this.getPersona();
      const rate = options?.rate ?? persona.rate;
      const pitch = options?.pitch ?? persona.pitch;
      const words = text.trim().split(/\s+/).length;
      const estimatedMs = Math.ceil(((words / (2.0 * rate)) * 1000) + 1800);
      const maxWaitMs = Math.max(3000, estimatedMs);

      let finished = false;
      const finish = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutId);
          internalUnduckBgm();
          resolve();
        }
      };

      const timeoutId = setTimeout(finish, maxWaitMs);

      const finalOptions: Speech.SpeechOptions = {
        rate,
        pitch,
        language: 'en-US',
        ...(bestVoiceIdentifier ? { voice: bestVoiceIdentifier } : {}),
        ...options,
      };

      Speech.speak(text, {
        ...finalOptions,
        onDone: () => {
          options?.onDone?.();
          finish();
        },
        onStopped: () => {
          options?.onStopped?.();
          finish();
        },
        onError: (err) => {
          options?.onError?.(err);
          finish();
        },
      });
    });
  },

  stopSpeech() {
    if (currentVoiceSound) {
      try {
        currentVoiceSound.stopAsync();
        currentVoiceSound.unloadAsync();
      } catch (_) {}
      currentVoiceSound = null;
    }
    Speech.stop();
    internalUnduckBgm();
  },
};
