import type { ChatMessage } from '../shared/messages';

export type { ChatMessage };

// Messages sent from the side panel to the worker
export type WorkerIn =
  | { type: 'LOAD_MODELS'; modelId?: string }
  | { type: 'GENERATE'; messages: ChatMessage[] }
  | { type: 'INTERRUPT' }
  | { type: 'RESET' };

// Messages sent from the worker to the side panel
export type WorkerOut =
  | { type: 'LOAD_PROGRESS'; progress: number; status: string }
  | { type: 'LOAD_COMPLETE'; device: 'webgpu' | 'wasm' }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'TOKEN'; token: string; state: 'thinking' | 'answering' }
  | { type: 'COMPLETE'; fullText: string; thinkingText: string; tps: number }
  | { type: 'ERROR'; error: string };
