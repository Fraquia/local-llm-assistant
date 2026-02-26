export type ModelStatus = 'checking' | 'ready' | 'model_not_found' | 'pulling' | 'error';

export type WritingAction = 'rewrite' | 'improve' | 'simplify';

export type TabId = 'chat' | 'summarize' | 'write' | 'page-chat';

export interface ChatMessageWithId {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CustomWritingCommand {
  id: string;
  name: string;
  prompt: string;
}

export type InferenceMode = 'ollama' | 'browser';

export type BrowserModelId = 'lfm2.5-1.2b' | 'llama-3.2-3b' | 'llama-3.2-1b';

export interface BrowserModelInfo {
  label: string;
  size: string;
  note?: string;
}

export const BROWSER_MODELS: Record<BrowserModelId, BrowserModelInfo> = {
  'llama-3.2-1b': { label: 'Llama 3.2 1B', size: '~1.2 GB' },
  'llama-3.2-3b': { label: 'Llama 3.2 3B', size: '~2.6 GB' },
  'lfm2.5-1.2b': { label: 'LFM2.5 1.2B', size: '~1.2 GB', note: 'Solo CPU — lento' },
};

export const DEFAULT_BROWSER_MODEL: BrowserModelId = 'llama-3.2-1b';

export const STORAGE_KEYS = {
  CHAT_HISTORY: 'chat_history',
  SELECTED_MODEL: 'selected_model',
  CUSTOM_COMMANDS: 'custom_commands',
  WEB_SEARCH_ENABLED: 'web_search_enabled',
  THEME: 'theme',
  INFERENCE_MODE: 'inference_mode',
  BROWSER_MODEL: 'browser_model',
} as const;
