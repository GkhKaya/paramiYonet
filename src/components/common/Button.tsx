import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator 
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? COLORS.WHITE : COLORS.PRIMARY} 
          size="small" 
        />
      ) : (
        <>
          {icon}
          <Text style={textStyleCombined}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  
  // Variants
  primary: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondary: {
    backgroundColor: COLORS.SURFACE,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  small: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  medium: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  large: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 16,
  },
  
  // Disabled
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  primaryText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  secondaryText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  outlineText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  ghostText: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  
  // Size text
  smallText: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  mediumText: {
    fontSize: TYPOGRAPHY.sizes.md,
  },
  largeText: {
    fontSize: TYPOGRAPHY.sizes.lg,
  },
  
  disabledText: {
    opacity: 0.7,
  },
}); 