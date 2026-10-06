/**
 * Découpe une conversation en extraits ("chunks") pour la recherche.
 *
 * Pourquoi découper ? Un embedding résume le sens d'un texte : sur une
 * conversation de 200 messages, le sens serait trop dilué. Des extraits de
 * quelques messages permettent de retrouver le passage précis qui répond
 * à une question.
 */

/** Taille visée d'un extrait, en caractères (~300 à 500 tokens). */
const TARGET_CHUNK_CHARS = 1_500;
/** Au-delà, un message seul est lui-même découpé. */
const MAX_PIECE_CHARS = 2_000;

export type ChunkInputMessage = { role: "USER" | "ASSISTANT"; content: string };

const ROLE_LABEL = { USER: "Moi", ASSISTANT: "IA" } as const;

function splitLongText(text: string): string[] {
  if (text.length <= MAX_PIECE_CHARS) return [text];
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > MAX_PIECE_CHARS) {
    // Coupe de préférence à la fin d'un paragraphe ou d'une phrase.
    const window = rest.slice(0, MAX_PIECE_CHARS);
    const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "));
    const end = cut > MAX_PIECE_CHARS / 2 ? cut + 1 : MAX_PIECE_CHARS;
    pieces.push(rest.slice(0, end).trim());
    rest = rest.slice(end);
  }
  if (rest.trim()) pieces.push(rest.trim());
  return pieces;
}

export function chunkConversation(title: string, messages: ChunkInputMessage[]): string[] {
  // Le titre est répété dans chaque extrait : il donne du contexte à la recherche.
  const header = `Conversation : ${title}\n\n`;
  const chunks: string[] = [];
  let current = "";

  for (const message of messages) {
    for (const piece of splitLongText(message.content)) {
      const line = `${ROLE_LABEL[message.role]} : ${piece}\n\n`;
      if (current && current.length + line.length > TARGET_CHUNK_CHARS) {
        chunks.push(header + current.trim());
        current = "";
      }
      current += line;
    }
  }
  if (current.trim()) chunks.push(header + current.trim());
  return chunks;
}
