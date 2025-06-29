import { DarkTheme } from '@react-navigation/native';
import { COLORS } from '../constants';

export const AppDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.PRIMARY,
    background: COLORS.BACKGROUND,
    card: COLORS.SURFACE,
    text: COLORS.TEXT_PRIMARY,
    border: COLORS.BORDER,
    notification: COLORS.PRIMARY,
  },
}; 