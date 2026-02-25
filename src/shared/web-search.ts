import type { ChatMessage } from './messages';
import { chatComplete } from './ollama';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

const DDG_BASE = 'https://html.duckduckgo.com/html/';
const MAX_RESULTS = 5;
const QUERY_MAX_LENGTH = 200;

const FILLER_WORDS = /\b(please|can you|could you|tell me|what is|i want to know|i'd like to know)\b/gi;

export function cleanSearchQuery(message: string): string {
  return message
    .replace(FILLER_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, QUERY_MAX_LENGTH);
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

function isSafeUrl(url: string): boolean {
  try {
    return SAFE_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function extractUrl(href: string): string {
  // DuckDuckGo wraps URLs in redirect: //duckduckgo.com/l/?uddg=ENCODED_URL&...
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    if (uddg && isSafeUrl(uddg)) return uddg;
  } catch {
    // not a redirect URL
  }
  // Validate the original href too
  if (isSafeUrl(href)) return href;
  return '';
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const body = new URLSearchParams({ q: query });
  const response = await fetch(DDG_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const results: WebSearchResult[] = [];

  // DuckDuckGo HTML lite uses .result.results_links for web results
  // Try multiple selectors for robustness
  const resultElements = doc.querySelectorAll('.result.results_links, .result');

  for (const el of resultElements) {
    if (results.length >= MAX_RESULTS) break;

    const linkEl = el.querySelector('.result__a, a.result__a') as HTMLAnchorElement | null;
    const snippetEl = el.querySelector('.result__snippet, .result__snippet--long');

    if (!linkEl) continue;

    const title = linkEl.textContent?.trim() || '';
    const href = linkEl.getAttribute('href') || '';
    const snippet = snippetEl?.textContent?.trim() || '';

    if (!title || !href) continue;

    const url = extractUrl(href);
    if (!url) continue;

    results.push({ title, url, snippet });
  }

  // Debug: if we got HTML but no results, log it
  if (results.length === 0 && html.length > 0) {
    console.warn('[web-search] Got HTML response but parsed 0 results. HTML length:', html.length);
    console.warn('[web-search] First 500 chars:', html.slice(0, 500));
  }

  return results;
}

const QUERY_OPTIMIZER_PROMPT = `Convert the user's message into a concise web search query (3-8 words).
Output ONLY the search query, nothing else.
Extract key topics, dates, and proper nouns. Remove conversational filler.`;

export async function optimizeSearchQuery(
  userMessage: string,
  model: string,
  recentHistory?: ChatMessage[],
  pageTitle?: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: QUERY_OPTIMIZER_PROMPT },
  ];

  // Add last 4 messages (2 exchanges) as context for reference resolution
  if (recentHistory && recentHistory.length > 0) {
    const recent = recentHistory.slice(-4);
    for (const msg of recent) {
      messages.push({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content.slice(0, 200),
      });
    }
  }

  const userContent = pageTitle
    ? `[Page: "${pageTitle}"] ${userMessage}`
    : userMessage;
  messages.push({ role: 'user', content: userContent });

  try {
    const result = await chatComplete(messages, model, { num_predict: 30 });
    const cleaned = result.replace(/^["']|["']$/g, '').replace(/\n/g, ' ').trim();
    if (!cleaned) return cleanSearchQuery(userMessage);
    return cleaned.slice(0, QUERY_MAX_LENGTH);
  } catch {
    return cleanSearchQuery(userMessage);
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return '';
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join('\n\n');
}
