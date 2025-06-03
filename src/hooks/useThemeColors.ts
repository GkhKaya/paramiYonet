import { useTheme } from '../contexts/ThemeContext';
import { THEME_COLORS } from '../constants/index';

export const useThemeColors = () => {
  const { theme } = useTheme();
  return THEME_COLORS[theme];
}; 