/**
 * Moteur de recherche : logique pure (aucun accès base de données, aucune IA).
 *
 * 1. parseQuery     : "mes idées de SaaS" → termes utiles + termes associés
 * 2. scoreConversation : calcule un score de pertinence et décide si la
 *                        conversation mérite d'apparaître
 * 3. makeSnippet / highlight : extrait pertinent avec les mots surlignés
 */
import { SYNONYMS, type SynonymMap } from "./synonyms";
import { maskRoleLabels, normalize, stem, STOPWORDS, toNfc, tokenize, tokenMatches, WEAK_WORDS } from "./text";

export const MAX_QUERY_LENGTH = 300;
const MAX_TERMS = 10;
const MAX_SYNONYMS = 30;

export type TermKind =
  | "core" // mot important de la recherche
  | "weak" // mot de la recherche peu discriminant ("idée", "prévu")
  | "related"; // terme associé (synonyme)

export type QueryTerm = { term: string; kind: TermKind; weight: number };

export type ParsedQuery = {
  /** Recherche telle qu'affichée (éventuellement raccourcie). */
  text: string;
  truncated: boolean;
  terms: QueryTerm[];
  /** Requête plein texte PostgreSQL ("saas:* | startup:* | …"), null si rien d'exploitable. */
  tsQuery: string | null;
};

// ─── 1. Analyse de la recherche ─────────────────────────────

export function parseQuery(input: string, synonyms: SynonymMap = SYNONYMS): ParsedQuery {
  const nfc = toNfc(input).replace(/\s+/g, " ").trim();
  const truncated = nfc.length > MAX_QUERY_LENGTH;
  const text = truncated ? nfc.slice(0, MAX_QUERY_LENGTH) : nfc;

  const words: string[] = [];
  for (const token of tokenize(normalize(text))) {
    if (STOPWORDS.has(token)) continue;
    const word = stem(token);
    // Les mots de 1-2 lettres sont ignorés, sauf s'ils sont connus ("ia", "cv") ou numériques.
    if (word.length < 3 && !synonyms.has(word) && !/^\d+$/.test(word)) continue;
    if (!words.includes(word)) words.push(word);
  }
  const selected = words.slice(0, MAX_TERMS);

  // Si la recherche ne contient QUE des mots faibles ("mes idées"), ils redeviennent importants.
  const allWeak = selected.every((w) => WEAK_WORDS.has(w));
  const terms: QueryTerm[] = selected.map((term) =>
    !allWeak && WEAK_WORDS.has(term) ? { term, kind: "weak", weight: 0.5 } : { term, kind: "core", weight: 1 },
  );

  // Termes associés : poids plus faible, et jamais un mot déjà présent dans la recherche.
  const related = new Map<string, number>();
  for (const { term, kind } of terms) {
    for (const synonym of synonyms.get(term) ?? []) {
      if (selected.includes(synonym)) continue;
      const weight = kind === "core" ? 0.5 : 0.3;
      related.set(synonym, Math.max(related.get(synonym) ?? 0, weight));
    }
  }
  for (const [term, weight] of [...related].slice(0, MAX_SYNONYMS)) terms.push({ term, kind: "related", weight });

  return { text, truncated, terms, tsQuery: toTsQuery(terms) };
}

/** Termes de 4 lettres ou plus : recherche par préfixe ("projet:*" trouve "projets"). */
function toTsQuery(terms: QueryTerm[]): string | null {
  const parts = terms
    .map(({ term }) => term)
    .filter((term) => /^[\p{L}\p{N}]+$/u.test(term)) // aucun caractère spécial dans la requête SQL
    .map((term) => (term.length >= 4 ? `${term}:*` : term));
  return parts.length > 0 ? parts.join(" | ") : null;
}

// ─── 2. Score de pertinence ─────────────────────────────────

export type ConversationScore = {
  score: number;
  /** La conversation est-elle assez liée à la recherche pour être affichée ? */
  qualifies: boolean;
  /** Vrai si seuls des termes associés ont été trouvés (aucun mot exact). */
  relatedOnly: boolean;
  /** Part des mots importants de la recherche présents (0 à 1). */
  coverage: number;
  /** Index de l'extrait le plus pertinent. */
  bestChunk: number;
};

const MAX_COUNTED_OCCURRENCES = 20;

function countMatches(tokens: string[], term: string): number {
  let count = 0;
  for (const token of tokens) if (tokenMatches(token, term)) count++;
  return count;
}

/** Vrai si les mots importants apparaissent les uns à la suite des autres ("idee saas"). */
function containsPhrase(tokens: string[], phrase: string[]): boolean {
  if (phrase.length < 2) return false;
  outer: for (let i = 0; i + phrase.length <= tokens.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (!tokenMatches(tokens[i + j], phrase[j])) continue outer;
    return true;
  }
  return false;
}

