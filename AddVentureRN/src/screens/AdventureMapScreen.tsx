import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AdventureMap'>;

export default function AdventureMapScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adventure Map</Text>
      <Text style={styles.subtitle}>Map visualization coming soon!</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 16 },
  subtitle: { fontSize: 18, color: '#FFF', marginBottom: 40 },
  button: { padding: 16, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center', width: '100%' },
  buttonText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 18 }
});
