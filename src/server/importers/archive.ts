import { unzipSync } from "fflate";
import type { ArchiveFile } from "./types";
import { ImportError } from "./types";

/** Taille maximale d'un fichier extrait (limite des chaînes de caractères JavaScript). */
const MAX_FILE_BYTES = 500 * 1024 * 1024;
/** Taille maximale cumulée des fichiers extraits (protection "zip bomb"). */
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

/** Un ZIP commence toujours par la signature "PK\x03\x04". */
export function isZip(data: Uint8Array): boolean {
  return data.length > 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;
}

/**
 * Extrait EN MÉMOIRE uniquement les fichiers demandés par `wants`.
 * Rien n'est écrit sur le disque : les images, audios, etc. de l'export
 * ne sont jamais décompressés.
 */
export function extractFiles(data: Uint8Array, wants: (path: string) => boolean): ArchiveFile[] {
  if (!isZip(data)) throw new ImportError("Ce fichier n'est pas une archive ZIP valide.");

  let total = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(data, {
      filter(file) {
        // Ignore dossiers, fichiers cachés macOS (__MACOSX) et chemins suspects.
        if (file.name.endsWith("/") || file.name.includes("__MACOSX") || file.name.includes("..")) return false;
        if (!wants(file.name)) return false;
        if (file.originalSize > MAX_FILE_BYTES) {
          throw new ImportError(`Le fichier ${file.name} est trop volumineux pour être importé.`);
        }
        total += file.originalSize;
        if (total > MAX_TOTAL_BYTES) throw new ImportError("L'archive décompressée est trop volumineuse.");
        return true;
      },
    });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("Impossible de lire l'archive ZIP (fichier corrompu ?).");
  }

  const decoder = new TextDecoder("utf-8");
  return Object.entries(entries).map(([path, bytes]) => ({ path, content: decoder.decode(bytes) }));
}
