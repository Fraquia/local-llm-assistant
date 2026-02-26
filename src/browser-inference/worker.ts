/// <reference lib="webworker" />

import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  InterruptableStoppingCriteria,
  env,
} from '@huggingface/transformers';
import type { WorkerIn, WorkerOut, ChatMessage } from './types';

// Point ONNX Runtime to the local WASM files bundled with the extension.
// The worker lives at chrome-extension://[id]/assets/worker-[hash].js so
// './' resolves to chrome-extension://[id]/assets/ — the same directory
// where vite.config.ts copies the unhashed ort-wasm-simd-threaded.* files.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = new URL('./', self.location.href).href;
  // Chrome extensions block SharedArrayBuffer (no COOP/COEP headers),
  // which ORT needs for multi-threaded WASM. Force single-thread to avoid
  // the silent undefined error that comes from a failed SAB initialization.
  env.backends.onnx.wasm.numThreads = 1;
}

const MODEL_ID = 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX';

// WebGPU supports only q4 and fp16 — q8 is not available in browser environments.
const DTYPES = ['q4', 'fp16'] as const;
type Dtype = (typeof DTYPES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTokenizer = any;

let model: AnyModel = null;
let tokenizer: AnyTokenizer = null;
let stoppingCriteria: InterruptableStoppingCriteria | null = null;

// Token IDs for <think> / </think> detection — resolved after tokenizer loads
let startThinkingTokenId: number | null = null;
let endThinkingTokenId: number | null = null;

function post(msg: WorkerOut) {
  self.postMessage(msg);
}

function makeProgressCallback() {
  return (data: { status: string; progress?: number; file?: string; name?: string }) => {
    if (data.status === 'initiate' || data.status === 'download') {
      post({
        type: 'LOAD_PROGRESS',
        progress: 0,
        status: data.file ?? data.name ?? 'Connecting...',
      });
    } else if (data.status === 'progress' && data.progress != null) {
      post({
        type: 'LOAD_PROGRESS',
        progress: Math.round(data.progress),
        status: data.file ?? data.name ?? 'Downloading...',
      });
    }
  };
}

type DeviceType = 'webgpu' | 'wasm';

/**
 * Initialize WebGPU with maximum device limits and inject the device into ORT.
 *
 * The default `requestDevice()` gives conservative minimums (e.g. maxBufferSize
 * = 256 MB) which are too small for LLM weight tensors. We request the adapter's
 * actual limits so ORT can allocate the buffers it needs.
 *
 * Returns true if a usable device was created and injected.
 */
async function initWebGPU(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    if (!gpu) {
      console.warn('[browser-inference] navigator.gpu not available');
      return false;
    }
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      console.warn('[browser-inference] No WebGPU adapter');
      return false;
    }
    console.log('[browser-inference] WebGPU adapter OK:', adapter.info ?? adapter);
    console.log('[browser-inference] Adapter max limits:', {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    });

    // Request device with the adapter's maximum limits instead of conservative
    // defaults. This is safe — we're just using what the GPU actually supports.
    const device = await adapter.requestDevice({
      requiredLimits: {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      },
    });
    console.log('[browser-inference] GPUDevice OK with maxBufferSize:', device.limits.maxBufferSize);

    // Inject the device into ORT's WebGPU backend so it reuses our device
    // with the higher limits instead of creating its own with defaults.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ortEnv = env.backends.onnx as any;
    if (ortEnv.webgpu) {
      ortEnv.webgpu.device = device;
    } else {
      ortEnv.webgpu = { device };
    }

    return true;
  } catch (err) {
    console.warn('[browser-inference] WebGPU init failed:', err);
    return false;
  }
}

function logLoadError(tag: string, e: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyE = e as any;
  console.warn(tag, {
    type: Object.prototype.toString.call(e),
    constructor: anyE?.constructor?.name,
    message: anyE?.message,
    reason: anyE?.reason,
    cause: anyE?.cause,
    stack: anyE?.stack,
    raw: e,
  });
}

