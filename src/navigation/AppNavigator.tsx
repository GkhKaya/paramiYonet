import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { NetworkErrorScreen } from '../components/common/NetworkErrorScreen';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';

const AppNavigator: React.FC = observer(() => {
  const { user, loading, dataLoading } = useAuth();
  const networkStatus = useNetworkStatus();
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Force reload app by triggering re-render
    window.location.reload();
  };

  // İnternet bağlantısı yoksa error screen göster
  if (!networkStatus.isConnected) {
    return <NetworkErrorScreen onRetry={handleRetry} />;
  }

  // Auth loading durumunu göster
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Giriş kontrol ediliyor...</Text>
      </View>
    );
  }

  // Data loading durumunu göster
  if (dataLoading && user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  // Kullanıcı durumuna göre navigator göster
  return user ? (
    <MainNavigator />
  ) : (
    <AuthNavigator onAuthSuccess={() => {/* Auth başarılı - useAuth otomatik güncelleniyor */}} />
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default AppNavigator; 