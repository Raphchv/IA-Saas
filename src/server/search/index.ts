import "server-only";
import { db } from "@/lib/db";
import {
  makeSnippet,
  parseQuery,
  relevanceLevel,
  scoreConversation,
  highlight,
  type ParsedQuery,
  type Relevance,
  type Segment,
} from "./engine";
import { maskRoleLabels, normalize, toNfc } from "./text";

/**
 * Recherche dans les conversations d'UN utilisateur, sans IA ni service externe :
 * - PostgreSQL trouve rapidement les extraits candidats (index plein texte) ;
 * - engine.ts calcule ensuite un score précis et choisit l'extrait à afficher.
 *
 * Chaque requête filtre sur `userId` : un utilisateur ne peut jamais obtenir
 * les conversations d'un autre.
 */

const MAX_CANDIDATE_CHUNKS = 500;
const MAX_RESULTS = 30;
const INDEX_BATCH_SIZE = 500;

/** Retire l'en-tête "Conversation : titre" ajouté à chaque extrait (voir chunking.ts). */
function chunkBody(content: string) {
  return content.replace(/^Conversation : .*\n\n/, "");
}

// ─── Index de recherche ──────────────────────────────────────

/**
 * Construit l'index plein texte des extraits qui n'en ont pas encore
 * (nouvel import, ou index remis à zéro par une mise à jour).
 * Le texte est indexé sans accents ni majuscules, comme les recherches.
 */
export async function buildSearchIndex(userId: string, onProgress?: (done: number, total: number) => Promise<void>) {
  const [{ total }] = await db.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM "ConversationChunk"
    WHERE "userId" = ${userId} AND "searchVector" IS NULL`;
  let done = 0;
  while (done < total) {
    const page = await db.$queryRaw<{ id: string; content: string }[]>`
      SELECT id, content FROM "ConversationChunk"
      WHERE "userId" = ${userId} AND "searchVector" IS NULL
      LIMIT ${INDEX_BATCH_SIZE}`;
    if (page.length === 0) break;
    await db.$executeRaw`
      UPDATE "ConversationChunk" AS c SET "searchVector" = to_tsvector('simple', v.text)
      FROM unnest(${page.map((c) => c.id)}::text[], ${page.map((c) => maskRoleLabels(normalize(toNfc(c.content))))}::text[]) AS v(id, text)
      WHERE c.id = v.id AND c."userId" = ${userId}`;
    done += page.length;
    await onProgress?.(done, total);
  }
  return total;
}

// ─── Recherche ───────────────────────────────────────────────

export type SearchResult = {
  id: string;
  title: Segment[];
  lastActiveAt: Date | null;
  isFavorite: boolean;
  relevance: Relevance;
  snippet: Segment[];
};

export type SearchOutcome = { query: ParsedQuery; results: SearchResult[] };

export async function searchConversations(userId: string, input: string): Promise<SearchOutcome> {
  const query = parseQuery(input);
  if (!query.tsQuery) return { query, results: [] };

  // Rattrape un index manquant (ex : données importées avant une mise à jour).
  await buildSearchIndex(userId);

  // 1. Extraits candidats : contiennent au moins un des termes (ou terme associé).
  const candidates = await db.$queryRaw<{ conversationId: string; content: string }[]>`
    SELECT c."conversationId", c.content
    FROM "ConversationChunk" c, to_tsquery('simple', ${query.tsQuery}) q
    WHERE c."userId" = ${userId} AND c."searchVector" @@ q
    ORDER BY ts_rank(c."searchVector", q) DESC
    LIMIT ${MAX_CANDIDATE_CHUNKS}`;
  if (candidates.length === 0) return { query, results: [] };

  const chunksByConversation = new Map<string, string[]>();
  for (const { conversationId, content } of candidates) {
    const list = chunksByConversation.get(conversationId) ?? [];
    list.push(chunkBody(content));
    chunksByConversation.set(conversationId, list);
  }

  const conversations = await db.conversation.findMany({
    where: { userId, id: { in: [...chunksByConversation.keys()] } },
    select: { id: true, title: true, lastActiveAt: true, favorite: { select: { id: true } } },
  });

  // 2. Score précis de chaque conversation, puis classement.
  const scored = conversations
    .map((conversation) => {
      const chunks = chunksByConversation.get(conversation.id) ?? [];
      return { conversation, chunks, result: scoreConversation(query, conversation.title, chunks) };
    })
    .filter(({ result }) => result.qualifies)
    .sort(
      (a, b) =>
        b.result.score - a.result.score ||
        (b.conversation.lastActiveAt?.getTime() ?? 0) - (a.conversation.lastActiveAt?.getTime() ?? 0),
    )
    .slice(0, MAX_RESULTS);

  const bestScore = scored[0]?.result.score ?? 0;
  return {
    query,
    results: scored.map(({ conversation, chunks, result }) => ({
      id: conversation.id,
      title: highlight(conversation.title, query.terms),
      lastActiveAt: conversation.lastActiveAt,
      isFavorite: Boolean(conversation.favorite),
      relevance: relevanceLevel(result, bestScore),
      snippet: makeSnippet(chunks[result.bestChunk] ?? "", query.terms),
    })),
  };
}

export { highlight, parseQuery, type Segment } from "./engine";
