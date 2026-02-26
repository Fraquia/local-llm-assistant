import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../../shared/types';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.THEME, (result) => {
      const saved = result[STORAGE_KEYS.THEME] as Theme | undefined;
      const initial = saved ?? 'light';
      setThemeState(initial);
      applyTheme(initial);
      setIsLoaded(true);
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    chrome.storage.local.set({ [STORAGE_KEYS.THEME]: t });
  };

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return { theme, toggle, isLoaded };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
