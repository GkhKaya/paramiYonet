import { Currency } from '../types';

// Uygulama sabitleri
export const APP_CONFIG = {
  NAME: 'ParamiYönet',
  VERSION: '1.0.0',
  DEFAULT_CURRENCY: 'TRY' as Currency,
  PAGINATION_LIMIT: 20,
  DEFAULT_THEME: 'dark',
};

// Para birimleri
export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

// Dark Theme Ana Renkler
export const COLORS = {
  PRIMARY: '#007AFF',           // iOS Blue
  SECONDARY: '#FFD60A',         // Gold/Yellow
  SUCCESS: '#30D158',           // Green
  WARNING: '#FF9F0A',           // Orange
  ERROR: '#FF453A',             // Red
  INCOME: '#30D158',            // Green
  EXPENSE: '#FF453A',           // Red
  
  // Dark Theme Background Colors
  BACKGROUND: '#000000',        // Pure Black
  SURFACE: '#1C1C1E',          // Dark Gray
  CARD: '#2C2C2E',             // Card Background
  MODAL: '#3A3A3C',            // Modal Background
  
  // Text Colors
  WHITE: '#FFFFFF',
  TEXT_PRIMARY: '#FFFFFF',      // Primary text
  TEXT_SECONDARY: '#8E8E93',    // Secondary text
  TEXT_TERTIARY: '#48484A',     // Tertiary text
  
  // Border Colors
  BORDER: '#38383A',            // Border color
  SEPARATOR: '#38383A',         // Line separator
  
  // Legacy colors (keeping for compatibility)
  BLACK: '#000000',
  GRAY: '#8E8E93',
  LIGHT_GRAY: '#48484A',
};

// Tema renkleri
export const THEME_COLORS = {
  dark: {
    primary: '#007AFF',
    secondary: '#FFD60A',
    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#48484A',
    border: '#38383A',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    income: '#30D158',
    expense: '#FF453A',
  },
  light: {
    primary: '#007AFF',
    secondary: '#FFD60A',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    border: '#C6C6C8',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    income: '#34C759',
    expense: '#FF3B30',
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography
export const TYPOGRAPHY = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  ACCOUNTS: 'accounts',
  CATEGORIES: 'categories',
};

// Validation
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999999,
  MAX_DESCRIPTION_LENGTH: 100,
  MAX_ACCOUNT_NAME_LENGTH: 50,
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  MONTH_YEAR: 'MM/YYYY',
}; 