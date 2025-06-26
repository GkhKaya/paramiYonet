import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive breakpoints (gerçek cihaz boyutlarına göre)
const BREAKPOINTS = {
  // iPhone boyutları
  iphone_se: 375,    // iPhone SE
  iphone_12: 390,    // iPhone 12/13/14
  iphone_plus: 428,  // iPhone Plus modelleri
  
  // Android boyutları  
  small_android: 360,  // Küçük Android
  medium_android: 390, // Orta Android
  large_android: 430,  // Büyük Android
  
  // Tablet boyutları
  ipad_mini: 744,    // iPad Mini
  ipad: 820,         // iPad normal
  ipad_pro: 1024,    // iPad Pro
};

// Width percentage - ekran genişliğine göre yüzde hesaplama
export const wp = (percentage: number): number => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Height percentage - ekran yüksekliğine göre yüzde hesaplama  
export const hp = (percentage: number): number => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive font size - cihaz boyutuna göre font optimizasyonu
export const fontSize = (size: number): number => {
  if (SCREEN_WIDTH <= BREAKPOINTS.iphone_se) {
    return size * 0.9; // Küçük cihazlarda %10 küçült
  } else if (SCREEN_WIDTH >= BREAKPOINTS.ipad_mini) {
    return size * 1.2; // Tablet'lerde %20 büyüt
  }
  return size;
};

// Responsive spacing - cihaz boyutuna göre spacing optimizasyonu
export const spacing = (size: number): number => {
  if (SCREEN_WIDTH <= BREAKPOINTS.iphone_se) {
    return Math.max(size * 0.8, 4); // Küçük cihazlarda %20 küçült, min 4px
  } else if (SCREEN_WIDTH >= BREAKPOINTS.ipad_mini) {
    return size * 1.3; // Tablet'lerde %30 büyüt
  }
  return size;
};

// Device type detection
export const isSmallDevice = (): boolean => SCREEN_WIDTH <= BREAKPOINTS.iphone_se;
export const isMediumDevice = (): boolean => SCREEN_WIDTH > BREAKPOINTS.iphone_se && SCREEN_WIDTH < BREAKPOINTS.ipad_mini;
export const isLargeDevice = (): boolean => SCREEN_WIDTH >= BREAKPOINTS.ipad_mini;

// Icon size - cihaza göre ikon boyutu
export const iconSize = (size: number): number => {
  if (isSmallDevice()) {
    return Math.max(size * 0.85, 16); // Küçük cihazlarda küçült, min 16px
  } else if (isLargeDevice()) {
    return size * 1.25; // Büyük cihazlarda büyüt
  }
  return size;
};

// Responsive function - cihaz tipine göre değer seçimi
export const responsive = (
  phone: number,
  tablet?: number,
  desktop?: number
): number => {
  if (isLargeDevice() && tablet !== undefined) {
    return tablet;
  }
  return phone;
}; 