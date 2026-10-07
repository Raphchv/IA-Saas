import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DeleteConversationButton } from "@/components/delete-conversation-button";
import { HighlightedText } from "@/components/highlighted-text";
import { FavoriteButton } from "@/components/favorite-button";
import { formatDate, plural, SOURCE_LABELS } from "@/lib/format";
import { getConversation } from "@/server/conversations";
import { highlight, parseQuery } from "@/server/search/engine";
import { requireUser } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/conversations/[id]">): Promise<Metadata> {
  const user = await requireUser();
  const conversation = await getConversation(user.id, (await params).id);
  return { title: conversation?.title ?? "Conversation" };
}

export default async function ConversationPage({ params, searchParams }: PageProps<"/conversations/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  // Ouverte depuis une recherche (?q=…) : les mots recherchés sont surlignés.
  const q = (await searchParams).q;
  const searchText = (Array.isArray(q) ? q[0] : (q ?? "")).slice(0, 300);
  const terms = searchText ? parseQuery(searchText).terms : [];
  // Filtré par userId : la conversation d'un autre utilisateur renvoie une 404.
  const conversation = await getConversation(user.id, id);
  if (!conversation) notFound();
  const sourceLabel = SOURCE_LABELS[conversation.source] ?? conversation.source;

  return (
    <article className="space-y-6">
      {searchText ? (
        <Link
          href={`/search?q=${encodeURIComponent(searchText)}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Résultats pour « {searchText} »
        </Link>
      ) : (
        <Link href="/conversations" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Conversations
        </Link>
      )}

      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            <HighlightedText segments={highlight(conversation.title, terms)} />
          </h1>
          <p className="mt-1 text-sm text-muted">
            {sourceLabel} · {formatDate(conversation.startedAt)}
            {conversation.lastActiveAt && conversation.startedAt?.toDateString() !== conversation.lastActiveAt.toDateString()
              ? ` → ${formatDate(conversation.lastActiveAt)}`
              : ""}{" "}
            · {plural(conversation.messageCount, "message")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <FavoriteButton conversationId={conversation.id} isFavorite={Boolean(conversation.favorite)} />
          <DeleteConversationButton conversationId={conversation.id} />
        </div>
      </header>

      <ol className="space-y-6">
        {conversation.messages.map((message) => (
          <li key={message.id} className={message.role === "USER" ? "flex justify-end" : ""}>
            <div
              className={
                message.role === "USER"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5"
                  : "max-w-full"
              }
            >
              {message.role === "ASSISTANT" && <p className="mb-1 text-xs font-medium text-muted">{sourceLabel}</p>}
              {/* Texte brut (pas de HTML interprété) : aucun risque d'injection de script. */}
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                <HighlightedText segments={highlight(message.content, terms)} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
