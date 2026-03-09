import { useState } from 'react';
import type { TabId } from '../shared/types';
import { useModelStatus } from './hooks/useModelStatus';
import { useTheme } from './hooks/useTheme';
import ModelStatus from './components/ModelStatus';
import ChatTab from './components/ChatTab';
import SummarizeTab from './components/SummarizeTab';
import WriteTab from './components/WriteTab';
import DocumentChatTab from './components/DocumentChatTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'write', label: 'Write' },
  { id: 'doc-chat', label: 'Doc Chat' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const { status, progress, errorMsg, models, selectedModel, setSelectedModel, retry, pullModel } = useModelStatus();
  const { theme, toggle } = useTheme();

  const modelReady = status === 'ready';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold">Local LLM</h1>
          <button
            onClick={toggle}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Model status */}
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
        {activeTab === 'chat' && (
          <ChatTab modelReady={modelReady} selectedModel={selectedModel} />
        )}
        {activeTab === 'summarize' && (
          <SummarizeTab modelReady={modelReady} selectedModel={selectedModel} />
        )}
        {activeTab === 'write' && (
          <WriteTab modelReady={modelReady} selectedModel={selectedModel} />
        )}
        {activeTab === 'doc-chat' && (
          <DocumentChatTab modelReady={modelReady} selectedModel={selectedModel} />
        )}
      </div>
    </div>
  );
}
