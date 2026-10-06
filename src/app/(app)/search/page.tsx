import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ConversationList, EmptyState } from "@/components/conversation-list";
import { SearchBar } from "@/components/search-bar";
import { Alert } from "@/components/ui";
import { isAiEnabled } from "@/lib/env";
import { plural } from "@/lib/format";
import { searchConversations, type ConversationHit } from "@/server/search";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Rechercher" };

const EXAMPLES = ["mes idées de SaaS", "conversation où je parle de mon stage", "qu'avais-je décidé concernant mon projet ?"];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const user = await requireUser();
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 500);

  let results: ConversationHit[] = [];
  let failed = false;
  if (query) {
    try {
      results = await searchConversations(user.id, query);
    } catch (error) {
      console.error("[search] échec", error);
      failed = true;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Rechercher</h1>
      <SearchBar defaultValue={query} autoFocus={!query} />

      {!isAiEnabled && (
        <Alert tone="warning">Recherche par mots-clés uniquement : configurez OPENAI_API_KEY pour la recherche par le sens.</Alert>
      )}

      {!query ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Essayez par exemple :</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Link
                key={example}
                href={`/search?q=${encodeURIComponent(example)}`}
                className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted transition-colors hover:text-fg"
              >
                {example}
              </Link>
            ))}
          </div>
        </div>
      ) : failed ? (
        <Alert>La recherche a échoué. Veuillez réessayer.</Alert>
      ) : results.length === 0 ? (
        <EmptyState title="Aucun résultat">Essayez d&apos;autres mots, ou posez directement la question à Ask my history.</EmptyState>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted">{plural(results.length, "conversation pertinente", "conversations pertinentes")}</p>
            <Link href={`/ask?q=${encodeURIComponent(query)}`} className="inline-flex items-center gap-1 text-accent hover:underline">
              <Sparkles className="size-3.5" /> Demander à Ask my history
            </Link>
          </div>
          <ConversationList items={results} />
        </div>
      )}
    </div>
  );
}
