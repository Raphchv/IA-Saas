import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { formatDate, plural } from "@/lib/format";

export type ConversationListItem = {
  id: string;
  title: string;
  lastActiveAt: Date | null;
  messageCount?: number;
  snippet?: string;
  isFavorite: boolean;
};

export function ConversationList({ items }: { items: ConversationListItem[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      {items.map((item) => (
        <li key={item.id} className="group flex items-start gap-2 px-4 py-3 transition-colors hover:bg-subtle/60">
          <Link href={`/conversations/${item.id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.snippet && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.snippet}</p>}
            <p className="mt-1 text-xs text-muted">
              {formatDate(item.lastActiveAt)}
              {item.messageCount !== undefined && ` · ${plural(item.messageCount, "message")}`}
            </p>
          </Link>
          <FavoriteButton conversationId={item.id} isFavorite={item.isFavorite} />
        </li>
      ))}
    </ul>
  );
}

/** Convertit le format Prisma (`favorite: {id} | null`) en format d'affichage. */
export function toListItem<T extends { favorite: { id: string } | null }>(conversation: T) {
  const { favorite, ...rest } = conversation;
  return { ...rest, isFavorite: Boolean(favorite) };
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}
