import "server-only";
import type { ConversationSource } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { embed, isAiEnabled, toPgVector } from "@/server/ai";
import { chunkConversation } from "@/server/chunking";
import { ImportError, parseArchive, type NormalizedConversation } from "@/server/importers";

/** Un import sans nouvelle depuis ce délai est considéré comme interrompu
 *  (ex : serveur redémarré pendant le traitement). */
const STALE_AFTER_MS = 15 * 60 * 1000;
const IN_PROGRESS = ["PARSING", "IMPORTING", "INDEXING"] as const;
const EMBEDDING_PAGE_SIZE = 200;

// ─── Lecture ─────────────────────────────────────────────────

/** Renvoie un import de l'utilisateur (jamais celui d'un autre). */
export async function getImport(userId: string, importId: string) {
  const found = await db.import.findFirst({ where: { id: importId, userId } });
  if (found && isStale(found)) {
    return db.import.update({
      where: { id: found.id },
      data: { status: "FAILED", error: "L'import a été interrompu. Veuillez réessayer." },
    });
  }
  return found;
}

/** Import en cours pour cet utilisateur, s'il y en a un. */
export async function findActiveImport(userId: string) {
  const active = await db.import.findFirst({
    where: { userId, status: { in: [...IN_PROGRESS] } },
    orderBy: { createdAt: "desc" },
  });
  return active && !isStale(active) ? active : null;
}

function isStale(item: { status: string; updatedAt: Date }) {
  return (
    (IN_PROGRESS as readonly string[]).includes(item.status) &&
    Date.now() - item.updatedAt.getTime() > STALE_AFTER_MS
  );
}

// ─── Traitement ──────────────────────────────────────────────

export async function createImport(userId: string, fileName: string, fileSize: number) {
  return db.import.create({ data: { userId, fileName: fileName.slice(0, 255), fileSize } });
}

/**
 * Traite un export complet : analyse → enregistrement → indexation.
 * Lancé en arrière-plan ; l'avancement est écrit dans la table Import
 * et lu par la page d'import.
 *
 * `zip` n'existe qu'en mémoire : il est libéré dès la fin de l'analyse
 * et n'est jamais écrit sur le disque.
 */
export async function processImport(importId: string, userId: string, zip: Uint8Array) {
  try {
    // 1. Analyse du fichier
    const { parser, conversations, skipped } = parseArchive(zip);
    await db.import.update({
      where: { id: importId },
      data: {
        source: parser.source,
        status: "IMPORTING",
        totalConversations: conversations.length,
        skippedConversations: skipped,
      },
    });

    // 2. Enregistrement des conversations
    let saved = 0;
    for (const conversation of conversations) {
      await saveConversation(userId, importId, parser.source, conversation);
      saved++;
      if (saved % 25 === 0 || saved === conversations.length) {
        await db.import.update({ where: { id: importId }, data: { importedConversations: saved } });
      }
    }

    // 3. Indexation (embeddings) : un échec ici ne fait pas perdre l'import.
    let warning: string | null = null;
    if (isAiEnabled) {
      await db.import.update({ where: { id: importId }, data: { status: "INDEXING" } });
      try {
        await indexPendingChunks(userId, importId);
      } catch (error) {
        console.error(`[import ${importId}] indexation échouée`, error);
        warning =
          "Vos conversations sont importées, mais la recherche intelligente n'a pas pu être préparée. La recherche par mots-clés fonctionne.";
      }
    }

    await db.import.update({
      where: { id: importId },
      data: { status: "COMPLETED", completedAt: new Date(), error: warning },
    });
  } catch (error) {
    if (!(error instanceof ImportError)) console.error(`[import ${importId}] échec`, error);
    const message =
      error instanceof ImportError ? error.message : "Une erreur inattendue est survenue pendant l'import.";
    await db.import
      .update({ where: { id: importId }, data: { status: "FAILED", error: message } })
      .catch(() => {});
  }
}

/**
 * Crée ou met à jour une conversation. Réimporter le même export ne crée
 * pas de doublons ; une conversation qui a reçu de nouveaux messages depuis
 * le dernier import est mise à jour (ses favoris sont conservés).
 */
async function saveConversation(
  userId: string,
  importId: string,
  source: ConversationSource,
  conversation: NormalizedConversation,
) {
  const key = { userId_source_externalId: { userId, source, externalId: conversation.externalId } };
  const existing = await db.conversation.findUnique({
    where: key,
    select: { id: true, messageCount: true, lastActiveAt: true },
  });
  const unchanged =
    existing &&
    existing.messageCount === conversation.messages.length &&
    existing.lastActiveAt?.getTime() === conversation.lastActiveAt?.getTime();
  if (unchanged) return;

  const chunks = chunkConversation(conversation.title, conversation.messages);
  const fields = {
    title: conversation.title,
    startedAt: conversation.startedAt,
    lastActiveAt: conversation.lastActiveAt,
    messageCount: conversation.messages.length,
    importId,
  };

  await db.$transaction(async (tx) => {
    const { id: conversationId } = await tx.conversation.upsert({
      where: key,
      create: { userId, source, externalId: conversation.externalId, ...fields },
      update: fields,
      select: { id: true },
    });
    // Mise à jour = on remplace les messages et extraits existants.
    await tx.message.deleteMany({ where: { conversationId, userId } });
    await tx.conversationChunk.deleteMany({ where: { conversationId, userId } });

    await tx.message.createMany({
      data: conversation.messages.map((message, position) => ({
        userId,
        conversationId,
        position,
        role: message.role,
        content: message.content,
        sentAt: message.sentAt,
      })),
    });
    await tx.conversationChunk.createMany({
      data: chunks.map((content, position) => ({ userId, conversationId, position, content })),
    });
    // Index plein texte (colonne gérée en SQL, voir schema.prisma).
    await tx.$executeRaw`
      UPDATE "ConversationChunk" SET "searchVector" = to_tsvector('simple', content)
      WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}`;
  }, { timeout: 30_000 });
}

/** Calcule les embeddings de tous les extraits de l'utilisateur qui n'en ont pas encore. */
async function indexPendingChunks(userId: string, importId: string) {
  const [{ count }] = await db.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "ConversationChunk"
    WHERE "userId" = ${userId} AND embedding IS NULL`;
  await db.import.update({ where: { id: importId }, data: { totalChunks: count, indexedChunks: 0 } });

  let indexed = 0;
  while (true) {
    const page = await db.$queryRaw<{ id: string; content: string }[]>`
      SELECT id, content FROM "ConversationChunk"
      WHERE "userId" = ${userId} AND embedding IS NULL
      ORDER BY id LIMIT ${EMBEDDING_PAGE_SIZE}`;
    if (page.length === 0) break;

    const vectors = await embed(page.map((chunk) => chunk.content));
    await db.$executeRaw`
      UPDATE "ConversationChunk" AS c SET embedding = v.embedding::vector
      FROM unnest(${page.map((chunk) => chunk.id)}::text[], ${vectors.map(toPgVector)}::text[]) AS v(id, embedding)
      WHERE c.id = v.id AND c."userId" = ${userId}`;

    indexed += page.length;
    await db.import.update({ where: { id: importId }, data: { indexedChunks: indexed } });
  }
}
