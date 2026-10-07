import { normalize, stem, toNfc } from "./text";

/**
 * Dictionnaire de termes associés.
 *
 * Clé = un mot que l'utilisateur peut taper.
 * Valeur = des mots proches qui, s'ils apparaissent dans une conversation,
 *          AMÉLIORENT son classement.
 *
 * Les associations vont dans un seul sens : "saas" → "projet" ne veut pas
 * dire que chercher "projet" fera remonter tout ce qui parle de SaaS.
 *
 * Un synonyme seul ne suffit jamais à faire apparaître une conversation
 * (voir `qualifies` dans engine.ts) : il faut un vrai mot de la recherche,
 * ou au moins deux mots différents liés au sujet.
 *
 * Pour enrichir : ajoutez une ligne. Accents et majuscules sont gérés automatiquement.
 * Utilisez des mots simples (pas d'expressions de plusieurs mots).
 */
const RAW_SYNONYMS: Record<string, string[]> = {
  // Entrepreneuriat
  saas: ["startup", "business", "application", "logiciel", "projet", "entreprise", "plateforme", "abonnement"],
  startup: ["saas", "entreprise", "business", "projet", "fondateur", "levée", "investisseur"],
  business: ["entreprise", "startup", "saas", "projet", "marché", "clients", "revenus", "commerce"],
  entreprise: ["société", "business", "startup", "boîte", "statut", "entrepreneur"],
  entrepreneur: ["entreprise", "startup", "business", "fondateur", "freelance"],
  idée: ["concept", "projet", "piste", "brainstorm", "brainstorming"],
  projet: ["plan", "objectif", "étapes", "roadmap", "planning"],
  marketing: ["publicité", "communication", "réseaux", "acquisition", "clients", "seo", "marque"],
  freelance: ["indépendant", "microentreprise", "clients", "mission"],

  // Études et emploi
  stage: ["stagiaire", "entreprise", "cv", "candidature", "convention", "entretien", "alternance", "tuteur"],
  alternance: ["apprentissage", "stage", "entreprise", "école", "contrat"],
  cv: ["curriculum", "candidature", "expérience", "compétences", "lettre", "motivation"],
  candidature: ["cv", "lettre", "motivation", "postuler", "recrutement", "entretien"],
  entretien: ["recrutement", "embauche", "candidature", "questions", "poste"],
  emploi: ["travail", "job", "poste", "recrutement", "salaire", "cdi", "cdd"],
  travail: ["emploi", "job", "poste", "boulot", "bureau"],
  école: ["études", "cours", "université", "examen", "partiel", "révisions"],
  études: ["école", "université", "cours", "diplôme", "master", "licence"],
  examen: ["partiel", "révisions", "contrôle", "bac", "notes"],

  // Outils et informatique
  excel: ["tableur", "formule", "tableau", "cellule", "vba", "sheets", "recherchev", "macro"],
  code: ["programmation", "développement", "script", "fonction", "bug", "python", "javascript"],
  programmation: ["code", "développement", "python", "javascript", "algorithme"],
  site: ["web", "internet", "html", "page", "wordpress", "domaine"],
  application: ["app", "logiciel", "mobile", "interface", "saas"],
  ia: ["intelligence", "artificielle", "chatgpt", "modèle", "prompt", "llm"],
  bug: ["erreur", "problème", "plantage", "débogage", "corriger"],

  // Vie quotidienne
  argent: ["budget", "finances", "économies", "dépenses", "salaire", "épargne"],
  budget: ["argent", "dépenses", "finances", "économies"],
  santé: ["médecin", "maladie", "symptômes", "sport", "sommeil"],
  sport: ["entraînement", "musculation", "course", "fitness", "exercices"],
  voyage: ["vacances", "séjour", "vol", "hôtel", "itinéraire", "visiter"],
  recette: ["cuisine", "ingrédients", "plat", "cuisson", "repas"],
  cuisine: ["recette", "ingrédients", "repas", "plat"],
  appartement: ["logement", "location", "loyer", "colocation", "propriétaire"],
};

export type SynonymMap = ReadonlyMap<string, string[]>;

/** Version normalisée (sans accents, minuscules, racine) du dictionnaire. */
export const SYNONYMS: SynonymMap = new Map(
  Object.entries(RAW_SYNONYMS).map(([key, values]) => {
    const normKey = stem(normalize(toNfc(key)));
    const normValues = [...new Set(values.map((v) => stem(normalize(toNfc(v)))))].filter(
      (v) => v !== normKey && /^[\p{L}\p{N}]+$/u.test(v), // un seul mot, sans tiret ni espace
    );
    return [normKey, normValues];
  }),
);
