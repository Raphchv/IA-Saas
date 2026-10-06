import type { Metadata } from "next";
import { AskForm } from "@/components/ask-form";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Ask my history" };

export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  await requireUser();
  const q = (await searchParams).q;
  const initialQuestion = (Array.isArray(q) ? q[0] : q ?? "").slice(0, 1000);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ask my history</h1>
        <p className="mt-1 text-sm text-muted">
          Posez une question : la réponse est construite uniquement à partir de vos conversations, avec les sources.
        </p>
      </header>
      {/* key : un nouveau ?q= dans l'URL réinitialise le formulaire */}
      <AskForm key={initialQuestion} initialQuestion={initialQuestion} />
    </div>
  );
}
