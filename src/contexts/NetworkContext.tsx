import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useNetworkStatus, NetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkContextType {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  showOfflineMessage: boolean;
  retryConnection: () => void;
  dismissOfflineMessage: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const networkStatus = useNetworkStatus();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [previousOnlineStatus, setPreviousOnlineStatus] = useState(true);

  const isOnline = networkStatus.isConnected && networkStatus.isInternetReachable;

  useEffect(() => {
    // Bağlantı durumu değiştiğinde offline mesajını göster/gizle
    if (previousOnlineStatus && !isOnline) {
      // Online'dan offline'a geçiş
      setShowOfflineMessage(true);
    } else if (!previousOnlineStatus && isOnline) {
      // Offline'dan online'a geçiş
      setShowOfflineMessage(false);
    }

    setPreviousOnlineStatus(isOnline);
  }, [isOnline, previousOnlineStatus]);

  const retryConnection = () => {
    // Bu fonksiyon network durumunu yeniden kontrol etmek için kullanılabilir
    // useNetworkStatus hook'u otomatik olarak durumu günceller
    console.log('Network bağlantısı yeniden kontrol ediliyor...');
  };

  const dismissOfflineMessage = () => {
    setShowOfflineMessage(false);
  };

  const value: NetworkContextType = {
    networkStatus,
    isOnline,
    showOfflineMessage,
    retryConnection,
    dismissOfflineMessage,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}; 