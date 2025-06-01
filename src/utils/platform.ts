import { Platform, Dimensions } from 'react-native';

// Platform detection
export const isWeb = Platform.OS === 'web';
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// Screen size detection for responsive design
const { width } = Dimensions.get('window');

export const isLargeScreen = width >= 1024;
export const isMediumScreen = width >= 768 && width < 1024;
export const isSmallScreen = width < 768;

// Web layout helpers
export const getWebContainerStyles = (): any => {
  if (!isWeb) return {};
  
  return {
    width: '100%',
    minHeight: '100vh',
    maxWidth: 'none',
  };
};

export const getResponsiveColumns = () => {
  if (!isWeb) return 1;
  if (width >= 1440) return 4; // Extra large screens
  if (isLargeScreen) return 3;
  if (isMediumScreen) return 2;
  return 1;
}; 