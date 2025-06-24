import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import { ViewModelProvider } from './src/contexts/ViewModelContext';
import { ErrorProvider } from './src/contexts/ErrorContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebApp from './src/web/WebApp';
import ErrorNotification from './src/components/common/ErrorNotification';

// Splash screen'i uygulama yüklenene kadar göster
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Android sistem çubuklarını dark mode'a çevir
        if (Platform.OS === 'android') {
          SystemUI.setBackgroundColorAsync('#000000'); // Navigation bar rengi
        }

        // Firebase, fonts, vb. yükleme işlemleri burada yapılabilir
        // 1 saniye bekletiyoruz (daha hızlı deneyim için)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn('App preparation error:', e);
      } finally {
        // App hazır olduğunda splash screen'i gizle
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Splash screen'i gizle
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Web platformu için özel render
  if (Platform.OS === 'web') {
    return <WebApp />;
  }

  // App henüz hazır değilse hiçbir şey render etme (splash screen görünür)
  if (!appIsReady) {
    return null;
  }

  // Mobile platformlar için mevcut render
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <ErrorProvider>
            <AuthProvider>
              <NavigationContainer>
                <ViewModelProvider>
                  <AppNavigator />
                </ViewModelProvider>
                <StatusBar style="light" backgroundColor="#000000" />
              </NavigationContainer>
            </AuthProvider>
            <ErrorNotification />
          </ErrorProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
