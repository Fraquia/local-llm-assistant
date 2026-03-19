// Google Docs content extractor
// Extracts text from the Docs editor DOM structure

import { domToMarkdown } from './dom-to-markdown';

/**
 * Extract text from the Google Docs editor using kix-* class selectors.
 * Google Docs renders text in .kix-lineview spans within .kix-page containers.
 */
function extractFromKixEditor(): string {
  const pages = document.querySelectorAll('.kix-page');
  if (pages.length === 0) return '';

  const parts: string[] = [];

  for (const page of pages) {
    const lines = page.querySelectorAll('.kix-lineview');
    for (const line of lines) {
      // Check if this line is a heading
      const lineContent = line.querySelector('.kix-lineview-content');
      if (!lineContent) continue;

      const text = lineContent.textContent?.trim();
      if (!text) continue;

      // Detect heading level from parent paragraph style
      const paragraph = line.closest('.kix-paragraphrenderer');
      const headingMatch = paragraph?.className?.match(/kix-paragraphrenderer--heading(\d)/);

      if (headingMatch) {
        const level = parseInt(headingMatch[1], 10);
        const prefix = '#'.repeat(Math.min(level, 6)) + ' ';
        parts.push(`\n\n${prefix}${text}\n\n`);
      } else {
        parts.push(text);
      }
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Fallback: try to extract from the editor content area using domToMarkdown.
 * The editor area contains standard-ish HTML that the generic walker can handle.
 */
function extractFromEditorArea(): string {
  const selectors = [
    '.kix-appview-editor',
    '.docs-editor-container',
    '[role="main"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const md = domToMarkdown(el as HTMLElement);
      if (md && md.length > 20) return md;
    }
  }

  return '';
}

/**
 * Last resort: innerText from the editor area.
 */
function fallbackExtract(): string {
  const selectors = [
    '.kix-appview-editor',
    '.docs-editor-container',
    '[role="main"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = (el as HTMLElement).innerText?.trim();
      if (text && text.length > 20) return text;
    }
  }

  return '';
}

export function extractGoogleDocs(): string {
  // Strategy 1: kix-* class selectors (most reliable for Google Docs)
  let content = extractFromKixEditor();

  // Strategy 2: domToMarkdown on the editor area
  if (!content) {
    content = extractFromEditorArea();
  }

  // Strategy 3: innerText fallback
  if (!content) {
    content = fallbackExtract();
  }

  if (content) {
    return `# ${document.title}\n\n${content}`;
  }

  console.warn('[onnx-llm] Google Docs: could not extract document content');
  return '';
}
