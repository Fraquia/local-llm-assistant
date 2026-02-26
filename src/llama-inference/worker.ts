/// <reference lib="webworker" />

import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  InterruptableStoppingCriteria,
  env,
} from '@huggingface/transformers';
import type { WorkerIn, WorkerOut, ChatMessage } from '../browser-inference/types';

// Point ONNX Runtime to the local WASM files bundled with the extension.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = new URL('./', self.location.href).href;
  env.backends.onnx.wasm.numThreads = 1;
}

// HuggingFace model IDs for Llama 3.2
type Dtype = 'q4' | 'fp16' | 'q4f16' | 'q8' | 'auto';

const LLAMA_MODELS: Record<string, { id: string; dtype: Dtype }> = {
  'llama-3.2-3b': { id: 'onnx-community/Llama-3.2-3B-Instruct-ONNX', dtype: 'q4f16' },
  'llama-3.2-1b': { id: 'onnx-community/Llama-3.2-1B-Instruct-q4f16', dtype: 'q4f16' },
};

const DEFAULT_MODEL_KEY = 'llama-3.2-1b';

type DeviceType = 'webgpu' | 'wasm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTokenizer = any;

let model: AnyModel = null;
let tokenizer: AnyTokenizer = null;
let stoppingCriteria: InterruptableStoppingCriteria | null = null;

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

async function initWebGPU(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    if (!adapter) return false;

    console.log('[llama-inference] WebGPU adapter OK:', adapter.info ?? adapter);

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      },
    });
    console.log('[llama-inference] GPUDevice OK, maxBufferSize:', device.limits.maxBufferSize);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ortEnv = env.backends.onnx as any;
    if (ortEnv.webgpu) {
      ortEnv.webgpu.device = device;
    } else {
      ortEnv.webgpu = { device };
    }
    return true;
  } catch (err) {
    console.warn('[llama-inference] WebGPU init failed:', err);
    return false;
  }
}

function logLoadError(tag: string, e: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyE = e as any;
  console.warn(tag, {
    message: anyE?.message,
    raw: e,
  });
}

async function loadModel(
  hfModelId: string,
  dtype: Dtype,
): Promise<{ model: AnyModel; tokenizer: AnyTokenizer; device: DeviceType }> {
  const onProgress = makeProgressCallback();

  post({ type: 'LOAD_PROGRESS', progress: 0, status: 'Downloading tokenizer...' });
  const tok = await AutoTokenizer.from_pretrained(hfModelId, {
    progress_callback: onProgress,
  });

  const hasWebGPU = await initWebGPU();

  // Try WebGPU first
  if (hasWebGPU) {
    try {
      post({ type: 'LOAD_PROGRESS', progress: 0, status: `Loading model (WebGPU ${dtype})...` });
      const m = await AutoModelForCausalLM.from_pretrained(hfModelId, {
        dtype,
        device: 'webgpu',
        progress_callback: onProgress,
      });
      console.log(`[llama-inference] Loaded ${hfModelId} on WebGPU dtype=${dtype}`);
      return { model: m, tokenizer: tok, device: 'webgpu' };
    } catch (e) {
      logLoadError(`[llama-inference] WebGPU ${dtype} failed`, e);
      console.warn('[llama-inference] Falling back to WASM');
    }
  }

  // Fallback: WASM
  try {
    post({ type: 'LOAD_PROGRESS', progress: 0, status: `Loading model (WASM ${dtype})...` });
    const m = await AutoModelForCausalLM.from_pretrained(hfModelId, {
      dtype,
      device: 'wasm',
      progress_callback: onProgress,
    });
    console.log(`[llama-inference] Loaded ${hfModelId} on WASM dtype=${dtype}`);
    return { model: m, tokenizer: tok, device: 'wasm' };
  } catch (e) {
    logLoadError(`[llama-inference] WASM ${dtype} failed`, e);
  }

  throw new Error(
    'Impossibile caricare il modello né su WebGPU né su WASM. ' +
    'Verifica che Chrome sia aggiornato e che il dispositivo abbia memoria sufficiente, ' +
    'oppure usa la modalità Ollama.',
  );
}

async function loadModels(modelKey?: string) {
  try {
    const key = modelKey && modelKey in LLAMA_MODELS ? modelKey : DEFAULT_MODEL_KEY;
    const config = LLAMA_MODELS[key];

    const result = await loadModel(config.id, config.dtype);
    model = result.model;
    tokenizer = result.tokenizer;

    // Shader warmup
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

    let fullText = '';
    let tokenCount = 0;
    const startTime = performance.now();

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        fullText += text;
        tokenCount++;
        post({ type: 'TOKEN', token: text, state: 'answering' });
      },
    });

    await model.generate({
      input_ids: inputs.input_ids,
      attention_mask: inputs.attention_mask,
      max_new_tokens: 2048,
      do_sample: true,
      temperature: 0.6,
      top_p: 0.9,
      streamer,
      stopping_criteria: stoppingCriteria,
    });

    const elapsed = (performance.now() - startTime) / 1000;
    const tps = elapsed > 0 ? Math.round(tokenCount / elapsed) : 0;

    post({ type: 'COMPLETE', fullText, thinkingText: '', tps });
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (!msg.includes('interrupt') && !msg.includes('stop')) {
      post({ type: 'ERROR', error: msg });
    }
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'LOAD_MODELS':
      loadModels(msg.modelId);
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
