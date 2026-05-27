import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { GameManager } from '../core/GameManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [stars, setStars] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const profile = GameManager.getInstance().saveSystem.getProfile();
      setStars(profile.totalStars);
    });
    return unsubscribe;
  }, [navigation]);

  const startGame = (strategy: string, routeName: keyof RootStackParamList) => {
    GameManager.getInstance().startSession(strategy);
    navigation.navigate(routeName as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <View style={styles.starsContainer}>
          <Text style={styles.starsIcon}>⭐</Text>
          <Text style={styles.starsText}>{stars}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.button} onPress={() => startGame('COUNT_ALL', 'CountAll')}>
          <Text style={styles.buttonText}>Count All</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => startGame('COUNT_ON', 'CountOn')}>
          <Text style={styles.buttonText}>Count On</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => startGame('NUMBER_BONDS', 'NumberBonds')}>
          <Text style={styles.buttonText}>Number Bonds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('AdventureMap')}>
          <Text style={styles.secondaryButtonText}>Adventure Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Progress')}>
          <Text style={styles.secondaryButtonText}>Progress</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
  },
  starsIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  starsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB300',
  },
  menu: {
    flex: 1,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#1E88E5',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    flex: 0.48,
    alignItems: 'center',
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#1E88E5',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
