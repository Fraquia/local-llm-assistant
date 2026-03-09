import { useState } from 'react';
import { buildWriteMessages, buildWriteMessagesCustom } from '../../shared/prompts';
import { getSelectedText, replaceSelection } from '../../office/office-api';
import type { WritingAction } from '../../shared/types';
import { useInference } from '../hooks/useInference';
import { useCustomCommands } from '../hooks/useCustomCommands';
import StreamingText from './StreamingText';

interface Props {
  modelReady: boolean;
  selectedModel: string;
}

const BUILTIN_ACTIONS: { id: WritingAction; label: string }[] = [
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'improve', label: 'Improve' },
  { id: 'simplify', label: 'Simplify' },
];

export default function WriteTab({ modelReady, selectedModel }: Props) {
  const [originalText, setOriginalText] = useState('');
  const [action, setAction] = useState<string>('rewrite');
  const [copied, setCopied] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newCmdName, setNewCmdName] = useState('');
  const [newCmdPrompt, setNewCmdPrompt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const { streamingText, isGenerating, tps, error: inferenceError, onComplete, generate, interrupt } = useInference();
  const { commands, addCommand, updateCommand, removeCommand, isLoaded } = useCustomCommands();
  const [lastResult, setLastResult] = useState('');
  const [fetchError, setFetchError] = useState('');

  const displayText = isGenerating ? streamingText : (lastResult || streamingText);
  const error = fetchError || inferenceError;

  const handleGetSelection = async () => {
    setFetchError('');
    try {
      const text = await getSelectedText();
      if (text?.trim()) {
        setOriginalText(text);
      } else {
        setFetchError('No text selected. Select text in the document first.');
      }
    } catch {
      setFetchError('Failed to get selection. Make sure a document is open.');
    }
  };

  const handleRun = () => {
    if (!modelReady || !originalText.trim() || isGenerating) return;
    setFetchError('');
    setLastResult('');
    setReplaced(false);

    const customCmd = commands.find(c => c.id === action);
    const messages = customCmd
      ? buildWriteMessagesCustom(originalText, customCmd.prompt)
      : buildWriteMessages(originalText, action);
    onComplete.current = (fullText) => setLastResult(fullText);
    generate(messages, selectedModel);
  };

  const handleCopy = () => {
    if (displayText) {
      navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReplace = async () => {
    if (!displayText) return;
    try {
      await replaceSelection(displayText);
      setReplaced(true);
      setTimeout(() => setReplaced(false), 2000);
    } catch {
      setFetchError('Failed to replace selection. Select text in the document first.');
    }
  };

  const handleAddCommand = () => {
    if (!newCmdName.trim() || !newCmdPrompt.trim()) return;
    addCommand(newCmdName, newCmdPrompt);
    setNewCmdName('');
    setNewCmdPrompt('');
  };

  const handleStartEdit = (id: string) => {
    const cmd = commands.find(c => c.id === id);
    if (!cmd) return;
    setEditingId(id);
    setEditName(cmd.name);
    setEditPrompt(cmd.prompt);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim() || !editPrompt.trim()) return;
    updateCommand(editingId, editName, editPrompt);
    setEditingId(null);
  };

  const getActionLabel = (): string => {
    const builtin = BUILTIN_ACTIONS.find(a => a.id === action);
    if (builtin) return builtin.label;
    const custom = commands.find(c => c.id === action);
    return custom?.name ?? 'Run';
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
        {/* Action selector */}
        <div className="flex flex-wrap gap-1">
          {BUILTIN_ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => setAction(a.id)}
              className={`py-1 px-2 text-xs font-medium rounded-md transition-colors ${
                action === a.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {a.label}
            </button>
          ))}
          {commands.map(c => (
            <button
              key={c.id}
              onClick={() => setAction(c.id)}
              className={`py-1 px-2 text-xs font-medium rounded-md transition-colors ${
                action === c.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Text input area */}
        <textarea
          value={originalText}
          onChange={e => setOriginalText(e.target.value)}
          placeholder="Paste text or use 'Get Selection' from the document..."
          rows={4}
          className="w-full resize-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-2">
          <button
            onClick={handleGetSelection}
            className="flex-1 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Get Selection
          </button>
          <button
            onClick={isGenerating ? interrupt : handleRun}
            disabled={!modelReady || (!originalText.trim() && !isGenerating)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              isGenerating
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGenerating ? 'Stop' : getActionLabel()}
          </button>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Result */}
      <div className="flex-1 overflow-y-auto p-3">
        {displayText ? (
          <>
            <StreamingText text={displayText} tps={tps} isStreaming={isGenerating} />
            {!isGenerating && displayText && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleCopy}
                  className="py-1 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy Result'}
                </button>
                <button
                  onClick={handleReplace}
                  className="py-1 px-3 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  {replaced ? 'Replaced!' : 'Replace in Document'}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
            Select text in the document or paste text above, then choose an action
          </p>
        )}
      </div>

      {/* Custom Commands Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-between"
        >
          <span>Custom Commands ({commands.length})</span>
          <span>{showSettings ? '\u25B2' : '\u25BC'}</span>
        </button>

        {showSettings && (
          <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto">
            {/* Add new command */}
            <div className="space-y-1">
              <input
                type="text"
                value={newCmdName}
                onChange={e => setNewCmdName(e.target.value)}
                placeholder="Command name (e.g. Translate to English)"
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <textarea
                value={newCmdPrompt}
                onChange={e => setNewCmdPrompt(e.target.value)}
                placeholder="System prompt for this command..."
                rows={2}
                className="w-full resize-none px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCommand}
                disabled={!newCmdName.trim() || !newCmdPrompt.trim()}
                className="w-full py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
              >
                Add Command
              </button>
            </div>

            {/* Existing commands list */}
            {commands.map(cmd => (
              <div key={cmd.id} className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md space-y-1">
                {editingId === cmd.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <textarea
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      rows={2}
                      className="w-full resize-none px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-1">
                      <button onClick={handleSaveEdit} className="flex-1 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded transition-colors">Save</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded transition-colors">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{cmd.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(cmd.id)} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                        <button onClick={() => removeCommand(cmd.id)} className="text-[10px] text-red-600 dark:text-red-400 hover:underline">Delete</button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{cmd.prompt}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
