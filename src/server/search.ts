import "server-only";
import { db } from "@/lib/db";
import { embedOne, isAiEnabled, toPgVector } from "@/server/ai";

/**
 * Recherche hybride dans les extraits de conversations d'UN utilisateur :
 * - mots-clés : index plein texte PostgreSQL (trouve les termes exacts)
 * - sens : similarité entre embeddings (trouve "projet de startup" pour "idée de SaaS")
 * Les deux classements sont fusionnés (Reciprocal Rank Fusion).
 *
 * Chaque requête SQL filtre sur `userId` : impossible de lire les données d'un autre.
 */

const CANDIDATES_PER_METHOD = 50;
const RRF_K = 60;

/** Mots trop courants pour être utiles dans une recherche par mots-clés. */
const STOPWORDS = new Set(
  (
    "les des une que qui quoi dans pour par sur avec sans mes mon ma tes ton ta ses son sa nos notre vos votre leur leurs " +
    "est sont été être avoir ont fait faire cette ces cet aux comme mais plus moins tout tous très peu " +
    "j'ai ai avais avait suis étais quel quelle quels quelles quand comment pourquoi où dont " +
    "the and for with that this what which when where who why how are was were have has had you your from about into"
  ).split(" "),
);

export type RetrievedChunk = {
  id: string;
  conversationId: string;
  content: string;
  score: number;
  /** Similarité sémantique (0 à 1) si l'extrait a été trouvé par le sens. */
  similarity: number | null;
  /** Vrai si l'extrait contient des mots de la requête. */
  keywordMatch: boolean;
};

/** "Quelles idées de SaaS ?" → "quelles:* | idées:* | saas:*" (sans mots vides). */
export function toTsQuery(query: string): string | null {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  const unique = [...new Set(words)].slice(0, 12);
  return unique.length > 0 ? unique.map((word) => `${word}:*`).join(" | ") : null;
}

async function keywordCandidates(userId: string, query: string) {
  const tsQuery = toTsQuery(query);
  if (!tsQuery) return [];
  return db.$queryRaw<{ id: string; conversationId: string; content: string }[]>`
    SELECT c.id, c."conversationId", c.content
    FROM "ConversationChunk" c, to_tsquery('simple', ${tsQuery}) q
    WHERE c."userId" = ${userId} AND c."searchVector" @@ q
    ORDER BY ts_rank_cd(c."searchVector", q) DESC
    LIMIT ${CANDIDATES_PER_METHOD}`;
}

async function semanticCandidates(userId: string, query: string, minSimilarity: number) {
  if (!isAiEnabled) return [];
  const vector = toPgVector(await embedOne(query));
  return db.$queryRaw<{ id: string; conversationId: string; content: string; similarity: number }[]>`
    SELECT * FROM (
      SELECT c.id, c."conversationId", c.content,
             (1 - (c.embedding <=> ${vector}::vector))::float AS similarity
      FROM "ConversationChunk" c
      WHERE c."userId" = ${userId} AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${CANDIDATES_PER_METHOD}
    ) ranked
    WHERE similarity >= ${minSimilarity}`;
}

/** Renvoie les extraits les plus pertinents, du meilleur au moins bon. */
export async function retrieveChunks(
  userId: string,
  query: string,
  { limit, minSimilarity }: { limit: number; minSimilarity: number },
): Promise<RetrievedChunk[]> {
  const [keyword, semantic] = await Promise.all([
    keywordCandidates(userId, query),
    semanticCandidates(userId, query, minSimilarity),
  ]);

  const merged = new Map<string, RetrievedChunk>();
  const upsert = (row: { id: string; conversationId: string; content: string }, rank: number) => {
    const entry = merged.get(row.id) ?? { ...row, score: 0, similarity: null, keywordMatch: false };
    entry.score += 1 / (RRF_K + rank);
    merged.set(row.id, entry);
    return entry;
  };
  keyword.forEach((row, rank) => (upsert(row, rank).keywordMatch = true));
  semantic.forEach((row, rank) => (upsert(row, rank).similarity = row.similarity));

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export type ConversationHit = {
  id: string;
  title: string;
  lastActiveAt: Date | null;
  isFavorite: boolean;
  snippet: string;
};

/** Recherche de conversations : une ligne par conversation, avec l'extrait le plus pertinent. */
export async function searchConversations(userId: string, query: string, limit = 30): Promise<ConversationHit[]> {
  const chunks = await retrieveChunks(userId, query, { limit: 200, minSimilarity: 0.25 });

  // Garde le meilleur extrait de chaque conversation (déjà triés par score).
  const best = new Map<string, RetrievedChunk>();
  for (const chunk of chunks) if (!best.has(chunk.conversationId)) best.set(chunk.conversationId, chunk);
  const ids = [...best.keys()].slice(0, limit);
  if (ids.length === 0) return [];

  const conversations = await db.conversation.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true, title: true, lastActiveAt: true, favorite: { select: { id: true } } },
  });
  const byId = new Map(conversations.map((c) => [c.id, c]));

  return ids.flatMap((id) => {
    const conversation = byId.get(id);
    if (!conversation) return [];
    return [
      {
        id,
        title: conversation.title,
        lastActiveAt: conversation.lastActiveAt,
        isFavorite: Boolean(conversation.favorite),
        snippet: makeSnippet(best.get(id)!.content, query),
      },
    ];
  });
}

/** Extrait court centré sur le premier mot de la requête trouvé dans le texte. */
export function makeSnippet(chunkContent: string, query: string, length = 220): string {
  const text = chunkContent.replace(/^Conversation : .*\n\n/, "").replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const words = (toTsQuery(query) ?? "").split(" | ").map((w) => w.replace(":*", ""));
  const position = words.map((w) => (w ? lower.indexOf(w) : -1)).find((i) => i >= 0) ?? 0;
  const start = Math.max(0, position - 60);
  const snippet = text.slice(start, start + length);
  return `${start > 0 ? "…" : ""}${snippet}${start + length < text.length ? "…" : ""}`;
}
