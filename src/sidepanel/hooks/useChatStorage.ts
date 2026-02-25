import { useState, useEffect, useCallback } from 'react';
import type { ChatMessageWithId } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/types';

interface UseChatStorageReturn {
  messages: ChatMessageWithId[];
  addMessage: (msg: ChatMessageWithId) => void;
  clearAll: () => void;
  bytesInUse: number;
  isLoaded: boolean;
}

export function useChatStorage(): UseChatStorageReturn {
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [bytesInUse, setBytesInUse] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.CHAT_HISTORY, (result) => {
      const stored = result[STORAGE_KEYS.CHAT_HISTORY];
      if (Array.isArray(stored)) {
        setMessages(stored);
      }
      setIsLoaded(true);
    });
    updateBytesInUse();
  }, []);

  const updateBytesInUse = () => {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      setBytesInUse(bytes);
    });
  };

  const persist = useCallback((msgs: ChatMessageWithId[]) => {
    chrome.storage.local.set({ [STORAGE_KEYS.CHAT_HISTORY]: msgs }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to persist chat:', chrome.runtime.lastError.message);
      }
      updateBytesInUse();
    });
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
    chrome.storage.local.remove(STORAGE_KEYS.CHAT_HISTORY, () => {
      updateBytesInUse();
    });
  }, []);

  return { messages, addMessage, clearAll, bytesInUse, isLoaded };
}
