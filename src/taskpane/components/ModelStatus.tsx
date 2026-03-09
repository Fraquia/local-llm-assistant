import type { ModelStatus as ModelStatusType } from '../../shared/types';
import type { OllamaModel } from '../../shared/ollama';

interface Props {
  status: ModelStatusType;
  progress: number;
  errorMsg: string | null;
  models: OllamaModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  onRetry: () => void;
  onPull: () => void;
}

export default function ModelStatus({ status, progress, errorMsg, models, selectedModel, onModelChange, onRetry, onPull }: Props) {
  if (status === 'ready') {
    return (
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-700 dark:text-green-400">Connected</span>
          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => onModelChange(e.target.value)}
              className="ml-auto text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {models.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>Connecting to Ollama...</span>
      </div>
    );
  }

  if (status === 'pulling') {
    return (
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>Downloading {selectedModel}... {progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === 'model_not_found') {
    return (
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Model "{selectedModel}" not found locally</span>
        </div>
        <button
          onClick={onPull}
          className="w-full py-1.5 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Download {selectedModel}
        </button>
      </div>
    );
  }

  // error
  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-xs text-red-600 dark:text-red-400">Ollama not reachable</span>
        <button
          onClick={onRetry}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
        >
          Retry
        </button>
      </div>
      {errorMsg && (
        <p className="mt-1 text-[10px] text-red-500 dark:text-red-400 break-all">{errorMsg}</p>
      )}
    </div>
  );
}
