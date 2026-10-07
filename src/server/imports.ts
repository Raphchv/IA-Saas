import "server-only";
import type { ConversationSource } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { chunkConversation } from "@/server/chunking";
import { ImportError, parseArchive, type NormalizedConversation } from "@/server/importers";
import { buildSearchIndex } from "@/server/search";

/** Un import sans nouvelle depuis ce délai est considéré comme interrompu
 *  (ex : serveur redémarré pendant le traitement). */
const STALE_AFTER_MS = 15 * 60 * 1000;
const IN_PROGRESS = ["PARSING", "IMPORTING", "INDEXING"] as const;

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

    // 3. Indexation : construit l'index de recherche des nouveaux extraits.
    await db.import.update({ where: { id: importId }, data: { status: "INDEXING" } });
    await buildSearchIndex(userId, async (done, total) => {
      await db.import.update({ where: { id: importId }, data: { indexedChunks: done, totalChunks: total } });
    });

    await db.import.update({
      where: { id: importId },
      data: { status: "COMPLETED", completedAt: new Date(), error: null },
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
    // L'index de recherche de ces extraits est construit à l'étape "Indexation".
    await tx.conversationChunk.createMany({
      data: chunks.map((content, position) => ({ userId, conversationId, position, content })),
    });
  }, { timeout: 30_000 });
}
