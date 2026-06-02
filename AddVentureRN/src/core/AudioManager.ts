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

  stopSpeech() {
    Speech.stop();
  },
};
