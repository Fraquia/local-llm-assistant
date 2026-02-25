import { useState, useEffect, useCallback, useRef } from 'react';
import type { ModelStatus } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/types';
import { DEFAULT_MODEL, listModels, pullModel as pullModelFn, type OllamaModel, type OllamaPullResponse } from '../../shared/ollama';

interface UseModelStatusReturn {
  status: ModelStatus;
  progress: number;
  errorMsg: string | null;
  models: OllamaModel[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  retry: () => void;
  pullModel: () => void;
}

export function useModelStatus(): UseModelStatusReturn {
  const [status, setStatus] = useState<ModelStatus>('checking');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted model selection on mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.SELECTED_MODEL, (result) => {
      const stored = result[STORAGE_KEYS.SELECTED_MODEL];
      if (typeof stored === 'string' && stored) {
        setSelectedModelState(stored);
      }
    });
  }, []);

  const checkOllama = useCallback(async (modelToCheck?: string) => {
    setStatus('checking');
    setErrorMsg(null);
    setProgress(0);
    try {
      const modelList = await listModels();
      setModels(modelList);
      const target = modelToCheck ?? selectedModel;
      const hasModel = modelList.some(
        m => m.name === target || m.name.startsWith(target.split(':')[0]),
      );
      setStatus(hasModel ? 'ready' : (modelList.length > 0 ? 'model_not_found' : 'model_not_found'));
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error && err.message.includes('Failed to fetch')
          ? 'Ollama is not running. Install from ollama.com and run "ollama serve".'
          : (err as Error).message,
      );
    }
  }, [selectedModel]);

  useEffect(() => {
    checkOllama();
  }, [checkOllama]);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_MODEL]: model });
    checkOllama(model);
  }, [checkOllama]);

  const pull = useCallback(() => {
    setStatus('pulling');
    setProgress(0);
    setErrorMsg(null);

    const controller = new AbortController();
    abortRef.current = controller;

    pullModelFn(
      selectedModel,
      (chunk: OllamaPullResponse) => {
        if (chunk.total && chunk.completed) {
          setProgress(Math.round((chunk.completed / chunk.total) * 100));
        }
      },
      controller.signal,
    )
      .then(() => {
        setStatus('ready');
        setProgress(100);
        // Refresh model list
        listModels().then(setModels).catch(() => {});
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') {
          setStatus('model_not_found');
          return;
        }
        setStatus('error');
        setErrorMsg(err.message);
      });
  }, [selectedModel]);

  return { status, progress, errorMsg, models, selectedModel, setSelectedModel, retry: () => checkOllama(), pullModel: pull };
}
