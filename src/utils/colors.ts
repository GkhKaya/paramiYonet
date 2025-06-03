import { THEME_COLORS } from '../constants';

export type Theme = 'light' | 'dark';

export const getColors = (theme: Theme) => {
  return {
    PRIMARY: THEME_COLORS[theme].primary,
    SECONDARY: THEME_COLORS[theme].secondary,
    SUCCESS: THEME_COLORS[theme].success,
    WARNING: THEME_COLORS[theme].warning,
    ERROR: THEME_COLORS[theme].error,
    INCOME: THEME_COLORS[theme].income,
    EXPENSE: THEME_COLORS[theme].expense,
    
    BACKGROUND: THEME_COLORS[theme].background,
    SURFACE: THEME_COLORS[theme].surface,
    CARD: THEME_COLORS[theme].card,
    
    WHITE: theme === 'dark' ? '#FFFFFF' : '#000000',
    TEXT_PRIMARY: THEME_COLORS[theme].text,
    TEXT_SECONDARY: THEME_COLORS[theme].textSecondary,
    TEXT_TERTIARY: THEME_COLORS[theme].textTertiary,
    
    BORDER: THEME_COLORS[theme].border,
    SEPARATOR: THEME_COLORS[theme].border,
    
    // Legacy
    BLACK: theme === 'dark' ? '#FFFFFF' : '#000000',
    GRAY: THEME_COLORS[theme].textSecondary,
    LIGHT_GRAY: THEME_COLORS[theme].textTertiary,
  };
}; 