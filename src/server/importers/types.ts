import type { ConversationSource } from "@/generated/prisma/enums";

/**
 * Format commun à toutes les sources (ChatGPT, et plus tard Claude, Gemini…).
 * Chaque parser convertit l'export de son fournisseur vers ce format :
 * le reste de l'application (stockage, recherche, IA) ne connaît que lui.
 */
export type NormalizedMessage = {
  role: "USER" | "ASSISTANT";
  content: string;
  sentAt: Date | null;
};

export type NormalizedConversation = {
  externalId: string;
  title: string;
  startedAt: Date | null;
  lastActiveAt: Date | null;
  messages: NormalizedMessage[];
};

/** Un fichier extrait de l'archive. */
export type ArchiveFile = { path: string; content: string };

export type ParseResult = {
  conversations: NormalizedConversation[];
  /** Conversations illisibles ou vides, ignorées sans bloquer l'import. */
  skipped: number;
};

export interface ImportParser {
  source: ConversationSource;
  /** Nom affiché à l'utilisateur. */
  label: string;
  /** Indique quels fichiers de l'archive ce parser a besoin de lire. */
  wantsFile(path: string): boolean;
  /** Vérifie que les fichiers extraits correspondent bien à ce format. */
  canParse(files: ArchiveFile[]): boolean;
  parse(files: ArchiveFile[]): ParseResult;
}

/** Erreur dont le message peut être affiché tel quel à l'utilisateur. */
export class ImportError extends Error {}
