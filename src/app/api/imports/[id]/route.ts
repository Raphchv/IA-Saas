import { jsonError } from "@/server/http";
import { getCurrentUser } from "@/server/session";
import { getImport } from "@/server/imports";

/** Avancement d'un import (interrogé régulièrement par la page d'import). */
export async function GET(_request: Request, ctx: RouteContext<"/api/imports/[id]">) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Non authentifié.", 401);

  const { id } = await ctx.params;
  const found = await getImport(user.id, id);
  if (!found) return jsonError("Import introuvable.", 404);

  return Response.json({
    id: found.id,
    status: found.status,
    totalConversations: found.totalConversations,
    importedConversations: found.importedConversations,
    skippedConversations: found.skippedConversations,
    totalChunks: found.totalChunks,
    indexedChunks: found.indexedChunks,
    error: found.error,
  });
}
