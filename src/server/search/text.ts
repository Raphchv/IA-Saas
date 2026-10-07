/**
 * Traitement du texte pour la recherche (sans IA).
 *
 * Le même traitement est appliqué au texte indexé ET à la recherche :
 * minuscules, sans accents ("Idées" → "idees"), découpé en mots.
 * C'est ce qui permet à "idee" de trouver "Idées".
 */

/**
 * Minuscules + suppression des accents, caractère par caractère.
 * Le résultat a TOUJOURS la même longueur que l'entrée : une position dans le
 * texte normalisé correspond à la même position dans le texte d'origine
 * (indispensable pour surligner les mots trouvés).
 */
export function normalizeChar(char: string): string {
  const base = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (base.length === char.length) return base;
  const lower = char.toLowerCase();
  return lower.length === char.length ? lower : char;
}

/** À appliquer sur un texte déjà en forme NFC (voir `toNfc`). */
export function normalize(text: string): string {
  let out = "";
  for (const char of text) out += normalizeChar(char);
  return out;
}

/** Forme Unicode standard : "é" en un seul caractère plutôt que "e" + accent. */
export function toNfc(text: string): string {
  return text.normalize("NFC");
}

/**
 * Masque les étiquettes "Moi :" / "IA :" ajoutées devant chaque message des
 * extraits (voir chunking.ts), pour que chercher "IA" ne trouve pas TOUTES
 * les conversations. Remplacées par des espaces : la longueur ne change pas.
 * À appliquer sur un texte déjà normalisé.
 */
export function maskRoleLabels(normalizedText: string): string {
  return normalizedText.replace(/(^|\s)(moi|ia) : /g, (match) => " ".repeat(match.length));
}

/** Découpe en mots (lettres et chiffres), comme le fait PostgreSQL. */
export function tokenize(normalizedText: string): string[] {
  return normalizedText.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Racine simplifiée d'un mot (français + anglais) : retire les pluriels.
 * "idees" → "idee", "projets" → "projet", "travaux" → "travau".
 * Suffisant car la recherche se fait ensuite "par préfixe" (idee* trouve idees).
 */
export function stem(word: string): string {
  if (word.length > 4 && /(s|x)$/.test(word) && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Un mot du texte correspond-il à un terme recherché ?
 * - terme de 4 lettres ou plus : par préfixe ("projet" trouve "projets", "projeter")
 * - terme court ("ia", "cv", "seo") : mot exact, sinon "ia" trouverait "iacono"…
 */
export function tokenMatches(token: string, term: string): boolean {
  return term.length >= 4 ? token.startsWith(term) : token === term;
}

/**
 * Mots ignorés : articles, pronoms… et les mots qui décrivent la recherche
 * elle-même ("les conversations où je parle de…"), qui ne disent rien du sujet.
 * Écrits sans accents (comparés au texte normalisé).
 */
export const STOPWORDS = new Set(
  (
    // français
    "le la les un une des du de d l au aux et ou ni mais donc or car que qu qui quoi quel quelle quels quelles " +
    "dont ou la ce cet cette ces se sa son ses mon ma mes ton ta tes notre nos votre vos leur leurs " +
    "je j tu il elle on nous vous ils elles me m te t lui y en ne n pas plus moins tres trop peu " +
    "est sont etait etaient ete etre ai as a avons avez ont avais avait avions aviez avaient eu avoir " +
    "suis es sommes etes fais fait faire faisais dans pour par sur sous avec sans chez vers entre " +
    "comme quand comment pourquoi combien si tout tous toute toutes autre autres meme aussi deja encore " +
    "cela ca ceci celui celle ceux celles voici voila " +
    // décrivent la recherche, pas le sujet
    "conversation conversations discussion discussions echange echanges message messages chat chats " +
    "parle parler parlais parlait parles parlions dit dire disais question questions " +
    "trouve trouver retrouve retrouver cherche chercher recherche montre montrer affiche afficher " +
    "ancien ancienne anciens anciennes vieux vieille vieilles dernier derniere derniers dernieres " +
    "chatgpt gpt openai " +
    // anglais
    "the a an and or of to in on for with about from by at is are was were be been my your our their " +
    "i you he she we they it this that these those what which who when where why how " +
    "conversation conversations chat chats talk talked talking about"
  ).split(" "),
);

/**
 * Mots "faibles" : ils comptent pour le classement mais ne suffisent pas,
 * seuls, à faire apparaître une conversation ("ce que j'avais prévu" → "prevu").
 */
export const WEAK_WORDS = new Set(
  "idee idees prevu prevoir decide decider choses chose truc trucs envie besoin aide aider avis conseil conseils plan plans".split(
    " ",
  ),
);
