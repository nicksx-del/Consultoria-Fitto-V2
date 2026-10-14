import React, { createContext, useContext, useMemo, useState } from 'react';

import {
  defaultTheme,
  darkColors,
  lightColors,
  spacing,
  radius,
  fontSize,
  fontFamily,
  Theme,
} from './tokens';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mode: 'dark',
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const value = useMemo<ThemeContextValue>(() => {
    const colors = mode === 'dark' ? darkColors : lightColors;
    const theme: Theme = {
      colors,
      spacing,
      radius,
      fontSize,
      fontFamily,
    };

    return {
      theme,
      mode,
      setMode,
      toggleTheme: () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
