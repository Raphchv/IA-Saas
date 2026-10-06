import type { Metadata } from "next";
import Link from "next/link";
import { ConversationList, EmptyState, toListItem } from "@/components/conversation-list";
import { SearchBar } from "@/components/search-bar";
import { buttonClass } from "@/components/ui";
import { plural } from "@/lib/format";
import { listConversations } from "@/server/conversations";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Conversations" };

export default async function ConversationsPage({ searchParams }: PageProps<"/conversations">) {
  const user = await requireUser();
  const params = await searchParams;
  const favoritesOnly = params.favorites === "1";
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total, pageCount } = await listConversations(user.id, { page, favoritesOnly });

  const pageHref = (p: number) => `/conversations?${favoritesOnly ? "favorites=1&" : ""}page=${p}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{favoritesOnly ? "Favoris" : "Conversations"}</h1>
          <p className="mt-1 text-sm text-muted">{plural(total, "conversation")}</p>
        </div>
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm shadow-sm">
          <Tab href="/conversations" active={!favoritesOnly}>Toutes</Tab>
          <Tab href="/conversations?favorites=1" active={favoritesOnly}>Favoris</Tab>
        </div>
      </header>

      <SearchBar />

      {items.length === 0 ? (
        favoritesOnly ? (
          <EmptyState title="Aucun favori">Cliquez sur l&apos;étoile d&apos;une conversation pour l&apos;ajouter ici.</EmptyState>
        ) : (
          <EmptyState title="Aucune conversation">
            <Link href="/import" className="text-accent hover:underline">Importez votre historique</Link> pour commencer.
          </EmptyState>
        )
      ) : (
        <ConversationList items={items.map(toListItem)} />
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className={buttonClass("secondary", "sm")}>← Précédent</Link> : <span />}
          <span className="text-muted">Page {page} / {pageCount}</span>
          {page < pageCount ? <Link href={pageHref(page + 1)} className={buttonClass("secondary", "sm")}>Suivant →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1 transition-colors ${active ? "bg-subtle font-medium text-fg" : "text-muted hover:text-fg"}`}
    >
      {children}
    </Link>
  );
}
