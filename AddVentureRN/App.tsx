import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameManager } from './src/core/GameManager';
import { DatabaseHelper } from './src/database/DatabaseHelper';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import AdventureMapScreen from './src/screens/AdventureMapScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import CountAllActivityScreen from './src/screens/game/CountAllActivityScreen';
import CountOnActivityScreen from './src/screens/game/CountOnActivityScreen';
import NumberBondsActivityScreen from './src/screens/game/NumberBondsActivityScreen';
import SessionSummaryScreen from './src/screens/SessionSummaryScreen';
import ProgressSummaryView from './src/screens/ProgressSummaryView';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  AdventureMap: undefined;
  Progress: undefined;
  CountAll: undefined;
  CountOn: undefined;
  NumberBonds: undefined;
  SessionSummary: { stars: number; activities: number; correct: number; recurringErrors?: string[] };
  PerformanceDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await DatabaseHelper.getInstance().initDB();
        await GameManager.getInstance().initialize();
        setIsReady(true);
      } catch (e) {
        console.warn("Failed to initialize game manager", e);
        setIsReady(true);
      }
    }
    init();
  }, []);

  if (!isReady) {
    return null; // Or a simple loading view
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AdventureMap" component={AdventureMapScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          
          <Stack.Screen name="CountAll" component={CountAllActivityScreen} />
          <Stack.Screen name="CountOn" component={CountOnActivityScreen} />
          <Stack.Screen name="NumberBonds" component={NumberBondsActivityScreen} />
          <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
          <Stack.Screen name="PerformanceDashboard" component={ProgressSummaryView} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
