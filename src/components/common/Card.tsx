import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'surface' | 'transparent';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  style,
  shadow = true,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[padding],
    shadow && styles.shadow,
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    backgroundColor: COLORS.CARD,
  },
  
  // Variants
  default: {
    backgroundColor: COLORS.CARD,
  },
  surface: {
    backgroundColor: COLORS.SURFACE,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  
  // Padding
  none: {
    padding: 0,
  },
  small: {
    padding: SPACING.sm,
  },
  medium: {
    padding: SPACING.md,
  },
  large: {
    padding: SPACING.lg,
  },
  
  // Shadow - adapted for dark theme
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
}); 