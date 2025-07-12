import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkErrorScreenProps {
  onRetry: () => void;
}

export const NetworkErrorScreen: React.FC<NetworkErrorScreenProps> = ({ onRetry }) => {
  const networkStatus = useNetworkStatus();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [retryAttempts, setRetryAttempts] = useState(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [fadeAnim, pulseAnim]);

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1);
    onRetry();
  };

  const getNetworkMessage = () => {
    if (!networkStatus.isConnected) {
      return {
        title: 'İnternet Bağlantısı Yok',
        message: 'Cihazınız internete bağlı değil. Lütfen Wi-Fi veya mobil veri bağlantınızı kontrol edin.',
        suggestions: [
          'Wi-Fi bağlantınızı kontrol edin',
          'Mobil veri bağlantınızı aktifleştirin',
          'Uçak modunun kapalı olduğundan emin olun',
          'Router\'ınızı yeniden başlatmayı deneyin'
        ]
      };
    } else if (!networkStatus.isInternetReachable) {
      return {
        title: 'İnternet Erişimi Yok',
        message: 'Cihazınız ağa bağlı ancak internete erişemiyor. Bağlantınızı kontrol edin.',
        suggestions: [
          'Ağ bağlantınızı kontrol edin',
          'DNS ayarlarınızı kontrol edin',
          'İnternet servis sağlayıcınızla iletişime geçin',
          'Proxy ayarlarınızı kontrol edin'
        ]
      };
    }
    
    return {
      title: 'Bağlantı Sorunu',
      message: 'Sunucularımıza ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
      suggestions: [
        'Birkaç saniye bekleyin ve tekrar deneyin',
        'Uygulamayı yeniden başlatın',
        'Cihazınızı yeniden başlatın'
      ]
    };
  };

  const { title, message, suggestions } = getNetworkMessage();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons 
            name="wifi-outline" 
            size={80} 
            color={COLORS.TEXT_SECONDARY} 
          />
        </Animated.View>
        
        <Text style={styles.title}>{title}</Text>
        
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Çözüm önerileri:</Text>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>

        {retryAttempts > 0 && (
          <Text style={styles.retryInfo}>
            Deneme sayısı: {retryAttempts}
          </Text>
        )}
        
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.WHITE} />
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Durum: {networkStatus.isConnected ? 'Bağlı' : 'Bağlı Değil'}
            {networkStatus.type && ` (${networkStatus.type})`}
          </Text>
          {Platform.OS !== 'web' && (
            <Text style={styles.statusText}>
              İnternet: {networkStatus.isInternetReachable ? 'Erişilebilir' : 'Erişilemiyor'}
            </Text>
          )}
        </View>
      </Animated.View>
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
    marginBottom: SPACING.lg,
  },
  suggestionsContainer: {
    width: '100%',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  suggestionsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  suggestionBullet: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.PRIMARY,
    marginRight: SPACING.xs,
    lineHeight: 20,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
    lineHeight: 20,
  },
  retryInfo: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    opacity: 0.7,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
}); 