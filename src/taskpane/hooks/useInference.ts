import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '../../shared/messages';
import { chatStream, type OllamaChatResponse } from '../../shared/ollama';

interface UseInferenceReturn {
  streamingText: string;
  isGenerating: boolean;
  tps: number;
  error: string | null;
  onComplete: React.MutableRefObject<((fullText: string) => void) | null>;
  generate: (messages: ChatMessage[], model?: string) => void;
  interrupt: () => void;
}

export function useInference(): UseInferenceReturn {
  const [streamingText, setStreamingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tps, setTps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef<((fullText: string) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullTextRef = useRef('');

  const generate = useCallback((messages: ChatMessage[], model?: string) => {
    setStreamingText('');
    setIsGenerating(true);
    setTps(0);
    setError(null);
    fullTextRef.current = '';

    const controller = new AbortController();
    abortRef.current = controller;

    const startTime = performance.now();
    let tokenCount = 0;

    chatStream(
      messages,
      (_token, partialText) => {

        tokenCount++;
        fullTextRef.current = partialText;
        setStreamingText(partialText);
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0) setTps(Math.round(tokenCount / elapsed));
      },
      controller.signal,
      model,
    )
      .then((finalChunk: OllamaChatResponse) => {
        setIsGenerating(false);
        // Use Ollama's precise TPS from final chunk if available
        if (finalChunk.eval_count && finalChunk.eval_duration) {
          const serverTps = finalChunk.eval_count / (finalChunk.eval_duration / 1e9);
          setTps(Math.round(serverTps));
        }
        if (onCompleteRef.current) {
          onCompleteRef.current(fullTextRef.current);
          onCompleteRef.current = null;
        }
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setIsGenerating(false);
        setError(err.message);
      });
  }, []);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  }, []);

  return { streamingText, isGenerating, tps, error, onComplete: onCompleteRef, generate, interrupt };
}
