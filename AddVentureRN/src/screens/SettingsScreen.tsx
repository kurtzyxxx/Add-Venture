import React, { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../App';
import { AudioSettings, AudioManager, VOICE_PERSONAS, VoicePersona } from '../core/AudioManager';
import { GameManager } from '../core/GameManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const gm = GameManager.getInstance();
  const [settings, setSettings] = useState<AudioSettings>(gm.saveSystem.getSettings());
  const [tutorialsEnabled, setTutorialsEnabled] = useState<boolean>(!gm.saveSystem.areAllTutorialsSeen());
  const [isResetting, setIsResetting] = useState(false);

  const updateSetting = useCallback(
    async <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      await gm.saveSystem.updateSettings(next);
    },
    [gm, settings]
  );

  const handleTutorialsToggle = useCallback(
    async (enabled: boolean) => {
      setTutorialsEnabled(enabled);
      if (enabled) {
        await gm.saveSystem.resetAllTutorials();
      } else {
        await gm.saveSystem.setAllTutorialsSeen(true);
      }
    },
    [gm]
  );

  const confirmReset = () => {
    Alert.alert(
      'Reset Progress?',
      'This will remove all stars, unlocked progress, session history, and saved answers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            await gm.resetProgress();
            setIsResetting(false);
            navigation.replace('Home');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D1B6E', '#1A8F7A', '#FFD166']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Audio Toggles Panel */}
        <View style={styles.panel}>
          <SettingToggle
            icon="🎵"
            title="Music"
            description="Background music preference"
            enabled={settings.musicEnabled}
            onChange={value => updateSetting('musicEnabled', value)}
          />

          <View style={styles.divider} />

          <SettingToggle
            icon="🔊"
            title="Sounds"
            description="Voice prompts and feedback sounds"
            enabled={settings.soundsEnabled}
            onChange={value => updateSetting('soundsEnabled', value)}
          />

          <View style={styles.divider} />

          <SettingToggle
            icon="🎓"
            title="Game Tutorials"
            description="Show step-by-step tutorial when opening a mode"
            enabled={tutorialsEnabled}
            onChange={value => handleTutorialsToggle(value)}
          />
        </View>

        {/* Narrator Voice Persona Selection */}
        <View style={styles.voicePanel}>
          <View style={styles.voiceHeaderRow}>
            <View style={styles.voiceIconWrap}>
              <Text style={styles.voiceHeaderIcon}>🗣️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceSectionTitle}>Narrator Voice</Text>
              <Text style={styles.voiceSectionSubtitle}>Child-friendly companion for Grade 1 math</Text>
            </View>
          </View>

          <View style={styles.personaList}>
            {(Object.keys(VOICE_PERSONAS) as VoicePersona[]).map(key => {
              const persona = VOICE_PERSONAS[key];
              const isSelected = (settings.voicePersona ?? 'oliver') === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.personaCard, isSelected && styles.personaCardSelected]}
                  onPress={() => {
                    AudioManager.playSfx('click');
                    updateSetting('voicePersona', key);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.personaCardContent}>
                    <Text style={styles.personaIcon}>{persona.icon}</Text>
                    <View style={styles.personaTextWrap}>
                      <View style={styles.personaTitleRow}>
                        <Text style={styles.personaName}>{persona.name}</Text>
                        {isSelected && (
                          <View style={styles.selectedPill}>
                            <Text style={styles.selectedPillText}>✓ Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.personaSubtitle}>{persona.subtitle}</Text>
                      <Text style={styles.personaDescription}>{persona.description}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        AudioManager.previewPersona(key);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.previewBtnIcon}>🔊</Text>
                      <Text style={styles.previewBtnText}>Hear</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Progress Reset Panel */}
        <View style={styles.resetPanel}>
          <Text style={styles.resetTitle}>Progress</Text>
          <Text style={styles.resetCopy}>
            Reset the learner back to the start, including stars earned and level progress.
          </Text>
          <TouchableOpacity
            style={[styles.resetButton, isResetting && styles.disabledButton]}
            onPress={confirmReset}
            disabled={isResetting}
            activeOpacity={0.85}
          >
            <Text style={styles.resetButtonText}>{isResetting ? 'Resetting...' : 'Reset Progress'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Progress')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={[styles.navText, styles.activeNavText]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIconBox}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <View style={styles.settingTextBox}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[styles.toggleButton, enabled && styles.toggleOn]}
          onPress={() => onChange(true)}
          activeOpacity={0.85}
        >
          <Text style={[styles.toggleText, enabled && styles.toggleTextActive]}>On</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !enabled && styles.toggleOff]}
          onPress={() => onChange(false)}
          activeOpacity={0.85}
        >
          <Text style={[styles.toggleText, !enabled && styles.toggleTextActive]}>Off</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 26 },
  scrollContent: { paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  backButtonPlaceholder: { width: 48, height: 48 },
  backText: { color: '#4E342E', fontSize: 28, fontWeight: '900' },
  title: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    padding: 18,
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
  },
  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: { fontSize: 24 },
  settingTextBox: { flex: 1, paddingRight: 8 },
  settingTitle: { color: '#263238', fontSize: 18, fontWeight: '900' },
  settingDescription: { color: '#607D8B', fontSize: 12, fontWeight: '700', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 3,
    width: 104,
  },
  toggleButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: '#43A047' },
  toggleOff: { backgroundColor: '#E53935' },
  toggleText: { color: '#607D8B', fontSize: 13, fontWeight: '900' },
  toggleTextActive: { color: '#FFF' },

  // Narrator Voice Panel
  voicePanel: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    padding: 18,
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
  },
  voiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  voiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FFE082',
  },
  voiceHeaderIcon: { fontSize: 22 },
  voiceSectionTitle: { color: '#263238', fontSize: 19, fontWeight: '900' },
  voiceSectionSubtitle: { color: '#78909C', fontSize: 12, fontWeight: '700', marginTop: 2 },
  personaList: { gap: 10 },
  personaCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  personaCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#43A047',
    elevation: 3,
  },
  personaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personaIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  personaTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  personaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  personaName: {
    color: '#263238',
    fontSize: 16,
    fontWeight: '900',
  },
  selectedPill: {
    backgroundColor: '#43A047',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  selectedPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  personaSubtitle: {
    color: '#388E3C',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  personaDescription: {
    color: '#607D8B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#B0BEC5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 4,
    elevation: 2,
  },
  previewBtnIcon: { fontSize: 13 },
  previewBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#37474F',
  },

  // Reset Progress Panel
  resetPanel: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.34)',
    borderWidth: 2,
    borderRadius: 14,
    padding: 18,
  },
  resetTitle: { color: '#FFF', fontSize: 21, fontWeight: '900', marginBottom: 6 },
  resetCopy: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  resetButton: {
    marginTop: 18,
    backgroundColor: '#E53935',
    borderColor: '#FFF',
    borderWidth: 3,
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 5,
  },
  disabledButton: { opacity: 0.65 },
  resetButtonText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  navIcon: { fontSize: 24, marginBottom: 3 },
  navText: { fontSize: 12, fontWeight: 'bold', color: '#616161' },
  activeNavText: { color: '#7B4FD0' },
});
