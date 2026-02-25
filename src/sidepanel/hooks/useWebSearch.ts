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
    chrome.storage.local.get(STORAGE_KEYS.WEB_SEARCH_ENABLED, (result) => {
      const stored = result[STORAGE_KEYS.WEB_SEARCH_ENABLED];
      if (typeof stored === 'boolean') {
        setEnabled(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const setWebSearchEnabled = useCallback((enabled: boolean) => {
    setEnabled(enabled);
    chrome.storage.local.set({ [STORAGE_KEYS.WEB_SEARCH_ENABLED]: enabled }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to persist web search setting:', chrome.runtime.lastError.message);
      }
    });
  }, []);

  return { webSearchEnabled, setWebSearchEnabled, isLoaded };
}
