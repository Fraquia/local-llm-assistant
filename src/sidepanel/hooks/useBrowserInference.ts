import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../shared/messages';
import type { WorkerIn, WorkerOut } from '../../browser-inference/types';
import type { BrowserModelId } from '../../shared/types';

export interface BrowserModelState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress?: number;
  statusMsg?: string;
  device?: 'webgpu' | 'wasm';
  error?: string;
}

export interface UseBrowserInferenceReturn {
  modelState: BrowserModelState;
  streamingText: string;
  thinkingText: string;
  isGenerating: boolean;
  isThinking: boolean;
  tps: number;
  error: string | null;
  onComplete: React.MutableRefObject<((fullText: string) => void) | null>;
  loadModels: () => void;
  generate: (messages: ChatMessage[]) => void;
  interrupt: () => void;
  reset: () => void;
}

function createWorkerForModel(modelId: BrowserModelId): Worker {
  if (modelId === 'lfm2.5-1.2b') {
    return new Worker(
      new URL('../../browser-inference/worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  // llama-3.2-1b and llama-3.2-3b use the same worker
  return new Worker(
    new URL('../../llama-inference/worker.ts', import.meta.url),
    { type: 'module' },
  );
}

export function useBrowserInference(browserModelId: BrowserModelId): UseBrowserInferenceReturn {
  const [modelState, setModelState] = useState<BrowserModelState>({ status: 'idle' });
  const [streamingText, setStreamingText] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [tps, setTps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const onCompleteRef = useRef<((fullText: string) => void) | null>(null);
  const fullTextRef = useRef('');
  const thinkingTextRef = useRef('');
  const currentModelRef = useRef<BrowserModelId | null>(null);

  // Create/recreate worker when browserModelId changes
  useEffect(() => {
    // Terminate previous worker if model changed
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // Reset state for new model
    setModelState({ status: 'idle' });
    setStreamingText('');
    setThinkingText('');
    setIsGenerating(false);
    setIsThinking(false);
    setTps(0);
    setError(null);
    fullTextRef.current = '';
    thinkingTextRef.current = '';
    currentModelRef.current = browserModelId;

    const worker = createWorkerForModel(browserModelId);

    const handleMessage = (event: MessageEvent<WorkerOut>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'LOAD_PROGRESS':
          setModelState({
            status: 'loading',
            progress: msg.progress,
            statusMsg: msg.status,
          });
          break;

        case 'LOAD_COMPLETE':
          setModelState({ status: 'ready', device: msg.device });
          break;

        case 'LOAD_ERROR':
          setModelState({ status: 'error', error: msg.error });
          break;

        case 'TOKEN':
          if (msg.state === 'thinking') {
            setIsThinking(true);
            thinkingTextRef.current += msg.token;
            setThinkingText(thinkingTextRef.current);
          } else {
            setIsThinking(false);
            fullTextRef.current += msg.token;
            setStreamingText(fullTextRef.current);
          }
          break;

        case 'COMPLETE': {
          setIsGenerating(false);
          setIsThinking(false);
          if (msg.tps > 0) setTps(msg.tps);
          if (onCompleteRef.current) {
            onCompleteRef.current(fullTextRef.current);
            onCompleteRef.current = null;
          }
          break;
        }

        case 'ERROR':
          setIsGenerating(false);
          setIsThinking(false);
          setError(msg.error);
          break;
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', (e: ErrorEvent) => {
      const errorMsg = e.message ?? 'Worker crashed';
      setModelState({ status: 'error', error: errorMsg });
      setIsGenerating(false);
      setIsThinking(false);
    });
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [browserModelId]);

  const loadModels = useCallback(() => {
    setModelState({ status: 'loading', progress: 0, statusMsg: 'Starting...' });
    workerRef.current?.postMessage({
      type: 'LOAD_MODELS',
      modelId: currentModelRef.current ?? undefined,
    } satisfies WorkerIn);
  }, []);

  const generate = useCallback((messages: ChatMessage[]) => {
    setStreamingText('');
    setThinkingText('');
    setIsGenerating(true);
    setIsThinking(true);
    setTps(0);
    setError(null);
    fullTextRef.current = '';
    thinkingTextRef.current = '';
    workerRef.current?.postMessage({
      type: 'GENERATE',
      messages,
    } satisfies WorkerIn);
  }, []);

  const interrupt = useCallback(() => {
    workerRef.current?.postMessage({ type: 'INTERRUPT' } satisfies WorkerIn);
    setIsGenerating(false);
    setIsThinking(false);
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESET' } satisfies WorkerIn);
  }, []);

  return {
    modelState,
    streamingText,
    thinkingText,
    isGenerating,
    isThinking,
    tps,
    error,
    onComplete: onCompleteRef,
    loadModels,
    generate,
    interrupt,
    reset,
  };
}
