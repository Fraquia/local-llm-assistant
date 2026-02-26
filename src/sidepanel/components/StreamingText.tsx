import React from 'react';
import ReactMarkdown from 'react-markdown';

const ALLOWED_ELEMENTS = [
  'p', 'strong', 'em', 'del', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'br',
  'a',
];

const SAFE_URL_PROTOCOLS = /^https?:\/\//i;

interface Props {
  text: string;
  tps: number;
  isStreaming: boolean;
}

export default React.memo(function StreamingText({ text, tps, isStreaming }: Props) {
  return (
    <div className="px-1">
      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
        <ReactMarkdown
          skipHtml
          allowedElements={ALLOWED_ELEMENTS}
          components={{
            a: ({ href, children }) => {
              if (!href || !SAFE_URL_PROTOCOLS.test(href)) {
                return <span>{children}</span>;
              }
              return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {text || (isStreaming ? '...' : '')}
        </ReactMarkdown>
      </div>
      {isStreaming && tps > 0 && (
        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
          {tps} tok/s
        </span>
      )}
    </div>
  );
});
