import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseArchive } from "./index";

/** Construit un nœud de l'arbre `mapping` au format ChatGPT. */
function node(id: string, parent: string | null, children: string[], message: object | null) {
  return { id, parent, children, message };
}
function msg(role: string, text: string, extra: object = {}) {
  return { author: { role }, create_time: 1_700_000_000, content: { content_type: "text", parts: [text] }, ...extra };
}

const conversation = {
  conversation_id: "conv-1",
  title: "Idées de SaaS",
  create_time: 1_700_000_000,
  update_time: 1_700_000_500,
  current_node: "a2",
  mapping: {
    root: node("root", null, ["sys"], null),
    sys: node("sys", "root", ["u1"], msg("system", "You are ChatGPT")),
    u1: node("u1", "sys", ["a1", "a2"], msg("user", "Donne-moi des idées de SaaS")),
    // a1 = ancienne réponse régénérée : ne doit pas apparaître
    a1: node("a1", "u1", [], msg("assistant", "Ancienne réponse")),
    a2: node("a2", "u1", [], msg("assistant", "1. Un outil de recherche")),
  },
};

function makeZip(files: Record<string, string>) {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

describe("parser ChatGPT", () => {
  it("reconstitue la branche affichée et ignore les messages système", () => {
    const result = parseArchive(makeZip({ "conversations.json": JSON.stringify([conversation]) }));
    expect(result.parser.source).toBe("CHATGPT");
    expect(result.conversations).toHaveLength(1);
    const [conv] = result.conversations;
    expect(conv.externalId).toBe("conv-1");
    expect(conv.title).toBe("Idées de SaaS");
    expect(conv.messages.map((m) => [m.role, m.content])).toEqual([
      ["USER", "Donne-moi des idées de SaaS"],
      ["ASSISTANT", "1. Un outil de recherche"],
    ]);
  });

  it("ignore les appels d'outils, contenus cachés et conversations vides", () => {
    const withTools = {
      ...conversation,
      conversation_id: "conv-2",
      current_node: "a3",
      mapping: {
        u1: node("u1", null, ["t1"], msg("user", "Calcule 2+2")),
        t1: node("t1", "u1", ["tool"], msg("assistant", "print(2+2)", { recipient: "python" })),
        tool: node("tool", "t1", ["h"], msg("tool", "4")),
        h: node("h", "tool", ["a3"], msg("assistant", "caché", { metadata: { is_visually_hidden_from_conversation: true } })),
        a3: node("a3", "h", [], msg("assistant", "Ça fait 4")),
      },
    };
    const empty = { ...conversation, conversation_id: "conv-3", mapping: {} };
    const result = parseArchive(
      makeZip({ "export/conversations.json": JSON.stringify([withTools, empty, { pas: "valide" }]) }),
    );
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].messages.map((m) => m.content)).toEqual(["Calcule 2+2", "Ça fait 4"]);
    expect(result.skipped).toBe(2);
  });

  it("refuse un fichier qui n'est pas un ZIP", () => {
    expect(() => parseArchive(strToU8("hello"))).toThrow(/ZIP/);
  });

  it("refuse un ZIP sans conversations.json", () => {
    expect(() => parseArchive(makeZip({ "notes.txt": "x" }))).toThrow(/Format non reconnu/);
  });
});
