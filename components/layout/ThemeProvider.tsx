'use client';

import * as React from 'react';

type Theme = 'dark' | 'light';
interface Ctx { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void; }
const ThemeCtx = React.createContext<Ctx>({ theme: 'light', setTheme: () => {}, toggle: () => {} });
export const useTheme = () => React.useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('light');

  React.useEffect(() => {
    const stored = (localStorage.getItem('istbaku-theme') as Theme) || 'light';
    setThemeState(stored);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('istbaku-theme', t);
    const root = document.documentElement;
    if (t === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, []);

  const toggle = React.useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}