export function scoreConversation(query: ParsedQuery, title: string, chunks: string[]): ConversationScore {
  const titleTokens = tokenize(normalize(toNfc(title)));
  const chunkTokens = chunks.map((chunk) => tokenize(maskRoleLabels(normalize(toNfc(chunk)))));
  const queryWords = query.terms.filter((t) => t.kind !== "related");
  const coreTerms = query.terms.filter((t) => t.kind === "core");

  let score = 0;
  let coreMatched = 0;
  let weakMatched = false;
  // Mots DIFFÉRENTS du texte trouvés grâce aux termes associés ("planning" ne compte
  // qu'une fois, même s'il correspond à la fois à "plan" et à "planning").
  const relatedWords = new Set<string>();
  let anyQueryWord = false;
  const chunkScores = chunks.map(() => 0);

  for (const { term, kind, weight } of query.terms) {
    const inTitle = countMatches(titleTokens, term) > 0;
    const perChunk = chunkTokens.map((tokens) => countMatches(tokens, term));
    const total = Math.min(
      perChunk.reduce((a, b) => a + b, 0),
      MAX_COUNTED_OCCURRENCES,
    );
    const found = inTitle || total > 0;
    if (!found) continue;

    if (kind === "related") {
      // Un terme associé compte moins qu'un mot de la recherche.
      score += (inTitle ? 1.5 * weight : 0) + (total > 0 ? 0.6 * weight * (1 + Math.log(total)) : 0);
      for (const tokens of [titleTokens, ...chunkTokens]) {
        for (const token of tokens) if (tokenMatches(token, term)) relatedWords.add(stem(token));
      }
    } else {
      // Le titre résume la conversation : un mot trouvé dans le titre vaut beaucoup.
      score += (inTitle ? 3 * weight : 0) + (total > 0 ? weight * (1 + Math.log(total)) : 0);
      anyQueryWord = true;
      if (kind === "core") coreMatched++;
      else weakMatched = true;
    }
    perChunk.forEach((count, i) => (chunkScores[i] += Math.min(count, 5) * (kind === "related" ? weight : 2 * weight)));
  }

  // Bonus : la conversation contient TOUS les mots importants, et encore plus s'ils se suivent.
  const coverage = coreTerms.length > 0 ? coreMatched / coreTerms.length : 0;
  if (coreTerms.length > 0) score *= 0.4 + 0.6 * coverage;
  const phrase = queryWords.map((t) => t.term);
  if (containsPhrase(titleTokens, phrase) || chunkTokens.some((tokens) => containsPhrase(tokens, phrase))) score += 2;

  // Garde-fou "hors sujet" : il faut un mot important de la recherche, ou au moins
  // deux indices différents (mots liés au sujet, ou un mot secondaire de la
  // recherche + un mot lié). Un terme associé isolé ne suffit jamais.
  const qualifies = coreMatched > 0 || relatedWords.size + (weakMatched ? 1 : 0) >= 2;
  const bestChunk = chunkScores.indexOf(Math.max(...chunkScores, 0));

  return { score, qualifies, relatedOnly: !anyQueryWord, coverage, bestChunk: Math.max(bestChunk, 0) };
}

export type Relevance = "high" | "medium" | "low";

/** Indicateur affiché : relatif au meilleur résultat de la même recherche. */
export function relevanceLevel(result: ConversationScore, bestScore: number): Relevance {
  if (result.relatedOnly) return "low";
  const ratio = bestScore > 0 ? result.score / bestScore : 0;
  if (ratio >= 0.55 && result.coverage === 1) return "high";
  return ratio >= 0.25 ? "medium" : "low";
}

// ─── 3. Extrait et surlignage ───────────────────────────────

export type Segment = { text: string; match: boolean };

type Range = { start: number; end: number; core: boolean };

function findMatches(text: string, terms: QueryTerm[]): Range[] {
  const normalized = maskRoleLabels(normalize(text)); // même longueur que `text`
  const ranges: Range[] = [];
  for (const m of normalized.matchAll(/[\p{L}\p{N}]+/gu)) {
    const hit = terms.find(({ term }) => tokenMatches(m[0], term));
    if (hit) ranges.push({ start: m.index, end: m.index + m[0].length, core: hit.kind !== "related" });
  }
  return ranges;
}

function toSegments(text: string, ranges: Range[], from = 0, to = text.length): Segment[] {
  const segments: Segment[] = [];
  let cursor = from;
  for (const { start, end } of ranges) {
    if (end <= from || start >= to) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(Math.max(start, cursor), Math.min(end, to)), match: true });
    cursor = Math.min(end, to);
  }
  if (cursor < to) segments.push({ text: text.slice(cursor, to), match: false });
  return segments;
}

/** Texte complet découpé en segments, les mots trouvés étant marqués. */
export function highlight(text: string, terms: QueryTerm[]): Segment[] {
  const nfc = toNfc(text);
  return toSegments(nfc, findMatches(nfc, terms));
}

/** Extrait court centré sur le premier mot important trouvé, avec surlignage. */
export function makeSnippet(text: string, terms: QueryTerm[], length = 260): Segment[] {
  const nfc = toNfc(text).replace(/\s+/g, " ").trim();
  const ranges = findMatches(nfc, terms);
  const anchor = (ranges.find((r) => r.core) ?? ranges[0])?.start ?? 0;

  // Démarre un peu avant le mot trouvé, au début d'un mot.
  let start = Math.max(0, anchor - 70);
  if (start > 0) {
    const space = nfc.indexOf(" ", start);
    start = space >= 0 && space < anchor ? space + 1 : start;
  }
  let end = Math.min(nfc.length, start + length);
  if (end < nfc.length) {
    const space = nfc.lastIndexOf(" ", end);
    end = space > anchor ? space : end;
  }

  const segments = toSegments(nfc, ranges, start, end);
  if (start > 0) segments.unshift({ text: "…", match: false });
  if (end < nfc.length) segments.push({ text: "…", match: false });
  return segments;
}
