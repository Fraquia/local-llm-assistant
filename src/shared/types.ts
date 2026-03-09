export type ModelStatus = 'checking' | 'ready' | 'model_not_found' | 'pulling' | 'error';

export type WritingAction = 'rewrite' | 'improve' | 'simplify';

export type TabId = 'chat' | 'summarize' | 'write' | 'doc-chat';

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

export const STORAGE_KEYS = {
  CHAT_HISTORY: 'chat_history',
  SELECTED_MODEL: 'selected_model',
  CUSTOM_COMMANDS: 'custom_commands',
  WEB_SEARCH_ENABLED: 'web_search_enabled',
  THEME: 'theme',
} as const;
