import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../shared/messages';
import { buildPageChatMessages, buildPageChatMessagesWithContext, buildPageChatMessagesWithSearch, buildPageChatMessagesWithContextAndSearch } from '../../shared/prompts';
import { needsRag, chunkText, embedChunks, embedQuery, retrieveTopK, type EmbeddedChunk } from '../../shared/rag';
import { searchWeb, cleanSearchQuery, optimizeSearchQuery, formatSearchContext } from '../../shared/web-search';
import { getDocumentText, getDocumentTitle } from '../../office/office-api';
import { useInference } from '../hooks/useInference';
import { useWebSearch } from '../hooks/useWebSearch';
import MessageBubble from './MessageBubble';
import StreamingText from './StreamingText';

interface ChatMessageWithId extends ChatMessage {
  id: string;
}

interface Props {
  modelReady: boolean;
  selectedModel: string;
}

export default function DocumentChatTab({ modelReady, selectedModel }: Props) {
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [input, setInput] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docError, setDocError] = useState('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddedChunks, setEmbeddedChunks] = useState<EmbeddedChunk[] | null>(null);
  const [ragWarning, setRagWarning] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { streamingText, isGenerating, tps, error, generate, interrupt } = useInference();
  const { webSearchEnabled, setWebSearchEnabled } = useWebSearch();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number>(0);

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

  const fetchDocContent = useCallback(async () => {
    setIsLoadingDoc(true);
    setDocError('');
    setEmbeddedChunks(null);
    setRagWarning('');
    try {
      const [content, title] = await Promise.all([getDocumentText(), getDocumentTitle()]);
      if (!content?.trim()) {
        setDocError('Document is empty.');
        setDocContent('');
        setDocTitle('');
        return;
      }
      setDocContent(content);
      setDocTitle(title);

      // RAG indexing for long documents
      if (needsRag(content)) {
        setIsEmbedding(true);
        try {
          const chunks = chunkText(content);
          const embeddings = await embedChunks(chunks);
          setEmbeddedChunks(chunks.map((text, i) => ({ text, embedding: embeddings[i] })));
        } catch {
          setRagWarning('Embedding model not available — using truncation fallback.');
          setEmbeddedChunks(null);
        } finally {
          setIsEmbedding(false);
        }
      }
    } catch {
      setDocError('Failed to read document. Make sure a document is open.');
      setDocContent('');
      setDocTitle('');
    } finally {
      setIsLoadingDoc(false);
    }
  }, []);

  // Auto-fetch document content on mount
  useEffect(() => {
    fetchDocContent();
  }, [fetchDocContent]);

  // When generation completes, add assistant message to history
  useEffect(() => {
    if (!isGenerating && streamingText) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === streamingText) return prev;
        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: streamingText }];
      });
    }
  }, [isGenerating, streamingText]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating || !modelReady || !docContent) return;

    const userMessage: ChatMessageWithId = { id: crypto.randomUUID(), role: 'user', content: text };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setSearchError('');

    // Optionally fetch web search results
    let searchContext = '';
    if (webSearchEnabled) {
      setIsSearching(true);
      try {
        let query: string;
        try {
          query = await optimizeSearchQuery(text, selectedModel, messages.slice(-4), docTitle);
        } catch {
          query = cleanSearchQuery(`${docTitle} ${text}`);
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

    // RAG path or truncation fallback
    if (embeddedChunks) {
      try {
        const queryEmb = await embedQuery(text);
        const topChunks = retrieveTopK(queryEmb, embeddedChunks);
        const fullMessages = searchContext
          ? buildPageChatMessagesWithContextAndSearch(topChunks, newHistory, searchContext)
          : buildPageChatMessagesWithContext(topChunks, newHistory);
        generate(fullMessages, selectedModel);
      } catch {
        const fullMessages = searchContext
          ? buildPageChatMessagesWithSearch(docContent, newHistory, searchContext)
          : buildPageChatMessages(docContent, newHistory);
        generate(fullMessages, selectedModel);
      }
    } else {
      const fullMessages = searchContext
        ? buildPageChatMessagesWithSearch(docContent, newHistory, searchContext)
        : buildPageChatMessages(docContent, newHistory);
      generate(fullMessages, selectedModel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleRefresh = () => {
    setMessages([]);
    fetchDocContent();
  };

  const hasDoc = !!docContent;

  return (
    <div className="flex flex-col h-full">
      {/* Document status bar */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        {isLoadingDoc ? (
          <span className="text-xs text-gray-400">Loading document...</span>
        ) : isEmbedding ? (
          <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">Indexing document...</span>
        ) : docError ? (
          <span className="text-xs text-red-600 dark:text-red-400">{docError}</span>
        ) : (
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1" title={docTitle}>
            {docTitle}
            {embeddedChunks && (
              <span className="ml-1.5 text-[10px] text-blue-500">({embeddedChunks.length} chunks indexed)</span>
            )}
          </span>
        )}
        {ragWarning && (
          <span className="text-[10px] text-yellow-600 dark:text-yellow-400 truncate" title={ragWarning}>truncated</span>
        )}
        <button
          onClick={handleRefresh}
          disabled={isLoadingDoc || isGenerating || isEmbedding}
          className="shrink-0 px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded transition-colors disabled:opacity-50"
        >
          Reload Document
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {!hasDoc && !isLoadingDoc && !docError && (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
            Open a document to start chatting about it.
          </p>
        )}

        {hasDoc && messages.length === 0 && !isGenerating && (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
            Ask a question about this document...
          </p>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}

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
            placeholder={
              !modelReady ? 'Load model first' :
              !hasDoc ? 'Open a document first' :
              'Ask about this document...'
            }
            disabled={!modelReady || !hasDoc || isEmbedding}
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
                disabled={!input.trim() || !modelReady || !hasDoc || isEmbedding || isSearching}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                Send
              </button>
            )}
            {messages.length > 0 && !isGenerating && (
              <button
                onClick={handleClear}
                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
