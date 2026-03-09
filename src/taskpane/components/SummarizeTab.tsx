import { useState } from 'react';
import { buildSummarizeMessages } from '../../shared/prompts';
import { getDocumentText, getDocumentTitle } from '../../office/office-api';
import { useInference } from '../hooks/useInference';
import StreamingText from './StreamingText';

interface Props {
  modelReady: boolean;
  selectedModel: string;
}

export default function SummarizeTab({ modelReady, selectedModel }: Props) {
  const [docTitle, setDocTitle] = useState('');
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
      const [content, title] = await Promise.all([getDocumentText(), getDocumentTitle()]);

      if (!content?.trim()) {
        setFetchError('Document is empty. Open a document with content first.');
        return;
      }

      setDocTitle(title);
      const messages = buildSummarizeMessages(content);
      onComplete.current = (fullText) => setLastSummary(fullText);
      generate(messages, selectedModel);
    } catch {
      setFetchError('Failed to read document. Make sure a document is open.');
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
          {isGenerating ? 'Stop' : 'Summarize Document'}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {docTitle && (
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {docTitle}
          </h3>
        )}

        {displayText ? (
          <StreamingText text={displayText} tps={tps} isStreaming={isGenerating} />
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
            Open a document and click "Summarize Document"
          </p>
        )}
      </div>
    </div>
  );
}
