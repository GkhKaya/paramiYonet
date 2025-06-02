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
    // Web'de basit connectivity check
    if (Platform.OS === 'web') {
      const checkConnection = () => {
        setNetworkStatus({
          isConnected: navigator.onLine,
          isInternetReachable: navigator.onLine,
          type: 'wifi'
        });
      };

      // İlk kontrol
      checkConnection();

      // Online/offline event'lerini dinle
      window.addEventListener('online', checkConnection);
      window.addEventListener('offline', checkConnection);

      return () => {
        window.removeEventListener('online', checkConnection);
        window.removeEventListener('offline', checkConnection);
      };
    }
  }, []);

  return networkStatus;
}; 