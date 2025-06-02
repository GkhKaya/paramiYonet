import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface NetworkErrorScreenProps {
  onRetry: () => void;
}

export const NetworkErrorScreen: React.FC<NetworkErrorScreenProps> = ({ onRetry }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="wifi-outline" 
            size={80} 
            color={COLORS.TEXT_SECONDARY} 
          />
        </View>
        
        <Text style={styles.title}>İnternet Bağlantısı Yok</Text>
        
        <Text style={styles.message}>
          Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.
        </Text>
        
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.WHITE} />
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
    opacity: 0.6,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
}); 