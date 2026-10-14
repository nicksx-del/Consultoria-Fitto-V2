export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const fontFamily = {
  regular: 'Manrope_400Regular',
  semiBold: 'Manrope_600SemiBold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  danger: string;
}

export const darkColors: ThemeColors = {
  bg: '#0E0F0C',
  surface: '#171814',
  border: '#26281F',
  text: '#F2F3EE',
  textMuted: '#8A8D80',
  accent: '#B7F34A',
  onAccent: '#0E0F0C',
  danger: '#FF6B5A',
};

export const lightColors: ThemeColors = {
  bg: '#FFFFFF',
  surface: '#F6F7F3',
  border: '#E1E4D8',
  text: '#0E0F0C',
  textMuted: '#686B60',
  accent: '#FF6B00',
  onAccent: '#FFFFFF',
  danger: '#FF6B5A',
};

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontFamily: typeof fontFamily;
}

export const defaultTheme: Theme = {
  colors: darkColors,
  spacing,
  radius,
  fontSize,
  fontFamily,
};
