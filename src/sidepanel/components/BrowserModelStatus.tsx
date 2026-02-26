import type { BrowserModelState } from '../hooks/useBrowserInference';
import type { BrowserModelId } from '../../shared/types';
import { BROWSER_MODELS } from '../../shared/types';

interface Props {
  state: BrowserModelState;
  browserModelId: BrowserModelId;
  onLoad: () => void;
}

export default function BrowserModelStatus({ state, browserModelId, onLoad }: Props) {
  const modelInfo = BROWSER_MODELS[browserModelId];
  const modelLabel = modelInfo.label;

  if (state.status === 'idle') {
    return (
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span>{modelLabel} — model not loaded</span>
        </div>
        <button
          onClick={onLoad}
          className="w-full py-1.5 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Load {modelLabel} ({modelInfo.size})
        </button>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>
            Loading {modelLabel}... {state.progress ?? 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${state.progress ?? 0}%` }}
          />
        </div>
        {state.statusMsg && (
          <p className="mt-0.5 text-[10px] text-gray-400 truncate">{state.statusMsg}</p>
        )}
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-green-700 dark:text-green-400">{modelLabel} ready</span>
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 uppercase">
          {state.device ?? 'webgpu'}
        </span>
      </div>
    );
  }

  // error
  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-xs text-red-600 dark:text-red-400">Failed to load {modelLabel}</span>
        <button
          onClick={onLoad}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
        >
          Retry
        </button>
      </div>
      {state.error && (
        <p className="mt-1 text-[10px] text-red-500 dark:text-red-400 break-all">{state.error}</p>
      )}
    </div>
  );
}
