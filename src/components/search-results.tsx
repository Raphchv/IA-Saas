import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { HighlightedText } from "@/components/highlighted-text";
import { buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Relevance } from "@/server/search/engine";
import type { SearchResult } from "@/server/search";

const RELEVANCE: Record<Relevance, { label: string; bars: number; className: string }> = {
  high: { label: "Très pertinent", bars: 3, className: "text-success" },
  medium: { label: "Pertinent", bars: 2, className: "text-accent" },
  low: { label: "Sujet proche", bars: 1, className: "text-muted" },
};

export function SearchResults({ results, query }: { results: SearchResult[]; query: string }) {
  return (
    <ol className="space-y-3">
      {results.map((result) => {
        // ?q= : la conversation ouverte surligne aussi les mots recherchés.
        const href = `/conversations/${result.id}?q=${encodeURIComponent(query)}`;
        return (
          <li key={result.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-accent/40">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link href={href} className="block truncate font-medium hover:underline">
                  <HighlightedText segments={result.title} />
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {result.lastActiveAt && <span>{formatDate(result.lastActiveAt)}</span>}
                  <RelevanceBadge relevance={result.relevance} />
                </div>
              </div>
              <FavoriteButton conversationId={result.id} isFavorite={result.isFavorite} />
            </div>
            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted">
              <HighlightedText segments={result.snippet} />
            </p>
            <Link href={href} className={buttonClass("secondary", "sm", "mt-3")}>
              Ouvrir la conversation <ArrowUpRight className="size-3.5" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function RelevanceBadge({ relevance }: { relevance: Relevance }) {
  const { label, bars, className } = RELEVANCE[relevance];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title="Pertinence par rapport à votre recherche">
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={`w-1 rounded-sm ${level <= bars ? "bg-current" : "bg-line"}`}
            style={{ height: 4 + level * 3 }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
