import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  ArchiveFile,
  ImportParser,
  NormalizedConversation,
  NormalizedMessage,
  ParseResult,
} from "./types";
import { ImportError } from "./types";

/**
 * Parser de l'export ChatGPT (Paramètres → Gestion des données → Exporter).
 *
 * Le ZIP contient `conversations.json` (parfois découpé en plusieurs fichiers
 * `conversations-000.json`…) : un tableau de conversations. Chaque conversation
 * stocke ses messages dans `mapping`, un arbre où chaque nœud pointe vers son
 * parent. Les branches viennent des réponses régénérées ou des messages modifiés ;
 * on reconstitue la version affichée en remontant depuis `current_node`.
 *
 * Les schémas sont volontairement permissifs : OpenAI modifie le format
 * sans prévenir, on ne lit que les champs indispensables.
 */

const MAX_MESSAGE_LENGTH = 200_000;
const MAX_TITLE_LENGTH = 300;

const messageSchema = z.object({
  author: z.object({ role: z.string() }).passthrough(),
  create_time: z.number().nullish(),
  content: z
    .object({
      content_type: z.string(),
      parts: z.array(z.unknown()).nullish(),
      text: z.string().nullish(),
    })
    .passthrough(),
  recipient: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

const nodeSchema = z.object({
  message: z.unknown().nullish(),
  parent: z.string().nullish(),
  children: z.array(z.string()).nullish(),
});

const conversationSchema = z.object({
  id: z.string().nullish(),
  conversation_id: z.string().nullish(),
  title: z.string().nullish(),
  create_time: z.number().nullish(),
  update_time: z.number().nullish(),
  current_node: z.string().nullish(),
  mapping: z.record(z.string(), z.unknown()),
});

type RawNode = z.infer<typeof nodeSchema>;
type RawMessage = z.infer<typeof messageSchema>;

/** Types de contenu affichés à l'utilisateur. Les autres (raisonnement interne,
 *  appels d'outils, contexte système…) sont ignorés. */
const TEXT_CONTENT_TYPES = new Set(["text", "multimodal_text"]);

function toDate(seconds: number | null | undefined): Date | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

/** PostgreSQL refuse le caractère nul dans du texte. */
function clean(text: string): string {
  return text.replaceAll("\u0000", "").trim();
}

function extractText(message: RawMessage): string {
  const { content } = message;
  if (!TEXT_CONTENT_TYPES.has(content.content_type)) return "";
  const pieces: string[] = [];
  for (const part of content.parts ?? []) {
    if (typeof part === "string") pieces.push(part);
    // Les parties "objet" sont des images/fichiers ; certaines contiennent du texte.
    else if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
      pieces.push(part.text);
    }
  }
  if (pieces.length === 0 && content.text) pieces.push(content.text);
  return clean(pieces.join("\n")).slice(0, MAX_MESSAGE_LENGTH);
}

function toNormalizedMessage(raw: unknown): NormalizedMessage | null {
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const message = parsed.data;

  const role = message.author.role;
  if (role !== "user" && role !== "assistant") return null; // system, tool…
  // Un message assistant adressé à un outil (ex: "python") n'est pas une réponse.
  if (role === "assistant" && message.recipient && message.recipient !== "all") return null;
  if (message.metadata?.is_visually_hidden_from_conversation === true) return null;

  const content = extractText(message);
  if (!content) return null;

  return {
    role: role === "user" ? "USER" : "ASSISTANT",
    content,
    sentAt: toDate(message.create_time),
  };
}

/** Choisit le dernier nœud de la branche affichée. */
function findLeaf(mapping: Record<string, RawNode>, currentNode: string | null | undefined) {
  if (currentNode && mapping[currentNode]) return currentNode;
  // Pas de current_node : on prend la feuille la plus récente.
  let best: { id: string; time: number } | null = null;
  for (const [id, node] of Object.entries(mapping)) {
    if (node.children && node.children.length > 0) continue;
    const time = messageSchema.safeParse(node.message).data?.create_time ?? 0;
    if (!best || time >= best.time) best = { id, time };
  }
  return best?.id ?? null;
}

function linearize(mapping: Record<string, RawNode>, leaf: string | null): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];
  const visited = new Set<string>();
  let nodeId: string | null | undefined = leaf;
  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId); // protège contre un arbre corrompu (boucle)
    const node: RawNode | undefined = mapping[nodeId];
    if (!node) break;
    const message = toNormalizedMessage(node.message);
    if (message) messages.push(message);
    nodeId = node.parent;
  }
  return messages.reverse();
}

function parseConversation(raw: unknown): NormalizedConversation | null {
  const parsed = conversationSchema.safeParse(raw);
  if (!parsed.success) return null;
  const conv = parsed.data;

  const mapping: Record<string, RawNode> = {};
  for (const [id, node] of Object.entries(conv.mapping)) {
    const parsedNode = nodeSchema.safeParse(node);
    if (parsedNode.success) mapping[id] = parsedNode.data;
  }

  const messages = linearize(mapping, findLeaf(mapping, conv.current_node));
  if (messages.length === 0) return null;

  const title = clean(conv.title ?? "").slice(0, MAX_TITLE_LENGTH) || "Sans titre";
  const externalId =
    conv.conversation_id ??
    conv.id ??
    // Ancien format sans identifiant : empreinte stable pour éviter les doublons.
    createHash("sha256").update(`${title}|${conv.create_time}|${messages[0].content}`).digest("hex");

  return {
    externalId,
    title,
    startedAt: toDate(conv.create_time) ?? messages[0].sentAt,
    lastActiveAt: toDate(conv.update_time) ?? messages.at(-1)?.sentAt ?? null,
    messages,
  };
}

const CONVERSATIONS_FILE = /(^|\/)conversations(-\d+)?\.json$/i;

function readConversationArray(file: ArchiveFile): unknown[] | null {
  try {
    const data: unknown = JSON.parse(file.content);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export const chatgptParser: ImportParser = {
  source: "CHATGPT",
  label: "ChatGPT",

  wantsFile: (path) => CONVERSATIONS_FILE.test(path),

  canParse(files) {
    return files.some((file) => {
      if (!CONVERSATIONS_FILE.test(file.path)) return false;
      // Vérification légère sur le début du fichier, sans tout parser deux fois.
      const head = file.content.slice(0, 50_000);
      return head.trimStart().startsWith("[") && head.includes('"mapping"');
    });
  },

  parse(files): ParseResult {
    const conversations: NormalizedConversation[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    let readableFiles = 0;

    for (const file of files.filter((f) => CONVERSATIONS_FILE.test(f.path))) {
      const items = readConversationArray(file);
      if (!items) continue;
      readableFiles++;
      for (const item of items) {
        const conversation = parseConversation(item);
        if (!conversation || seen.has(conversation.externalId)) {
          skipped++;
          continue;
        }
        seen.add(conversation.externalId);
        conversations.push(conversation);
      }
    }

    if (readableFiles === 0) {
      throw new ImportError("Le fichier conversations.json est illisible ou corrompu.");
    }
    return { conversations, skipped };
  },
};
