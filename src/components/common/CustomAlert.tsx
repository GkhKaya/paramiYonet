import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/ui';

const { width } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  onClose: () => void;
  icon?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type,
  title,
  message,
  primaryButtonText = 'Tamam',
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  onClose,
  icon
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          iconColor: COLORS.SUCCESS,
          iconBg: COLORS.SUCCESS + '20',
          icon: icon || 'checkmark-circle',
          primaryButtonBg: COLORS.SUCCESS,
        };
      case 'error':
        return {
          iconColor: COLORS.ERROR,
          iconBg: COLORS.ERROR + '20',
          icon: icon || 'close-circle',
          primaryButtonBg: COLORS.ERROR,
        };
      case 'warning':
        return {
          iconColor: '#FF9500',
          iconBg: '#FF950020',
          icon: icon || 'warning',
          primaryButtonBg: '#FF9500',
        };
      case 'info':
        return {
          iconColor: COLORS.PRIMARY,
          iconBg: COLORS.PRIMARY + '20',
          icon: icon || 'information-circle',
          primaryButtonBg: COLORS.PRIMARY,
        };
      case 'confirm':
        return {
          iconColor: COLORS.WARNING,
          iconBg: COLORS.WARNING + '20',
          icon: icon || 'help-circle',
          primaryButtonBg: COLORS.PRIMARY,
        };
      default:
        return {
          iconColor: COLORS.PRIMARY,
          iconBg: COLORS.PRIMARY + '20',
          icon: icon || 'information-circle',
          primaryButtonBg: COLORS.PRIMARY,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: typeStyles.iconBg }]}>
            <Ionicons 
              name={typeStyles.icon as any} 
              size={32} 
              color={typeStyles.iconColor} 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {secondaryButtonText && onSecondaryPress && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onSecondaryPress}
              >
                <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.primaryButton,
                { backgroundColor: typeStyles.primaryButtonBg },
                secondaryButtonText && styles.primaryButtonWithSecondary
              ]}
              onPress={onPrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  alertContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    width: width - (SPACING.lg * 2),
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  primaryButtonWithSecondary: {
    flex: 1.2,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
});

export default CustomAlert; 