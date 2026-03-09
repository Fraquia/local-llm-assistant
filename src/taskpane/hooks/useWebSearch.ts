import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../../shared/types';

interface UseWebSearchReturn {
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  isLoaded: boolean;
}

export function useWebSearch(): UseWebSearchReturn {
  const [webSearchEnabled, setEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WEB_SEARCH_ENABLED);
      if (stored !== null) {
        setEnabled(JSON.parse(stored) === true);
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  const setWebSearchEnabled = useCallback((enabled: boolean) => {
    setEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.WEB_SEARCH_ENABLED, JSON.stringify(enabled));
    } catch {
      console.warn('Failed to persist web search setting');
    }
  }, []);

  return { webSearchEnabled, setWebSearchEnabled, isLoaded };
}
