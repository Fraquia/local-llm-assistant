import { MessageType, type ExtensionMessage } from '../shared/messages';
import type { CustomWritingCommand } from '../shared/types';
import { STORAGE_KEYS } from '../shared/types';

/** Inject content script into a tab if it isn't already running */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js'],
    });
  }
}

/** Rebuild all context menus (built-in + custom commands) */
async function rebuildContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();

  // Built-in actions
  chrome.contextMenus.create({
    id: 'rewrite',
    title: 'Rewrite with LLM',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'improve',
    title: 'Improve with LLM',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'simplify',
    title: 'Simplify with LLM',
    contexts: ['selection'],
  });

  // Custom commands from storage
  const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_COMMANDS);
  const commands: CustomWritingCommand[] = result[STORAGE_KEYS.CUSTOM_COMMANDS] ?? [];

  if (commands.length > 0) {
    chrome.contextMenus.create({
      id: 'custom-separator',
      type: 'separator',
      contexts: ['selection'],
    });

    for (const cmd of commands) {
      chrome.contextMenus.create({
        id: cmd.id,
        title: `${cmd.name} with LLM`,
        contexts: ['selection'],
      });
    }
  }
}

// Set up context menus and network rules on install
chrome.runtime.onInstalled.addListener(() => {
  rebuildContextMenus();

  // Remove Origin header for DuckDuckGo requests so they don't get 403'd
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [
          { header: 'Origin', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
          { header: 'Referer', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
        ],
      },
      condition: {
        urlFilter: '||html.duckduckgo.com',
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
      },
    }],
  });
});

// Rebuild menus on service worker wake (menus don't persist across SW restarts)
rebuildContextMenus();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || !tab?.id) return;

  const action = info.menuItemId as string;
  if (action === 'custom-separator') return;

  await chrome.sidePanel.open({ tabId: tab.id });

  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: MessageType.CONTEXT_MENU_ACTION,
      payload: { action, text: info.selectionText },
    }).catch(() => {});
  }, 500);
});

// Open side panel on action click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Message router
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  switch (message.type) {
    case MessageType.GET_PAGE_CONTENT:
    case MessageType.GET_SELECTED_TEXT:
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          sendResponse({ error: 'No active tab' });
          return;
        }
        try {
          await ensureContentScript(tabId);
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: 'Could not reach page. Try refreshing.' });
            } else {
              sendResponse(response);
            }
          });
        } catch {
          sendResponse({ error: 'Cannot access this page (restricted URL).' });
        }
      });
      return true;

    case MessageType.REBUILD_CONTEXT_MENUS:
      rebuildContextMenus();
      return false;

    default:
      return false;
  }
});
