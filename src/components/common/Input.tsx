import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  TextInputProps,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode | string;
  rightIcon?: React.ReactNode | string;
  onRightIconPress?: () => void;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'medium',
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyles = [
    styles.container,
    containerStyle,
  ];

  const inputContainerStyles = [
    styles.inputContainer,
    styles[variant],
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
  ];

  const textInputStyles = [
    styles.input,
    styles[`${size}Input`],
    inputStyle,
  ];

  const renderIcon = (icon: React.ReactNode | string, isRightIcon: boolean = false) => {
    if (typeof icon === 'string') {
      const IconComponent = (
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={COLORS.TEXT_SECONDARY} 
        />
      );
      
      if (isRightIcon && onRightIconPress) {
        return (
          <TouchableOpacity onPress={onRightIconPress}>
            {IconComponent}
          </TouchableOpacity>
        );
      }
      
      return IconComponent;
    }
    
    if (isRightIcon && onRightIconPress) {
      return (
        <TouchableOpacity onPress={onRightIconPress}>
          {icon}
        </TouchableOpacity>
      );
    }
    
    return icon;
  };

  return (
    <View style={containerStyles}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {renderIcon(leftIcon)}
          </View>
        )}
        
        <TextInput
          style={textInputStyles}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          value={textInputProps.value ?? ''}
          onChangeText={textInputProps.onChangeText}
          {...textInputProps}
        />
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {renderIcon(rightIcon, true)}
          </View>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
  },
  
  label: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
  },
  
  // Variants
  default: {
    backgroundColor: COLORS.SURFACE,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  filled: {
    backgroundColor: COLORS.CARD,
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
  
  // States
  focused: {
    borderColor: COLORS.PRIMARY,
    borderWidth: 2,
  },
  error: {
    borderColor: COLORS.ERROR,
    borderWidth: 2,
  },
  
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    padding: 0,
  },
  
  // Input sizes
  smallInput: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  mediumInput: {
    fontSize: TYPOGRAPHY.sizes.md,
  },
  largeInput: {
    fontSize: TYPOGRAPHY.sizes.lg,
  },
  
  leftIcon: {
    marginRight: SPACING.sm,
  },
  
  rightIcon: {
    marginLeft: SPACING.sm,
  },
  
  errorText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.ERROR,
    marginTop: SPACING.xs,
  },
}); 