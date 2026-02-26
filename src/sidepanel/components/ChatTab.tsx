import { useRef, useEffect, useCallback, useState } from 'react';
import { buildChatMessages, buildChatMessagesWithSearch } from '../../shared/prompts';
import { searchWeb, cleanSearchQuery, optimizeSearchQuery, formatSearchContext } from '../../shared/web-search';
import type { ChatMessageWithId, InferenceMode } from '../../shared/types';
import { useChatStorage } from '../hooks/useChatStorage';
import { useInference } from '../hooks/useInference';
import { useWebSearch } from '../hooks/useWebSearch';
import type { UseBrowserInferenceReturn } from '../hooks/useBrowserInference';
import MessageBubble from './MessageBubble';
import StreamingText from './StreamingText';

interface Props {
  modelReady: boolean;
  selectedModel: string;
  inferenceMode: InferenceMode;
  browserInference: UseBrowserInferenceReturn;
}

export default function ChatTab({ modelReady, selectedModel, inferenceMode, browserInference }: Props) {
  const { messages, addMessage, clearAll, bytesInUse, isLoaded } = useChatStorage();
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const ollamaInference = useInference();
  const { webSearchEnabled, setWebSearchEnabled } = useWebSearch();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number>(0);

  // Active inference based on mode
  const activeInference = inferenceMode === 'browser' ? browserInference : ollamaInference;
  const { streamingText, isGenerating, tps, error, interrupt } = activeInference;
  const isThinking = inferenceMode === 'browser' ? browserInference.isThinking : false;

  const scrollToBottom = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      scrollRafRef.current = 0;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // When generation completes, add assistant message to history
  useEffect(() => {
    if (!isGenerating && streamingText) {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.content === streamingText) return;
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: streamingText });
    }
  }, [isGenerating, streamingText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating || !modelReady) return;

    const userMessage: ChatMessageWithId = { id: crypto.randomUUID(), role: 'user', content: text };
    addMessage(userMessage);
    setInput('');
    setSearchError('');

    const newHistory = [...messages, userMessage];

    // Optionally fetch web search context
    let searchContext = '';
    if (webSearchEnabled) {
      setIsSearching(true);
      try {
        let query: string;
        try {
          query = await optimizeSearchQuery(text, selectedModel, messages.slice(-4));
        } catch {
          query = cleanSearchQuery(text);
        }
        const results = await searchWeb(query);
        searchContext = formatSearchContext(results);
      } catch (err) {
        console.error('[web-search]', err);
        setSearchError('Web search failed — answering without search results.');
      } finally {
        setIsSearching(false);
      }
    }

    // Build messages (same for both modes) and dispatch
    const fullMessages = searchContext
      ? buildChatMessagesWithSearch(newHistory, searchContext)
      : buildChatMessages(newHistory);

    if (inferenceMode === 'browser') {
      browserInference.generate(fullMessages);
    } else {
      ollamaInference.generate(fullMessages, selectedModel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && !isGenerating && (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
            Start a conversation...
          </p>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}

        {isThinking && !streamingText && (
          <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>sto ragionando...</span>
          </div>
        )}

        {isGenerating && streamingText && (
          <div className="mb-4">
            <StreamingText text={streamingText} tps={tps} isStreaming={true} />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 px-2 py-1">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={webSearchEnabled}
              onChange={e => setWebSearchEnabled(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            Web search
          </label>
          {isSearching && (
            <span className="text-[10px] text-blue-500 animate-pulse">Searching...</span>
          )}
          {searchError && (
            <span className="text-[10px] text-yellow-600 dark:text-yellow-400 truncate">{searchError}</span>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modelReady ? 'Type a message...' : 'Load model first'}
            disabled={!modelReady}
            rows={2}
            className="flex-1 resize-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <div className="flex flex-col gap-1">
            {isGenerating ? (
              <button
                onClick={interrupt}
                className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !modelReady || isSearching}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                Send
              </button>
            )}
            {messages.length > 0 && !isGenerating && (
              <button
                onClick={clearAll}
                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={`Storage: ${formatBytes(bytesInUse)}`}
              >
                Clear ({formatBytes(bytesInUse)})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
