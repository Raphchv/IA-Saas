import "server-only";
import OpenAI from "openai";
import { env, isAiEnabled } from "@/lib/env";

/** Dimension des vecteurs stockés en base (colonne `vector(1536)`). */
export const EMBEDDING_DIMENSIONS = 1536;
/** Nombre de textes envoyés par requête d'embeddings. */
const EMBEDDING_BATCH_SIZE = 100;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!isAiEnabled) throw new Error("OPENAI_API_KEY n'est pas configurée.");
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 3, timeout: 60_000 });
  return client;
}

export { isAiEnabled };

/** Calcule les embeddings d'une liste de textes (par paquets). */
export async function embed(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const response = await getClient().embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    // L'API renvoie les vecteurs dans l'ordre, mais on trie par sécurité.
    for (const item of response.data.sort((a, b) => a.index - b.index)) vectors.push(item.embedding);
  }
  return vectors;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}

/** Génère une réponse textuelle à partir d'instructions et d'un message. */
export async function generate(instructions: string, input: string): Promise<string> {
  const response = await getClient().responses.create({
    model: env.OPENAI_CHAT_MODEL,
    instructions,
    input,
  });
  return response.output_text.trim();
}

/** Format attendu par pgvector : "[0.1,0.2,…]". */
export function toPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
