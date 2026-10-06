import { extractFiles } from "./archive";
import { chatgptParser } from "./chatgpt";
import type { ImportParser, ParseResult } from "./types";
import { ImportError } from "./types";

/**
 * Liste des formats d'export reconnus.
 * Pour ajouter Claude ou Gemini : créer `claude.ts` qui implémente
 * `ImportParser`, puis l'ajouter à ce tableau. Rien d'autre à modifier.
 */
const parsers: ImportParser[] = [chatgptParser];

export type ParsedArchive = ParseResult & { parser: ImportParser };

/** ZIP → fichiers utiles → détection du format → conversations normalisées. */
export function parseArchive(zip: Uint8Array): ParsedArchive {
  const files = extractFiles(zip, (path) => parsers.some((p) => p.wantsFile(path)));

  const parser = parsers.find((p) => p.canParse(files));
  if (!parser) {
    throw new ImportError(
      "Format non reconnu. Déposez le fichier ZIP tel que reçu de ChatGPT (il doit contenir conversations.json).",
    );
  }
  return { parser, ...parser.parse(files) };
}

export { ImportError } from "./types";
export type { NormalizedConversation } from "./types";
