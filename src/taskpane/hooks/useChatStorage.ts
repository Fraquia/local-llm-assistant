import { useState, useEffect, useCallback } from 'react';
import type { ChatMessageWithId } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/types';

interface UseChatStorageReturn {
  messages: ChatMessageWithId[];
  addMessage: (msg: ChatMessageWithId) => void;
  clearAll: () => void;
  isLoaded: boolean;
}

export function useChatStorage(): UseChatStorageReturn {
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      console.warn('Failed to load chat history from localStorage');
    }
    setIsLoaded(true);
  }, []);

  const persist = useCallback((msgs: ChatMessageWithId[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(msgs));
    } catch {
      console.warn('Failed to persist chat history');
    }
  }, []);

  const addMessage = useCallback((msg: ChatMessageWithId) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearAll = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  }, []);

  return { messages, addMessage, clearAll, isLoaded };
}
