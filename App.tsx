import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { AuthProvider } from './src/contexts/AuthContext';
import { ViewModelProvider } from './src/contexts/ViewModelContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebApp from './src/web/WebApp';

export default function App() {
  useEffect(() => {
    // Android sistem çubuklarını dark mode'a çevir
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#000000'); // Navigation bar rengi
    }
  }, []);

  // Web platformu için özel render
  if (Platform.OS === 'web') {
    return <WebApp />;
  }

  // Mobile platformlar için mevcut render
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ViewModelProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" backgroundColor="#000000" />
          </NavigationContainer>
          </ViewModelProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
