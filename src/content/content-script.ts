// Content script — extracts page content as Markdown
// Vite bundles imports into a single IIFE for content script entry point

import { domToMarkdown, findContentRoot, detectSiteType } from './dom-to-markdown';
import { extractGoogleSlides } from './google-slides-extractor';
import { extractGoogleDocs } from './google-docs-extractor';
import { extractGmail } from './gmail-extractor';

const MSG_GET_PAGE_CONTENT = 'GET_PAGE_CONTENT';
const MSG_GET_SELECTED_TEXT = 'GET_SELECTED_TEXT';

const MAX_OUTPUT_CHARS = 48_000;

function extractPageText(): string {
  const siteType = detectSiteType();

  let markdown: string;
  switch (siteType) {
    case 'google-slides':
      markdown = extractGoogleSlides();
      break;
    case 'google-docs':
      markdown = extractGoogleDocs();
      break;
    case 'gmail':
      markdown = extractGmail();
      break;
    default: {
      const root = findContentRoot();
      markdown = domToMarkdown(root);
      break;
    }
  }

  if (!markdown) {
    // Safety fallback
    const text = document.body.innerText ?? '';
    return text.replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_OUTPUT_CHARS);
  }

  return markdown.slice(0, MAX_OUTPUT_CHARS);
}

function getSelectedText(): string {
  return window.getSelection()?.toString()?.trim() ?? '';
}

chrome.runtime.onMessage.addListener(
  (message: { type: string }, sender, sendResponse) => {
    // Only accept messages from our own extension
    if (sender.id !== chrome.runtime.id) return false;
    switch (message.type) {
      case 'PING':
        sendResponse({ ok: true });
        break;

      case MSG_GET_PAGE_CONTENT:
        sendResponse({ content: extractPageText(), title: document.title });
        break;

      case MSG_GET_SELECTED_TEXT:
        sendResponse({ text: getSelectedText() });
        break;
    }
    return false;
  },
);
