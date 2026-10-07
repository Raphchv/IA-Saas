import { describe, expect, it } from "vitest";
import { highlight, makeSnippet, parseQuery, relevanceLevel, scoreConversation } from "./engine";

const terms = (query: string, kind?: string) =>
  parseQuery(query)
    .terms.filter((t) => !kind || t.kind === kind)
    .map((t) => t.term);

describe("parseQuery", () => {
  it("ignore les mots vides et les mots qui décrivent la recherche", () => {
    expect(terms("les conversations où je parle de mon stage", "core")).toEqual(["stage"]);
    expect(terms("mes discussions sur Excel", "core")).toEqual(["excel"]);
  });

  it("normalise accents, majuscules et pluriels", () => {
    expect(terms("mes anciennes IDÉES de business", "core")).toEqual(["business"]);
    expect(terms("mes anciennes IDÉES de business", "weak")).toEqual(["idee"]);
    expect(terms("Projets", "core")).toEqual(["projet"]);
  });

  it("garde les mots courts connus (IA, CV)", () => {
    expect(terms("mon CV et l'IA", "core")).toEqual(["cv", "ia"]);
  });

  it("une recherche faite uniquement de mots faibles les rend importants", () => {
    expect(terms("mes idées", "core")).toEqual(["idee"]);
  });

  it("ajoute les termes associés avec un poids plus faible", () => {
    const query = parseQuery("mes idées de SaaS");
    const startup = query.terms.find((t) => t.term === "startup");
    expect(startup).toMatchObject({ kind: "related", weight: 0.5 });
    expect(query.tsQuery).toContain("saas:*");
    expect(query.tsQuery).toContain("startup:*");
  });

  it("gère une recherche vide ou très longue", () => {
    expect(parseQuery("   ").tsQuery).toBeNull();
    expect(parseQuery("de la les").tsQuery).toBeNull();
    const long = parseQuery("stage ".repeat(200));
    expect(long.truncated).toBe(true);
    expect(long.text.length).toBeLessThanOrEqual(300);
    expect(long.terms.filter((t) => t.kind === "core")).toHaveLength(1);
  });

  it("n'injecte aucun caractère spécial dans la requête SQL", () => {
    expect(parseQuery("saas') ; DROP TABLE & | !").tsQuery).toBe(parseQuery("saas drop table").tsQuery);
  });
});

describe("scoreConversation", () => {
  const query = parseQuery("mes idées de SaaS");

  it("classe mieux une conversation dont le titre contient le mot recherché", () => {
    const inTitle = scoreConversation(query, "Idées de SaaS", ["Moi : on en parle"]);
    const inText = scoreConversation(query, "Brainstorm", ["Moi : une idée de SaaS pour les profs"]);
    expect(inTitle.qualifies && inText.qualifies).toBe(true);
    expect(inTitle.score).toBeGreaterThan(inText.score);
  });

  it("un seul synonyme dans le texte ne suffit pas (évite le hors-sujet)", () => {
    const result = scoreConversation(query, "Recette de crêpes", ["IA : mélangez, puis lancez l'application minuteur."]);
    expect(result.qualifies).toBe(false);
  });

  it("un seul terme associé, même dans le titre, ne suffit pas", () => {
    expect(scoreConversation(query, "Planning de mon projet", ["Moi : maquette en mars"]).qualifies).toBe(false);
  });

  it("un mot qui correspond à deux termes associés ne compte qu'une fois", () => {
    const q = parseQuery("mon projet");
    expect(scoreConversation(q, "Idées", ["IA : un outil de planning"]).qualifies).toBe(false);
  });

  it("ignore les étiquettes Moi / IA des extraits", () => {
    expect(scoreConversation(parseQuery("IA"), "Recette", ["Moi : crêpes ?\n\nIA : farine, lait"]).qualifies).toBe(false);
    expect(scoreConversation(parseQuery("IA"), "Divers", ["Moi : que penses-tu de l'IA ?"]).qualifies).toBe(true);
    const segments = highlight("Moi : bonjour IA : salut", parseQuery("ia").terms);
    expect(segments.some((s) => s.match)).toBe(false);
  });

  it("un mot secondaire de la recherche + un terme associé suffisent", () => {
    const q = parseQuery("mes idées de business");
    expect(scoreConversation(q, "Idées de SaaS", ["Moi : un SaaS de facturation"]).qualifies).toBe(true);
  });

  it("plusieurs termes associés suffisent, mais restent moins bien classés", () => {
    const related = scoreConversation(query, "Projet de startup pour freelances", ["Moi : mon business"]);
    const exact = scoreConversation(query, "Mon SaaS", ["Moi : idée de SaaS"]);
    expect(related.qualifies).toBe(true);
    expect(related.relatedOnly).toBe(true);
    expect(exact.score).toBeGreaterThan(related.score);
    expect(relevanceLevel(related, exact.score)).toBe("low");
    expect(relevanceLevel(exact, exact.score)).toBe("high");
  });

  it("récompense la présence de tous les mots importants", () => {
    const q = parseQuery("stage excel");
    const both = scoreConversation(q, "Mon stage", ["Moi : un tableau excel pour mon stage"]);
    const one = scoreConversation(q, "Mon stage", ["Moi : premier jour de stage"]);
    expect(both.score).toBeGreaterThan(one.score);
    expect(both.coverage).toBe(1);
    expect(one.coverage).toBe(0.5);
  });

  it("désigne l'extrait le plus pertinent", () => {
    const result = scoreConversation(parseQuery("excel"), "Divers", ["Moi : bonjour", "Moi : formule Excel, Excel encore"]);
    expect(result.bestChunk).toBe(1);
  });

  it("n'affiche pas une conversation sans rapport", () => {
    expect(scoreConversation(parseQuery("stage"), "Recette de crêpes", ["Farine, oeufs, lait"]).qualifies).toBe(false);
  });
});

describe("surlignage", () => {
  it("surligne sans tenir compte des accents et en conservant le texte d'origine", () => {
    const segments = highlight("Mes Idées : un SaaS", parseQuery("idee saas").terms);
    expect(segments.filter((s) => s.match).map((s) => s.text)).toEqual(["Idées", "SaaS"]);
    expect(segments.map((s) => s.text).join("")).toBe("Mes Idées : un SaaS");
  });

  it("garde un surlignage correct après un emoji", () => {
    const segments = highlight("🚀 Mon stage", parseQuery("stage").terms);
    expect(segments.find((s) => s.match)?.text).toBe("stage");
  });

  it("centre l'extrait sur le mot trouvé", () => {
    const text = `${"blabla ".repeat(80)}mon stage chez Airbus ${"suite ".repeat(80)}`;
    const snippet = makeSnippet(text, parseQuery("stage").terms);
    expect(snippet[0].text).toBe("…");
    expect(snippet.at(-1)?.text).toBe("…");
    expect(snippet.some((s) => s.match && s.text === "stage")).toBe(true);
  });
});