async function loadModel(): Promise<{ model: AnyModel; tokenizer: AnyTokenizer; device: DeviceType }> {
  const onProgress = makeProgressCallback();

  post({ type: 'LOAD_PROGRESS', progress: 0, status: 'Downloading tokenizer...' });
  const tok = await AutoTokenizer.from_pretrained(MODEL_ID, {
    progress_callback: onProgress,
  });

  const hasWebGPU = await initWebGPU();

  // Try WebGPU first with each dtype (lightest first)
  if (hasWebGPU) {
    for (const dtype of DTYPES) {
      try {
        post({ type: 'LOAD_PROGRESS', progress: 0, status: `Loading model (WebGPU ${dtype})...` });
        const m = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
          dtype: dtype as Dtype,
          device: 'webgpu',
          progress_callback: onProgress,
        });
        console.log(`[browser-inference] Loaded ${MODEL_ID} on WebGPU dtype=${dtype}`);
        return { model: m, tokenizer: tok, device: 'webgpu' };
      } catch (e) {
        logLoadError(`[browser-inference] WebGPU ${dtype} failed`, e);
      }
    }
    console.warn('[browser-inference] All WebGPU dtypes failed, falling back to CPU/WASM');
  }

  // Fallback: WASM with each dtype
  for (const dtype of DTYPES) {
    try {
      post({ type: 'LOAD_PROGRESS', progress: 0, status: `Loading model (WASM ${dtype})...` });
      const m = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
        dtype: dtype as Dtype,
        device: 'wasm',
        progress_callback: onProgress,
      });
      console.log(`[browser-inference] Loaded ${MODEL_ID} on WASM dtype=${dtype}`);
      return { model: m, tokenizer: tok, device: 'wasm' };
    } catch (e) {
      logLoadError(`[browser-inference] WASM ${dtype} failed`, e);
    }
  }

  throw new Error(
    'Impossibile caricare il modello né su WebGPU né su CPU. ' +
    'Verifica che Chrome sia aggiornato e che il dispositivo abbia memoria sufficiente, ' +
    'oppure usa la modalità Ollama.',
  );
}

function resolveThinkTokenIds(tok: AnyTokenizer): void {
  try {
    const ids: number[] = tok.encode('<think></think>', { add_special_tokens: false });
    if (ids.length >= 2) {
      startThinkingTokenId = ids[0];
      endThinkingTokenId = ids[1];
      console.log('[browser-inference] think token IDs:', { start: startThinkingTokenId, end: endThinkingTokenId });
    }
  } catch (err) {
    console.warn('[browser-inference] Could not resolve <think> token IDs:', err);
  }
}

async function loadModels() {
  try {
    const result = await loadModel();
    model = result.model;
    tokenizer = result.tokenizer;

    resolveThinkTokenIds(tokenizer);

    // Warmup — for WebGPU this pre-compiles shader pipelines so the first
    // real inference doesn't stall. For CPU it warms the WASM runtime.
    const warmupLabel = result.device === 'webgpu' ? 'Compiling shaders...' : 'Warming up...';
    post({ type: 'LOAD_PROGRESS', progress: 100, status: warmupLabel });
    const warmupInputs = tokenizer('a');
    await model.generate({ ...warmupInputs, max_new_tokens: 1 });

    post({ type: 'LOAD_COMPLETE', device: result.device });
  } catch (err) {
    post({ type: 'LOAD_ERROR', error: (err as Error).message });
  }
}

async function runGenerate(messages: ChatMessage[]) {
  if (!model || !tokenizer) {
    post({ type: 'ERROR', error: 'Model not loaded' });
    return;
  }

  stoppingCriteria = new InterruptableStoppingCriteria();

  try {
    const inputs = tokenizer.apply_chat_template(messages, {
      tokenize: true,
      add_generation_prompt: true,
      return_dict: true,
    });

    let state: 'thinking' | 'answering' = 'answering';
    let thinkingText = '';
    let answerText = '';
    let tokenCount = 0;
    const startTime = performance.now();

    const token_callback_function = (tokens: bigint[]) => {
      const tokenId = Number(tokens[0]);
      if (startThinkingTokenId != null && tokenId === startThinkingTokenId) {
        state = 'thinking';
      } else if (endThinkingTokenId != null && tokenId === endThinkingTokenId) {
        state = 'answering';
      }
    };

    const callback_function = (text: string) => {
      tokenCount++;
      if (state === 'thinking') {
        thinkingText += text;
      } else {
        answerText += text;
      }
      post({ type: 'TOKEN', token: text, state });
    };

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    await model.generate({
      input_ids: inputs.input_ids,
      attention_mask: inputs.attention_mask,
      max_new_tokens: 16384,
      do_sample: true,
      temperature: 0.05,
      top_p: 0.1,
      repetition_penalty: 1.05,
      streamer,
      stopping_criteria: stoppingCriteria,
    });

    const elapsed = (performance.now() - startTime) / 1000;
    const tps = elapsed > 0 ? Math.round(tokenCount / elapsed) : 0;

    post({ type: 'COMPLETE', fullText: answerText, thinkingText: thinkingText.trim(), tps });
  } catch (err) {
    const msg = (err as Error).message ?? '';
    // Ignore errors caused by user-triggered interruption
    if (!msg.includes('interrupt') && !msg.includes('stop')) {
      post({ type: 'ERROR', error: msg });
    }
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'LOAD_MODELS':
      loadModels();
      break;
    case 'GENERATE':
      runGenerate(msg.messages);
      break;
    case 'INTERRUPT':
      stoppingCriteria?.interrupt();
      break;
    case 'RESET':
      stoppingCriteria?.reset();
      break;
  }
});
