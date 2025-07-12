import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { useNetwork } from '../../contexts/NetworkContext';

interface NetworkStatusIndicatorProps {
  position?: 'top' | 'bottom';
  showWhenOnline?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  position = 'top',
  showWhenOnline = false,
}) => {
  const { networkStatus, isOnline, showOfflineMessage, dismissOfflineMessage } = useNetwork();
  const [slideAnim] = useState(new Animated.Value(-60));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const shouldShow = !isOnline || (showWhenOnline && isOnline);
    
    if (shouldShow && showOfflineMessage) {
      setIsVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -60 : 60,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOnline, showOfflineMessage, position, slideAnim, showWhenOnline]);

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        backgroundColor: COLORS.ERROR,
        icon: 'wifi-outline' as const,
        title: 'İnternet Bağlantısı Yok',
        message: 'Bazı özellikler kullanılamayabilir',
        textColor: COLORS.WHITE,
      };
    }

    if (networkStatus.type === 'cellular') {
      return {
        backgroundColor: COLORS.WARNING,
        icon: 'cellular-outline' as const,
        title: 'Mobil Veri',
        message: 'Mobil veri kullanıyorsunuz',
        textColor: COLORS.WHITE,
      };
    }

    return {
      backgroundColor: COLORS.SUCCESS,
      icon: 'wifi' as const,
      title: 'Bağlantı Aktif',
      message: 'İnternet bağlantınız stabil',
      textColor: COLORS.WHITE,
    };
  };

  const handleDismiss = () => {
    dismissOfflineMessage();
  };

  if (!isVisible) {
    return null;
  }

  const { backgroundColor, icon, title, message, textColor } = getStatusConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          transform: [{ translateY: slideAnim }],
          [position]: Platform.OS === 'ios' ? 44 : 0, // iOS için safe area
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icon} size={20} color={textColor} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.message, { color: textColor }]}>{message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color={textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  textContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.xs,
    opacity: 0.9,
  },
  dismissButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
}); 