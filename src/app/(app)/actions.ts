"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAiEnabled } from "@/lib/env";
import { askHistory, type AskResult } from "@/server/ask";
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

const questionSchema = z.string().trim().min(3, "Votre question est trop courte.").max(1000, "Votre question est trop longue.");

export type AskState = { question: string; result?: AskResult; error?: string };

export async function askAction(_previous: AskState, formData: FormData): Promise<AskState> {
  const user = await requireUser();
  const parsed = questionSchema.safeParse(formData.get("question"));
  const question = String(formData.get("question") ?? "");
  if (!parsed.success) return { question, error: parsed.error.issues[0].message };
  if (!isAiEnabled) {
    return { question, error: "Ask my history nécessite une clé OpenAI (OPENAI_API_KEY) configurée sur le serveur." };
  }

  try {
    return { question, result: await askHistory(user.id, parsed.data) };
  } catch (error) {
    console.error("[ask] échec", error);
    return { question, error: "L'IA n'a pas pu répondre pour le moment. Veuillez réessayer." };
  }
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
