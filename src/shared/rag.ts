import { embed } from './ollama';
import { estimateTokens } from './prompts';

const RAG_THRESHOLD_TOKENS = 1800;
const CHUNK_TARGET_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;

export function needsRag(text: string): boolean {
  return estimateTokens(text) > RAG_THRESHOLD_TOKENS;
}

/** Split text into overlapping chunks, breaking at paragraph/sentence boundaries */
export function chunkText(text: string): string[] {
  const targetChars = CHUNK_TARGET_TOKENS * 4;
  const overlapChars = CHUNK_OVERLAP_TOKENS * 4;

  // Split into paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > targetChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Overlap: keep the tail of the current chunk
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap + '\n\n' + para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If we only got one chunk (no paragraph breaks), split by sentences
  if (chunks.length <= 1 && text.length > targetChars) {
    return chunkBySentence(text, targetChars, overlapChars);
  }

  return chunks;
}

function chunkBySentence(text: string, targetChars: number, overlapChars: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > targetChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function embedChunks(chunks: string[], model = 'nomic-embed-text'): Promise<number[][]> {
  return embed(chunks, model);
}

export async function embedQuery(query: string, model = 'nomic-embed-text'): Promise<number[]> {
  const embeddings = await embed(query, model);
  return embeddings[0];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface EmbeddedChunk {
  text: string;
  embedding: number[];
}

export function retrieveTopK(
  queryEmbedding: number[],
  chunks: EmbeddedChunk[],
  k = 3,
): string[] {
  const scored = chunks.map(chunk => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.text);
}
