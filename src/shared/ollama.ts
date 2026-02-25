import type { ChatMessage } from './messages';

const OLLAMA_BASE = 'http://localhost:11434';
export const DEFAULT_MODEL = 'llama3.2:3b';

export interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
}

export interface OllamaPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

/** List all locally available models */
export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`);
  if (res.status === 403) {
    throw new Error('Ollama blocked this request (403). Restart Ollama with: OLLAMA_ORIGINS=\'*\' ollama serve');
  }
  if (!res.ok) throw new Error(`Ollama unreachable (${res.status})`);
  const data = await res.json();
  return data.models ?? [];
}

/** Check if a specific model is available locally */
export async function isModelAvailable(model: string = DEFAULT_MODEL): Promise<boolean> {
  const models = await listModels();
  return models.some(m => m.name === model || m.name.startsWith(model.split(':')[0]));
}

/** Pull a model with streaming progress. Calls onProgress for each chunk. */
export async function pullModel(
  model: string = DEFAULT_MODEL,
  onProgress?: (response: OllamaPullResponse) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true }),
    signal,
  });

  if (res.status === 403) {
    throw new Error('Ollama blocked this request (403). Restart Ollama with: OLLAMA_ORIGINS=\'*\' ollama serve');
  }
  if (!res.ok) throw new Error(`Pull failed (${res.status})`);
  if (!res.body) throw new Error('No response body');

  await parseNDJSON<OllamaPullResponse>(res.body, (chunk) => {
    onProgress?.(chunk);
  });
}

/** Non-streaming single-response call. Returns just the content string. */
export async function chatComplete(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  options?: { num_predict?: number },
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama error (${res.status}): ${text}`);
  }
  const data: OllamaChatResponse = await res.json();
  return data.message?.content ?? '';
}

/** Stream a chat completion. Calls onToken for each chunk, returns final response. */
export async function chatStream(
  messages: ChatMessage[],
  onToken: (token: string, partialText: string) => void,
  signal?: AbortSignal,
  model: string = DEFAULT_MODEL,
): Promise<OllamaChatResponse> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama error (${res.status}): ${text}`);
  }

  if (!res.body) throw new Error('No response body');

  let fullText = '';
  let lastChunk: OllamaChatResponse | null = null;

  await parseNDJSON<OllamaChatResponse>(res.body, (chunk) => {
    lastChunk = chunk;
    if (chunk.message?.content) {
      fullText += chunk.message.content;
      onToken(chunk.message.content, fullText);
    }
  });

  if (!lastChunk) throw new Error('No response from Ollama');
  return lastChunk;
}

/** Embed text via Ollama /api/embed endpoint */
export async function embed(
  input: string | string[],
  model = 'nomic-embed-text',
): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama embed error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.embeddings;
}

/** Parse a newline-delimited JSON stream */
export async function parseNDJSON<T>(
  body: ReadableStream<Uint8Array>,
  onChunk: (parsed: T) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          onChunk(JSON.parse(trimmed));
        } catch {
          // skip malformed lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        onChunk(JSON.parse(buffer.trim()));
      } catch {
        // skip malformed trailing data
      }
    }
  } finally {
    reader.releaseLock();
  }
}
