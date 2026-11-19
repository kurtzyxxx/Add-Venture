import * as Speech from 'expo-speech';

export interface AudioSettings {
  musicEnabled: boolean;
  soundsEnabled: boolean;
}

export const DEFAULT_SPEECH_RATE = 0.78; // Target rate for Grade 1 numeracy comprehension (FR-CO-01, NFR-AC-01)

const settings: AudioSettings = {
  musicEnabled: true,
  soundsEnabled: true,
};

export const AudioManager = {
  DEFAULT_SPEECH_RATE,

  hydrate(nextSettings: AudioSettings) {
    settings.musicEnabled = nextSettings.musicEnabled;
    settings.soundsEnabled = nextSettings.soundsEnabled;
    if (!settings.soundsEnabled) {
      Speech.stop();
    }
  },

  getSettings(): AudioSettings {
    return { ...settings };
  },

  speak(text: string, options?: Speech.SpeechOptions) {
    if (!settings.soundsEnabled) return;
    const finalOptions: Speech.SpeechOptions = {
      rate: DEFAULT_SPEECH_RATE,
      ...options,
    };
    Speech.speak(text, finalOptions);
  },

  speakAsync(text: string, options?: Speech.SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!settings.soundsEnabled || !text || text.trim() === '') {
        resolve();
        return;
      }

      const words = text.trim().split(/\s+/).length;
      const rate = options?.rate ?? DEFAULT_SPEECH_RATE;
      const estimatedMs = Math.ceil(((words / (2.0 * rate)) * 1000) + 1800);
      const maxWaitMs = Math.max(3000, estimatedMs);

      let finished = false;
      const finish = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutId);
          resolve();
        }
      };

      const timeoutId = setTimeout(finish, maxWaitMs);

      const finalOptions: Speech.SpeechOptions = {
        rate: DEFAULT_SPEECH_RATE,
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
    Speech.stop();
  },
};
