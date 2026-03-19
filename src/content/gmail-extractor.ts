// Gmail content extractor
// Extracts email body and thread content from Gmail's DOM

import { domToMarkdown } from './dom-to-markdown';

/**
 * Extract emails from a Gmail thread view (single conversation open).
 * Gmail renders message bodies in .a3s.aiL containers (or .ii.gt as fallback).
 * Each message has sender/date info in header elements.
 */
function extractFromThreadView(): string {
  const parts: string[] = [];

  // Try to get thread subject
  const subjectEl = document.querySelector('h2[data-thread-perm-id], h2.hP');
  const subject = subjectEl?.textContent?.trim();
  if (subject) {
    parts.push(`# ${subject}\n`);
  }

  // Find all message containers in the thread
  // Gmail wraps each message in a div with data-message-id or class .gs
  const messages = document.querySelectorAll('.gs');

  if (messages.length > 0) {
    messages.forEach((msg, i) => {
      // Extract sender name
      const senderEl = msg.querySelector('.gD, [email]');
      const sender = senderEl?.getAttribute('name')
        || senderEl?.textContent?.trim()
        || 'Unknown';

      // Extract date
      const dateEl = msg.querySelector('.g3, .date');
      const date = dateEl?.getAttribute('title')
        || dateEl?.textContent?.trim()
        || '';

      const header = date ? `### ${sender} — ${date}` : `### ${sender}`;
      parts.push(`\n${header}\n`);

      // Extract message body
      // .a3s.aiL is the primary message body container
      const bodyEl = msg.querySelector('.a3s.aiL') || msg.querySelector('.ii.gt');
      if (bodyEl) {
        // Use domToMarkdown for the email body (standard HTML content)
        const bodyMd = domToMarkdown(bodyEl as HTMLElement);
        if (bodyMd) {
          parts.push(bodyMd);
        } else {
          // Fallback to innerText
          const text = (bodyEl as HTMLElement).innerText?.trim();
          if (text) parts.push(text);
        }
      }
    });

    if (parts.length > (subject ? 1 : 0)) {
      return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    }
  }

  return '';
}

/**
 * Simpler extraction: find any visible email body containers.
 * Works when the thread structure selectors don't match.
 */
function extractEmailBodies(): string {
  const parts: string[] = [];

  // Subject
  const subjectEl = document.querySelector('h2[data-thread-perm-id], h2.hP');
  const subject = subjectEl?.textContent?.trim();
  if (subject) parts.push(`# ${subject}\n`);

  // All visible message bodies
  const bodies = document.querySelectorAll('.a3s.aiL, .ii.gt');
  bodies.forEach((body, i) => {
    if (bodies.length > 1) parts.push(`\n### Message ${i + 1}\n`);
    const md = domToMarkdown(body as HTMLElement);
    if (md) {
      parts.push(md);
    } else {
      const text = (body as HTMLElement).innerText?.trim();
      if (text) parts.push(text);
    }
  });

  if (parts.length > (subject ? 1 : 0)) {
    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  return '';
}

/**
 * Extract from inbox/list view — subject lines and snippets.
 */
function extractFromInboxView(): string {
  const rows = document.querySelectorAll('tr.zA');
  if (rows.length === 0) return '';

  const parts: string[] = ['# Gmail Inbox\n'];

  rows.forEach(row => {
    const sender = row.querySelector('.yX.xY .yP, .yX.xY .zF')?.textContent?.trim() || '';
    const subject = row.querySelector('.y6 .bog')?.textContent?.trim() || '';
    const snippet = row.querySelector('.y2')?.textContent?.trim() || '';
    const date = row.querySelector('.xW.xY .xW')?.textContent?.trim() || '';

    if (subject || snippet) {
      const line = [sender, subject, snippet, date].filter(Boolean).join(' — ');
      parts.push(`- ${line}`);
    }
  });

  return parts.length > 1 ? parts.join('\n') : '';
}

/**
 * Fallback: innerText from the main content area.
 */
function fallbackExtract(): string {
  const selectors = [
    '[role="main"]',
    '.nH.bkK',  // Gmail main content area
    '.AO',       // Another Gmail content wrapper
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = (el as HTMLElement).innerText?.trim();
      if (text && text.length > 50) return text;
    }
  }

  return '';
}

export function extractGmail(): string {
  // Strategy 1: thread view with full message structure
  let content = extractFromThreadView();

  // Strategy 2: simpler email body extraction
  if (!content) {
    content = extractEmailBodies();
  }

  // Strategy 3: inbox list view
  if (!content) {
    content = extractFromInboxView();
  }

  // Strategy 4: fallback innerText
  if (!content) {
    content = fallbackExtract();
  }

  if (content) return content;

  console.warn('[onnx-llm] Gmail: could not extract email content');
  return '';
}
