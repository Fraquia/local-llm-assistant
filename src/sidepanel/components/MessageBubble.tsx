import React from 'react';
import ReactMarkdown from 'react-markdown';

const ALLOWED_ELEMENTS = [
  'p', 'strong', 'em', 'del', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'br',
  'a',
];

const SAFE_URL_PROTOCOLS = /^https?:\/\//i;

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default React.memo(function MessageBubble({ role, content }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
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
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
});
