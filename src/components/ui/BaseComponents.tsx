/**
 * Base Components - Temel UI Bileşenleri
 * 
 * Bu dosya uygulamada kullanılan temel UI bileşenlerini içerir.
 * Tüm bileşenler tutarlı tasarım ve davranış için merkezi olarak tanımlanır.
 */

import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
  TextStyle,
  ViewStyle,
  TextInputProps,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, LAYOUT, SHADOWS } from '../../constants/ui';

/**
 * Temel Metin Bileşeni
 * Uygulama genelinde tutarlı tipografi için kullanılır
 */
interface BaseTextProps {
  children: React.ReactNode;
  variant?: 'body' | 'caption' | 'subtitle' | 'title' | 'headline';
  color?: keyof typeof COLORS;
  weight?: keyof typeof TYPOGRAPHY.weights;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: TextStyle;
}

export const BaseText: React.FC<BaseTextProps> = ({
  children,
  variant = 'body',
  color = 'TEXT_PRIMARY',
  weight = 'normal',
  align = 'left',
  numberOfLines,
  style,
}) => {
  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'caption':
        return {
          fontSize: TYPOGRAPHY.sizes.xs,
          lineHeight: TYPOGRAPHY.sizes.xs * TYPOGRAPHY.lineHeights.normal,
        };
      case 'body':
        return {
          fontSize: TYPOGRAPHY.sizes.md,
          lineHeight: TYPOGRAPHY.sizes.md * TYPOGRAPHY.lineHeights.normal,
        };
      case 'subtitle':
        return {
          fontSize: TYPOGRAPHY.sizes.lg,
          lineHeight: TYPOGRAPHY.sizes.lg * TYPOGRAPHY.lineHeights.normal,
        };
      case 'title':
        return {
          fontSize: TYPOGRAPHY.sizes.xl,
          lineHeight: TYPOGRAPHY.sizes.xl * TYPOGRAPHY.lineHeights.tight,
        };
      case 'headline':
        return {
          fontSize: TYPOGRAPHY.sizes.xxl,
          lineHeight: TYPOGRAPHY.sizes.xxl * TYPOGRAPHY.lineHeights.tight,
        };
      default:
        return {};
    }
  };

  return (
    <Text
      style={[
        {
          color: COLORS[color],
          fontWeight: TYPOGRAPHY.weights[weight],
          textAlign: align,
          fontFamily: TYPOGRAPHY.fontFamily.regular,
        },
        getVariantStyle(),
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

/**
 * Temel Buton Bileşeni
 * Farklı varyantları olan yeniden kullanılabilir buton
 */
interface BaseButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? COLORS.TEXT_DISABLED : COLORS.PRIMARY,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? COLORS.TEXT_DISABLED : COLORS.SECONDARY,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled ? COLORS.TEXT_DISABLED : COLORS.PRIMARY,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: disabled ? COLORS.TEXT_DISABLED : COLORS.ERROR,
          borderWidth: 0,
        };
      default:
        return {};
    }
  };

  const getTextColor = (): keyof typeof COLORS => {
    if (disabled) return 'TEXT_DISABLED';
    
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return 'TEXT_LIGHT';
      case 'outline':
        return 'PRIMARY';
      case 'ghost':
        return 'TEXT_PRIMARY';
      default:
        return 'TEXT_LIGHT';
    }
  };

  const getSizeStyle = (): ViewStyle => {
    return {
      height: LAYOUT.buttonHeight[size],
      paddingHorizontal: size === 'sm' ? SPACING.sm : size === 'lg' ? SPACING.xl : SPACING.md,
    };
  };

  const getIconSize = (): number => {
    return size === 'sm' ? LAYOUT.iconSize.sm : size === 'lg' ? LAYOUT.iconSize.md : LAYOUT.iconSize.sm;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        fullWidth && { width: '100%' },
        disabled && styles.buttonDisabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS[getTextColor()]} />
        ) : (
          <>
            {leftIcon && (
              <Ionicons
                name={leftIcon as any}
                size={getIconSize()}
                color={COLORS[getTextColor()]}
                style={styles.leftIcon}
              />
            )}
            <BaseText
              variant="body"
              color={getTextColor()}
              weight="medium"
              style={styles.buttonText}
            >
              {title}
            </BaseText>
            {rightIcon && (
              <Ionicons
                name={rightIcon as any}
                size={getIconSize()}
                color={COLORS[getTextColor()]}
                style={styles.rightIcon}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Temel Input Bileşeni
 * Form girişleri için standart input
 */
interface BaseInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const BaseInput: React.FC<BaseInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outline',
  size = 'md',
  style,
  ...props
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: COLORS.BACKGROUND,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: COLORS.SURFACE,
          borderWidth: 1,
          borderColor: error ? COLORS.ERROR : COLORS.BORDER,
        };
      default:
        return {
          backgroundColor: COLORS.SURFACE,
          borderBottomWidth: 1,
          borderBottomColor: error ? COLORS.ERROR : COLORS.BORDER,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    return {
      height: LAYOUT.inputHeight[size],
      paddingHorizontal: SPACING.md,
    };
  };

  const getIconSize = (): number => {
    return size === 'sm' ? LAYOUT.iconSize.sm : size === 'lg' ? LAYOUT.iconSize.md : LAYOUT.iconSize.sm;
  };

  return (
    <View style={styles.inputContainer}>
      {label && (
        <BaseText
          variant="caption"
          color="TEXT_SECONDARY"
          weight="medium"
          style={styles.inputLabel}
        >
          {label}
        </BaseText>
      )}
      
      <View style={[styles.inputWrapper, getVariantStyle(), getSizeStyle()]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={getIconSize()}
            color={COLORS.TEXT_SECONDARY}
            style={styles.inputLeftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && { paddingLeft: 0 },
            rightIcon && { paddingRight: 0 },
            style,
          ]}
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.inputRightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon as any}
              size={getIconSize()}
              color={COLORS.TEXT_SECONDARY}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <BaseText
          variant="caption"
          color={error ? 'ERROR' : 'TEXT_SECONDARY'}
          style={styles.inputHelperText}
        >
          {error || helperText}
        </BaseText>
      )}
    </View>
  );
};

/**
 * Temel Kart Bileşeni
 * İçerik grupları için standart kart yapısı
 */
interface BaseCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof SPACING;
  style?: ViewStyle;
  onPress?: () => void;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onPress,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: COLORS.SURFACE,
          ...SHADOWS.md,
        };
      case 'outlined':
        return {
          backgroundColor: COLORS.SURFACE,
          borderWidth: 1,
          borderColor: COLORS.BORDER,
        };
      default:
        return {
          backgroundColor: COLORS.SURFACE,
          ...SHADOWS.sm,
        };
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[
        styles.card,
        getVariantStyle(),
        { padding: SPACING[padding] },
        style,
      ]}
      onPress={onPress}
    >
      {children}
    </CardComponent>
  );
};

/**
 * Stil Tanımları
 */
const styles = StyleSheet.create({
  // Button Stilleri
  button: {
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: SPACING.xs,
  },
  rightIcon: {
    marginLeft: SPACING.xs,
  },

  // Input Stilleri
  inputContainer: {
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    paddingHorizontal: SPACING.xs,
  },
  inputLeftIcon: {
    marginLeft: SPACING.xs,
    marginRight: SPACING.xs,
  },
  inputRightIcon: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  inputHelperText: {
    marginTop: SPACING.xs,
  },

  // Card Stilleri
  card: {
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.xs,
  },
}); 