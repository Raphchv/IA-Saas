import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Upload } from "lucide-react";
import { ConversationList, EmptyState, toListItem } from "@/components/conversation-list";
import { SearchBar } from "@/components/search-bar";
import { buttonClass, Card } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { getDashboardData } from "@/server/conversations";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const isEmpty = data.totalConversations === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour {user.name} 👋</h1>
          <p className="mt-1 text-sm text-muted">Votre deuxième cerveau pour vos conversations IA.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/import" className={buttonClass("secondary", "md", "whitespace-nowrap")}>
            <Upload className="size-4" /> Importer<span className="hidden sm:inline"> mon historique</span>
          </Link>
          <Link href="/ask" className={buttonClass("primary", "md", "whitespace-nowrap")}>
            <Sparkles className="size-4" /> Ask my history
          </Link>
        </div>
      </header>

      <SearchBar />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Conversations" value={formatNumber(data.totalConversations)} />
        <Stat
          label="Importées au dernier import"
          value={data.lastImport ? formatNumber(data.lastImport.importedConversations) : "—"}
          hint={data.lastImport ? `le ${formatDate(data.lastImport.completedAt)}` : "Aucun import"}
        />
        <Stat label="Messages" value={formatNumber(data.totalMessages)} />
        <Stat label="Favoris" value={formatNumber(data.totalFavorites)} />
      </section>

      {isEmpty ? (
        <EmptyState title="Votre historique est vide">
          <p>Importez votre export ChatGPT pour commencer à rechercher dans vos conversations.</p>
          <Link href="/import" className={buttonClass("primary", "md", "mt-4")}>
            <Upload className="size-4" /> Importer mon historique
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Dernières conversations" href="/conversations">
            <ConversationList items={data.recent.map(toListItem)} />
          </Section>
          <Section title="Favoris" href="/conversations?favorites=1">
            {data.favorites.length > 0 ? (
              <ConversationList items={data.favorites.map(toListItem)} />
            ) : (
              <EmptyState title="Aucun favori">Cliquez sur l&apos;étoile d&apos;une conversation pour la retrouver ici.</EmptyState>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
          Tout voir <ArrowRight className="size-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}
