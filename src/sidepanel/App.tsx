import { useState, useEffect } from 'react';
import { MessageType, type ExtensionMessage } from '../shared/messages';
import type { TabId } from '../shared/types';
import { useModelStatus } from './hooks/useModelStatus';
import ModelStatus from './components/ModelStatus';
import ChatTab from './components/ChatTab';
import SummarizeTab from './components/SummarizeTab';
import WriteTab from './components/WriteTab';
import PageChatTab from './components/PageChatTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'write', label: 'Write' },
  { id: 'page-chat', label: 'Page Chat' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const { status, progress, errorMsg, models, selectedModel, setSelectedModel, retry, pullModel } = useModelStatus();
  const modelReady = status === 'ready';

  // Listen for context menu actions to switch to write tab.
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type === MessageType.CONTEXT_MENU_ACTION) {
        setActiveTab('write');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold">Local LLM</h1>
        </div>

        <ModelStatus
          status={status}
          progress={progress}
          errorMsg={errorMsg}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onRetry={retry}
          onPull={pullModel}
        />

        {/* Tabs */}
        <div className="flex border-t border-gray-200 dark:border-gray-800">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatTab modelReady={modelReady} selectedModel={selectedModel} />}
        {activeTab === 'summarize' && <SummarizeTab modelReady={modelReady} selectedModel={selectedModel} />}
        {activeTab === 'write' && <WriteTab modelReady={modelReady} selectedModel={selectedModel} />}
        {activeTab === 'page-chat' && <PageChatTab modelReady={modelReady} selectedModel={selectedModel} />}
      </div>
    </div>
  );
}
