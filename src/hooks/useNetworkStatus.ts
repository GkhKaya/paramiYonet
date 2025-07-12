import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Web'de basit connectivity check
    if (Platform.OS === 'web') {
      const checkConnection = () => {
        setNetworkStatus({
          isConnected: navigator.onLine,
          isInternetReachable: navigator.onLine,
          type: navigator.onLine ? 'wifi' : null
        });
      };

      // İlk kontrol
      checkConnection();

      // Online/offline event'lerini dinle
      window.addEventListener('online', checkConnection);
      window.addEventListener('offline', checkConnection);

      unsubscribe = () => {
        window.removeEventListener('online', checkConnection);
        window.removeEventListener('offline', checkConnection);
      };
    } else {
      // Mobile platforms için NetInfo kullan
      const initializeNetInfo = async () => {
        try {
          const NetInfo = await import('@react-native-community/netinfo');
          
          // İlk durumu al
          const initialState = await NetInfo.default.fetch();
          setNetworkStatus({
            isConnected: initialState.isConnected ?? false,
            isInternetReachable: initialState.isInternetReachable ?? false,
            type: initialState.type || null
          });

          // Network durumu değişikliklerini dinle
          const netInfoUnsubscribe = NetInfo.default.addEventListener(state => {
            setNetworkStatus({
              isConnected: state.isConnected ?? false,
              isInternetReachable: state.isInternetReachable ?? false,
              type: state.type || null
            });
          });

          unsubscribe = netInfoUnsubscribe;
        } catch (error) {
          console.warn('NetInfo initialization failed:', error);
          // Fallback: Default to connected state
          setNetworkStatus({
            isConnected: true,
            isInternetReachable: true,
            type: 'wifi'
          });
        }
      };

      initializeNetInfo();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return networkStatus;
}; 