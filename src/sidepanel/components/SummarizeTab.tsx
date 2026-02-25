import { useState } from 'react';
import { MessageType } from '../../shared/messages';
import { buildSummarizeMessages } from '../../shared/prompts';
import { useInference } from '../hooks/useInference';
import StreamingText from './StreamingText';

interface Props {
  modelReady: boolean;
  selectedModel: string;
}

export default function SummarizeTab({ modelReady, selectedModel }: Props) {
  const [pageTitle, setPageTitle] = useState('');
  const { streamingText, isGenerating, tps, error: inferenceError, onComplete, generate, interrupt } = useInference();
  const [lastSummary, setLastSummary] = useState('');
  const [fetchError, setFetchError] = useState('');

  const displayText = isGenerating ? streamingText : (lastSummary || streamingText);
  const error = fetchError || inferenceError;

  const handleSummarize = async () => {
    if (!modelReady || isGenerating) return;
    setFetchError('');
    setLastSummary('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_PAGE_CONTENT,
      });

      if (response?.error) {
        setFetchError(response.error);
        return;
      }

      if (!response?.content) {
        setFetchError('Could not extract page content.');
        return;
      }

      setPageTitle(response.title || 'Untitled');
      const messages = buildSummarizeMessages(response.content);
      onComplete.current = (fullText) => setLastSummary(fullText);
      generate(messages, selectedModel);
    } catch {
      setFetchError('Failed to communicate with page. Try refreshing.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={isGenerating ? interrupt : handleSummarize}
          disabled={!modelReady}
          className={`w-full py-2 px-4 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
            isGenerating
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isGenerating ? 'Stop' : 'Summarize This Page'}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {pageTitle && (
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {pageTitle}
          </h3>
        )}

        {displayText ? (
          <StreamingText text={displayText} tps={tps} isStreaming={isGenerating} />
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
            Navigate to any page and click "Summarize This Page"
          </p>
        )}
      </div>
    </div>
  );
}
