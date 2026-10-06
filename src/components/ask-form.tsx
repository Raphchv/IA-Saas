"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { askAction, type AskState } from "@/app/(app)/actions";
import { Alert, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";

const EXAMPLES = [
  "Quelles idées de SaaS ai-je abandonnées et pourquoi ?",
  "Quels conseils m'a-t-on donnés pour mon CV ?",
  "Qu'avais-je décidé concernant mon projet ?",
];

export function AskForm({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [state, formAction, pending] = useActionState<AskState, FormData>(askAction, { question: initialQuestion });

  return (
    <div className="space-y-6">
      <form action={formAction} className="relative">
        <textarea
          name="question"
          defaultValue={state.question}
          key={state.question}
          required
          minLength={3}
          maxLength={1000}
          rows={3}
          placeholder="Posez une question à votre historique…"
          onKeyDown={(e) => {
            // Entrée = envoyer, Maj+Entrée = retour à la ligne
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="w-full resize-none rounded-xl border border-line bg-surface p-4 pr-14 text-[15px] shadow-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Envoyer"
          className="absolute bottom-4 right-3 grid size-9 place-items-center rounded-lg bg-accent text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </form>

      {!state.result && !state.error && !pending && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Link
              key={example}
              href={`/ask?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted transition-colors hover:text-fg"
            >
              {example}
            </Link>
          ))}
        </div>
      )}

      {pending && <p className="text-sm text-muted">Recherche dans votre historique et rédaction de la réponse…</p>}
      {!pending && state.error && <Alert>{state.error}</Alert>}

      {!pending && state.result && (
        <div className="space-y-6">
          <Card className="p-5">
            <Answer text={state.result.answer} />
          </Card>

          {state.result.sources.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">Sources utilisées</h2>
              <ul className="space-y-2">
                {state.result.sources.map((source) => (
                  <li key={source.number} id={`source-${source.number}`}>
                    <Link
                      href={`/conversations/${source.conversationId}`}
                      className="block rounded-xl border border-line bg-surface p-3 shadow-sm transition-colors hover:bg-subtle/60"
                    >
                      <p className="flex items-baseline gap-2 text-sm font-medium">
                        <span className="rounded bg-accent-soft px-1.5 text-xs text-accent">{source.number}</span>
                        <span className="truncate">{source.title}</span>
                        <span className="ml-auto shrink-0 text-xs font-normal text-muted">{formatDate(source.date)}</span>
                      </p>
                      <p className="mt-1.5 line-clamp-3 text-sm text-muted">{source.excerpt}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** Affiche la réponse en texte brut ; les citations [n] deviennent des liens vers la source. */
function Answer({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        return match ? (
          <a key={i} href={`#source-${match[1]}`} className="mx-0.5 rounded bg-accent-soft px-1 text-xs font-medium text-accent no-underline">
            {match[1]}
          </a>
        ) : (
          part
        );
      })}
    </p>
  );
}
