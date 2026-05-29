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
import CountAllScreen from './src/screens/game/CountAllScreen';
import CountOnScreen from './src/screens/game/CountOnScreen';
import NumberBondsScreen from './src/screens/game/NumberBondsScreen';
import SessionSummaryScreen from './src/screens/SessionSummaryScreen';
import PerformanceDashboardScreen from './src/screens/PerformanceDashboardScreen';

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
          
          <Stack.Screen name="CountAll" component={CountAllScreen} />
          <Stack.Screen name="CountOn" component={CountOnScreen} />
          <Stack.Screen name="NumberBonds" component={NumberBondsScreen} />
          <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
          <Stack.Screen name="PerformanceDashboard" component={PerformanceDashboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
