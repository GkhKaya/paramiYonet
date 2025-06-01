import React from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../constants';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface CategoryIconProps {
  iconName: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  filled?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  color,
  size = 'medium',
  style,
  filled = false,
}) => {
  const containerStyle = [
    styles.container,
    styles[size],
    { backgroundColor: color },
    style,
  ];

  const getIconSize = () => {
    const baseSizes = {
      small: isSmallDevice ? 14 : 16,
      medium: isSmallDevice ? 20 : 24,
      large: isSmallDevice ? 28 : 32,
    };
    return baseSizes[size];
  };

  // Add outline suffix if not filled
  const finalIconName = filled ? iconName : `${iconName}-outline`;

  return (
    <View style={containerStyle}>
      <Ionicons 
        name={finalIconName as any} 
        size={getIconSize()} 
        color="white" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Responsive sizes
  small: {
    width: isSmallDevice ? 28 : 32,
    height: isSmallDevice ? 28 : 32,
  },
  medium: {
    width: isSmallDevice ? 40 : 48,
    height: isSmallDevice ? 40 : 48,
  },
  large: {
    width: isSmallDevice ? 56 : 64,
    height: isSmallDevice ? 56 : 64,
  },
}); 