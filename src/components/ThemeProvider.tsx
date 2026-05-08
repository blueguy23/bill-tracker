'use client';

import { createContext, useContext, useCallback, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme | undefined;
  toggleTheme: () => void;
  applyAndPersist: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: undefined,
  toggleTheme: () => {},
  applyAndPersist: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(t: Theme) {
  if (t === 'light') {
    document.documentElement.dataset.theme = 'light';
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored === 'light' ? 'light' : 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      applyTheme(next);
      return next;
    });
  }, []);

  const applyAndPersist = useCallback((t: Theme) => {
    localStorage.setItem('theme', t);
    applyTheme(t);
    setTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, applyAndPersist }}>
      {children}
    </ThemeContext.Provider>
  );
}
