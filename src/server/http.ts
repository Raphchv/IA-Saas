import "server-only";

/** Réponse JSON d'erreur avec un message lisible par l'utilisateur. */
export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
