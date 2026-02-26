import { useState, useRef, useEffect } from 'react';
import type { InferenceMode, BrowserModelId } from '../../shared/types';
import { BROWSER_MODELS } from '../../shared/types';

interface Props {
  mode: InferenceMode;
  browserModelId: BrowserModelId;
  onChange: (mode: InferenceMode) => void;
  onBrowserModelChange: (id: BrowserModelId) => void;
}

export default function InferenceModeToggle({ mode, browserModelId, onChange, onBrowserModelChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-1">Inference:</span>

      {/* Ollama button */}
      <button
        onClick={() => { onChange('ollama'); setDropdownOpen(false); }}
        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
          mode === 'ollama'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600'
        }`}
      >
        Ollama
      </button>

      {/* Browser button with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            if (mode !== 'browser') onChange('browser');
            setDropdownOpen(prev => !prev);
          }}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors flex items-center gap-0.5 ${
            mode === 'browser'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600'
          }`}
        >
          Browser
          <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
            {(Object.entries(BROWSER_MODELS) as [BrowserModelId, typeof BROWSER_MODELS[BrowserModelId]][]).map(([id, info]) => (
              <button
                key={id}
                onClick={() => {
                  onBrowserModelChange(id);
                  onChange('browser');
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md ${
                  browserModelId === id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{info.label}</span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500">{info.size}</span>
                </div>
                {info.note && (
                  <p className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-0.5">{info.note}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
