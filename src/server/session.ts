import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type CurrentUser = { id: string; name: string; email: string };

/**
 * Renvoie l'utilisateur connecté, ou null.
 * `cache` évite de relire la session plusieurs fois pendant une même requête.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

/**
 * À appeler en tête de chaque page, Server Action ou route protégée.
 * C'est LA vérification de sécurité : le proxy ne fait qu'une redirection
 * rapide et ne doit jamais être considéré comme suffisant.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
