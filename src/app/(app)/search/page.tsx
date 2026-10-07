import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { EmptyState } from "@/components/conversation-list";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { Alert, buttonClass } from "@/components/ui";
import { plural } from "@/lib/format";
import { countConversations } from "@/server/conversations";
import { searchConversations, type SearchOutcome } from "@/server/search";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Rechercher" };

const EXAMPLES = [
  "mes idées de SaaS",
  "les conversations où je parle de mon stage",
  "mes anciennes idées de business",
  "ce que j'avais prévu pour mon projet",
  "mes discussions sur Excel",
];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const user = await requireUser();
  const raw = (await searchParams).q;
  const input = (Array.isArray(raw) ? raw[0] : (raw ?? "")).slice(0, 2000).trim();

  const total = await countConversations(user.id);

  let outcome: SearchOutcome | null = null;
  let failed = false;
  if (input && total > 0) {
    try {
      outcome = await searchConversations(user.id, input);
    } catch (error) {
      console.error("[search] échec", error);
      failed = true;
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Rechercher dans mon historique</h1>
        <p className="mt-1 text-sm text-muted">
          Écrivez naturellement : les conversations les plus pertinentes apparaissent en premier.
        </p>
      </header>

      {total === 0 ? (
        // Historique vide : rien à chercher pour l'instant.
        <EmptyState title="Votre historique est vide">
          <p>Importez votre export ChatGPT pour pouvoir y rechercher.</p>
          <Link href="/import" className={buttonClass("primary", "md", "mt-4")}>
            <Upload className="size-4" /> Importer mon historique
          </Link>
        </EmptyState>
      ) : (
        <>
          <SearchBar defaultValue={outcome?.query.text ?? input} autoFocus={!input} />
          <SearchContent input={input} outcome={outcome} failed={failed} total={total} />
        </>
      )}
    </div>
  );
}

function SearchContent({
  input,
  outcome,
  failed,
  total,
}: {
  input: string;
  outcome: SearchOutcome | null;
  failed: boolean;
  total: number;
}) {
  // Recherche vide : suggestions.
  if (!input) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Recherche parmi vos {plural(total, "conversation")}. Essayez par exemple :
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Link
              key={example}
              href={`/search?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted transition-colors hover:border-accent/40 hover:text-fg"
            >
              {example}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (failed || !outcome) return <Alert>La recherche n&apos;a pas pu aboutir. Veuillez réessayer dans un instant.</Alert>;

  const { query, results } = outcome;
  return (
    <div className="space-y-4">
      {query.truncated && (
        <Alert tone="warning">Votre recherche était très longue : seuls ses 300 premiers caractères ont été utilisés.</Alert>
      )}

      {!query.tsQuery ? (
        <EmptyState title="Recherche trop vague">
          Ajoutez des mots plus précis, par exemple un sujet, un outil ou un nom de projet.
        </EmptyState>
      ) : results.length === 0 ? (
        <EmptyState title="Aucun résultat">
          Aucune conversation ne correspond à « {query.text} ». Essayez d&apos;autres mots ou un terme plus général.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted">
            {plural(results.length, "conversation trouvée", "conversations trouvées")}
            {results.length >= 30 && " (les 30 plus pertinentes)"}
          </p>
          <SearchResults results={results} query={query.text} />
        </>
      )}
    </div>
  );
}
