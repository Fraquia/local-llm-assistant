import React from 'react';
import ReactMarkdown from 'react-markdown';

const ALLOWED_ELEMENTS = [
  'p', 'strong', 'em', 'del', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'br',
  'a',
];

const SAFE_URL_PROTOCOLS = /^https?:\/\//i;

interface Source {
  num: number;
  title: string;
  url: string;
  domain: string;
}

function parseSources(content: string): { text: string; sources: Source[] } {
  const match = content.match(/\n\nSources:\n([\s\S]+?)$/);
  if (!match) return { text: content, sources: [] };

  const text = content.slice(0, match.index!);
  const sources: Source[] = [];

  for (const line of match[1].trim().split('\n')) {
    const m = line.match(/^\[(\d+)\]\s+(.+?)\s*[-–]\s*(https?:\/\/\S+)/);
    if (!m) continue;
    try {
      const url = m[3].trim();
      const domain = new URL(url).hostname.replace(/^www\./, '');
      sources.push({ num: parseInt(m[1]), title: m[2].trim(), url, domain });
    } catch {
      // skip invalid URLs
    }
  }

  return { text, sources };
}

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default React.memo(function MessageBubble({ role, content }: Props) {
  if (role === 'user') {
    return (
      <div className="mb-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  const { text, sources } = parseSources(content);

  return (
    <div className="mb-5">
      <div className="prose prose-sm dark:prose-invert max-w-none break-words px-1">
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
          {text}
        </ReactMarkdown>
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 px-1">
          {sources.map(s => (
            <a
              key={s.num}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors no-underline"
              title={s.title}
            >
              <span className="font-medium text-gray-400 dark:text-gray-500">{s.num}</span>
              <img
                src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`}
                alt=""
                className="w-4 h-4 rounded-sm"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span>{s.domain}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
});
