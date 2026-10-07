"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteAccount, deleteAllUserData, deleteConversation, toggleFavorite } from "@/server/conversations";
import { requireUser } from "@/server/session";

/**
 * Server Actions : fonctions exécutées sur le serveur, appelées depuis les
 * composants. Comme une route API, elles sont publiques : chacune revérifie
 * la session et valide ses paramètres.
 */

const idSchema = z.string().min(1).max(64);

export async function toggleFavoriteAction(conversationId: string): Promise<boolean> {
  const user = await requireUser();
  const isFavorite = await toggleFavorite(user.id, idSchema.parse(conversationId));
  revalidatePath("/", "layout");
  return isFavorite;
}

export async function deleteConversationAction(conversationId: string) {
  const user = await requireUser();
  await deleteConversation(user.id, idSchema.parse(conversationId));
  revalidatePath("/", "layout");
  redirect("/conversations");
}

export async function deleteAllDataAction() {
  const user = await requireUser();
  await deleteAllUserData(user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function deleteAccountAction() {
  const user = await requireUser();
  await deleteAccount(user.id); // supprime aussi les sessions : l'utilisateur est déconnecté
  redirect("/");
}
