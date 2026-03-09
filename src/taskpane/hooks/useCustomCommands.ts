import { useState, useEffect, useCallback } from 'react';
import type { CustomWritingCommand } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/types';

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
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_COMMANDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setCommands(parsed);
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  const persist = useCallback((cmds: CustomWritingCommand[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COMMANDS, JSON.stringify(cmds));
    } catch {
      console.warn('Failed to persist commands');
    }
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
