import { createContext, use, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'claro' | 'escuro';

const STORAGE_KEY = 'varal:tema';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialTheme(): Theme {
  // O script no index.html já decidiu antes do primeiro paint; aqui só lemos o resultado.
  return document.documentElement.dataset.theme === 'escuro' ? 'escuro' : 'claro';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'claro' ? 'escuro' : 'claro';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Navegação privada pode bloquear o storage. O tema vale só para esta visita.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme precisa estar dentro de ThemeProvider');
  return context;
}
