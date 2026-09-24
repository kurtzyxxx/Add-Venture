import * as Speech from 'expo-speech';

export interface AudioSettings {
  musicEnabled: boolean;
  soundsEnabled: boolean;
}

const settings: AudioSettings = {
  musicEnabled: true,
  soundsEnabled: true,
};

export const AudioManager = {
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
    Speech.speak(text, options);
  },

  speakAsync(text: string, options?: Speech.SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!settings.soundsEnabled || !text || text.trim() === '') {
        resolve();
        return;
      }

      const words = text.trim().split(/\s+/).length;
      const rate = options?.rate ?? 1.0;
      const estimatedMs = Math.ceil(((words / (2.0 * rate)) * 1000) + 1500);
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

      Speech.speak(text, {
        ...options,
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
