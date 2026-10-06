import { after } from "next/server";
import { env } from "@/lib/env";
import { jsonError } from "@/server/http";
import { getCurrentUser } from "@/server/session";
import { createImport, findActiveImport, processImport } from "@/server/imports";

// Laisse le temps de traiter les gros exports (pris en compte sur les hébergeurs qui le supportent).
export const maxDuration = 800;

/**
 * Reçoit le ZIP d'export (corps brut de la requête, pas de formulaire),
 * crée l'import puis lance le traitement en arrière-plan.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Non authentifié.", 401);

  if (await findActiveImport(user.id)) {
    return jsonError("Un import est déjà en cours. Attends qu'il se termine.", 409);
  }

  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  const tooLarge = `Fichier trop volumineux (maximum ${env.MAX_UPLOAD_MB} Mo).`;
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > maxBytes) return jsonError(tooLarge, 413);

  const fileName = decodeFileName(request.headers.get("x-file-name"));
  if (!fileName.toLowerCase().endsWith(".zip")) return jsonError("Le fichier doit être un .zip.", 400);

  // Lecture du corps en mémoire, en s'arrêtant dès que la limite est dépassée
  // (on ne fait pas confiance à l'en-tête Content-Length).
  const data = await readBody(request, maxBytes);
  if (data === "too-large") return jsonError(tooLarge, 413);
  if (data.length === 0) return jsonError("Le fichier est vide.", 400);

  const created = await createImport(user.id, fileName, data.length);
  after(() => processImport(created.id, user.id, data));

  return Response.json({ id: created.id }, { status: 202 });
}

async function readBody(request: Request, maxBytes: number): Promise<Uint8Array | "too-large"> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      return "too-large";
    }
    parts.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return data;
}

function decodeFileName(header: string | null): string {
  try {
    return header ? decodeURIComponent(header) : "export.zip";
  } catch {
    return "export.zip";
  }
}
