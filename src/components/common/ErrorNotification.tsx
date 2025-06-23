import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useError } from '../../contexts/ErrorContext';

const ErrorNotification: React.FC = () => {
  const { error, hideError } = useError();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error?.visible) {
      // Slide down and fade in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide up and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error?.visible]);

  if (!error?.visible || Platform.OS === 'web') {
    return null;
  }

  const getIconName = (type: string) => {
    switch (type) {
      case 'error': return 'alert-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      case 'success': return 'checkmark-circle';
      default: return 'alert-circle';
    }
  };

  const getContainerStyle = (type: string) => {
    switch (type) {
      case 'error': return styles.errorContainer;
      case 'warning': return styles.warningContainer;
      case 'info': return styles.infoContainer;
      case 'success': return styles.successContainer;
      default: return styles.errorContainer;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.notification, getContainerStyle(error.type)]}>
        <View style={styles.content}>
          <Ionicons
            name={getIconName(error.type) as any}
            size={24}
            color="white"
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            {error.title && (
              <Text style={styles.title}>{error.title}</Text>
            )}
            <Text style={styles.message}>{error.message}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={hideError} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  notification: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ef4444',
  },
  warningContainer: {
    backgroundColor: '#f59e0b',
  },
  infoContainer: {
    backgroundColor: '#3b82f6',
  },
  successContainer: {
    backgroundColor: '#10b981',
  },
});

export default ErrorNotification; 