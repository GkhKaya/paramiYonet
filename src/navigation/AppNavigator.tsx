import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { COLORS } from '../constants';

const AppNavigator: React.FC = observer(() => {
  const { user, loading } = useAuth();

  // Loading durumunu göster
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
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
  },
});

export default AppNavigator; 