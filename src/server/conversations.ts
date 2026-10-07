import "server-only";
import { db } from "@/lib/db";

/**
 * Accès aux conversations. RÈGLE : chaque fonction prend le `userId` de la
 * session et l'utilise dans le filtre `where`. Un identifiant de conversation
 * appartenant à quelqu'un d'autre se comporte exactement comme s'il n'existait pas.
 */

const PAGE_SIZE = 30;

const listItemSelect = {
  id: true,
  title: true,
  messageCount: true,
  lastActiveAt: true,
  favorite: { select: { id: true } },
} as const;

export async function countConversations(userId: string) {
  return db.conversation.count({ where: { userId } });
}

export async function getDashboardData(userId: string) {
  const [totalConversations, totalMessages, totalFavorites, lastImport, recent, favorites] = await Promise.all([
    db.conversation.count({ where: { userId } }),
    db.message.count({ where: { userId } }),
    db.favorite.count({ where: { userId } }),
    db.import.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { importedConversations: true, completedAt: true, source: true },
    }),
    db.conversation.findMany({
      where: { userId },
      orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 6,
      select: listItemSelect,
    }),
    db.conversation.findMany({
      where: { userId, favorite: { isNot: null } },
      orderBy: { favorite: { createdAt: "desc" } },
      take: 6,
      select: listItemSelect,
    }),
  ]);
  return { totalConversations, totalMessages, totalFavorites, lastImport, recent, favorites };
}

export async function listConversations(userId: string, { page = 1, favoritesOnly = false } = {}) {
  const where = { userId, ...(favoritesOnly ? { favorite: { isNot: null } } : {}) };
  const [items, total] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: listItemSelect,
    }),
    db.conversation.count({ where }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getConversation(userId: string, conversationId: string) {
  return db.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { position: "asc" }, select: { id: true, role: true, content: true, sentAt: true } },
      favorite: { select: { id: true } },
    },
  });
}

/** Ajoute ou retire des favoris. Renvoie le nouvel état. */
export async function toggleFavorite(userId: string, conversationId: string): Promise<boolean> {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, favorite: { select: { id: true } } },
  });
  if (!conversation) throw new Error("Conversation introuvable");

  if (conversation.favorite) {
    await db.favorite.delete({ where: { id: conversation.favorite.id } });
    return false;
  }
  await db.favorite.create({ data: { userId, conversationId } });
  return true;
}

export async function deleteConversation(userId: string, conversationId: string) {
  // deleteMany + userId : ne supprime rien si la conversation n'est pas à l'utilisateur.
  // Messages, extraits et favori sont supprimés en cascade.
  await db.conversation.deleteMany({ where: { id: conversationId, userId } });
}

/** Supprime toutes les données importées, mais garde le compte. */
export async function deleteAllUserData(userId: string) {
  await db.$transaction([
    db.conversation.deleteMany({ where: { userId } }),
    db.import.deleteMany({ where: { userId } }),
    db.tag.deleteMany({ where: { userId } }),
  ]);
}

/** Supprime le compte et, par cascade, absolument toutes ses données. */
export async function deleteAccount(userId: string) {
  await db.user.delete({ where: { id: userId } });
}
