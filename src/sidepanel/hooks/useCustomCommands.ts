import { useState, useEffect, useCallback } from 'react';
import type { CustomWritingCommand } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/types';
import { MessageType } from '../../shared/messages';

interface UseCustomCommandsReturn {
  commands: CustomWritingCommand[];
  addCommand: (name: string, prompt: string) => void;
  updateCommand: (id: string, name: string, prompt: string) => void;
  removeCommand: (id: string) => void;
  isLoaded: boolean;
}

export function useCustomCommands(): UseCustomCommandsReturn {
  const [commands, setCommands] = useState<CustomWritingCommand[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.CUSTOM_COMMANDS, (result) => {
      const stored = result[STORAGE_KEYS.CUSTOM_COMMANDS];
      if (Array.isArray(stored)) {
        setCommands(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const persist = useCallback((cmds: CustomWritingCommand[]) => {
    chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_COMMANDS]: cmds }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to persist commands:', chrome.runtime.lastError.message);
      }
    });
    // Notify service worker to rebuild context menus
    chrome.runtime.sendMessage({ type: MessageType.REBUILD_CONTEXT_MENUS }).catch(() => {});
  }, []);

  const addCommand = useCallback((name: string, prompt: string) => {
    if (!name.trim() || !prompt.trim()) return;
    setCommands(prev => {
      const updated = [...prev, { id: crypto.randomUUID(), name: name.trim(), prompt: prompt.trim() }];
      persist(updated);
      return updated;
    });
  }, [persist]);

  const updateCommand = useCallback((id: string, name: string, prompt: string) => {
    if (!name.trim() || !prompt.trim()) return;
    setCommands(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, name: name.trim(), prompt: prompt.trim() } : c);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const removeCommand = useCallback((id: string) => {
    setCommands(prev => {
      const updated = prev.filter(c => c.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  return { commands, addCommand, updateCommand, removeCommand, isLoaded };
}
