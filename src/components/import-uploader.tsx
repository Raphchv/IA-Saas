"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, FileArchive, Loader2, X } from "lucide-react";
import { Alert, Button, buttonClass, Card } from "@/components/ui";
import { formatNumber } from "@/lib/format";

type ImportStatus = {
  id: string;
  status: "PARSING" | "IMPORTING" | "INDEXING" | "COMPLETED" | "FAILED";
  totalConversations: number;
  importedConversations: number;
  skippedConversations: number;
  totalChunks: number;
  indexedChunks: number;
  error: string | null;
};

type State =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "processing"; data: ImportStatus | null; importId: string }
  | { phase: "error"; message: string };

const STEPS = ["Upload", "Analyse du fichier", "Import des conversations", "Indexation", "Terminé"];
const STEP_INDEX: Record<ImportStatus["status"], number> = { PARSING: 1, IMPORTING: 2, INDEXING: 3, COMPLETED: 4, FAILED: -1 };

export function ImportUploader({ maxUploadMb, activeImportId }: { maxUploadMb: number; activeImportId: string | null }) {
  const [state, setState] = useState<State>(
    activeImportId ? { phase: "processing", data: null, importId: activeImportId } : { phase: "idle" },
  );
  const [dragging, setDragging] = useState(false);

  // Interroge l'avancement de l'import toutes les 1,5 s.
  const importId = state.phase === "processing" ? state.importId : null;
  useEffect(() => {
    if (!importId) return;
    let stopped = false;
    async function poll() {
      try {
        const response = await fetch(`/api/imports/${importId}`, { cache: "no-store" });
        const data = await response.json();
        if (stopped) return;
        if (!response.ok) return setState({ phase: "error", message: data.error ?? "Import introuvable." });
        setState({ phase: "processing", data, importId: importId! });
        if (data.status !== "COMPLETED" && data.status !== "FAILED") setTimeout(poll, 1500);
      } catch {
        if (!stopped) setTimeout(poll, 3000); // problème réseau passager : on réessaie
      }
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [importId]);

  const upload = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        return setState({ phase: "error", message: "Le fichier doit être une archive .zip." });
      }
      if (file.size > maxUploadMb * 1024 * 1024) {
        return setState({ phase: "error", message: `Fichier trop volumineux (maximum ${maxUploadMb} Mo).` });
      }

      // XMLHttpRequest (et pas fetch) : c'est le seul moyen de suivre la progression de l'envoi.
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/imports");
      xhr.setRequestHeader("Content-Type", "application/zip");
      xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setState({ phase: "uploading", progress: e.loaded / e.total });
      };
      xhr.onload = () => {
        let body: { id?: string; error?: string } = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status === 202 && body.id) setState({ phase: "processing", data: null, importId: body.id });
        else setState({ phase: "error", message: body.error ?? "L'envoi a échoué. Veuillez réessayer." });
      };
      xhr.onerror = () => setState({ phase: "error", message: "L'envoi a échoué (connexion interrompue)." });
      setState({ phase: "uploading", progress: 0 });
      xhr.send(file);
    },
    [maxUploadMb],
  );

  if (state.phase === "idle" || state.phase === "error") {
    return (
      <div className="space-y-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) upload(file);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50"
          }`}
        >
          <FileArchive className="mb-3 size-8 text-muted" />
          <p className="font-medium">Déposez votre export ChatGPT ici</p>
          <p className="mt-1 text-sm text-muted">ou cliquez pour choisir le fichier .zip (max. {maxUploadMb} Mo)</p>
          <input
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {state.phase === "error" && <Alert>{state.message}</Alert>}
      </div>
    );
  }

  const data = state.phase === "processing" ? state.data : null;
  const current = state.phase === "uploading" ? 0 : data ? STEP_INDEX[data.status] : 1;

  if (data?.status === "FAILED") {
    return (
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 font-medium text-danger">
          <X className="size-5" /> L&apos;import a échoué
        </div>
        <p className="text-sm text-muted">{data.error}</p>
        <Button variant="secondary" onClick={() => setState({ phase: "idle" })}>Réessayer</Button>
      </Card>
    );
  }

  if (data?.status === "COMPLETED") {
    return (
      <Card className="space-y-5 p-6 text-center sm:p-10">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Votre historique est prêt.</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{formatNumber(data.importedConversations)}</p>
          <p className="text-sm text-muted">conversations importées</p>
          {data.skippedConversations > 0 && (
            <p className="mt-2 text-xs text-muted">
              {formatNumber(data.skippedConversations)} conversation(s) vide(s) ou illisible(s) ignorée(s).
            </p>
          )}
        </div>
        {data.error && <Alert tone="warning">{data.error}</Alert>}
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/search" className={buttonClass("secondary")}>Rechercher</Link>
          <Link href="/ask" className={buttonClass("primary")}>Ask my history</Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <ol className="space-y-4">
        {STEPS.slice(0, 4).map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                  done ? "bg-success text-white" : active ? "bg-accent text-white" : "bg-subtle text-muted"
                }`}
              >
                {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : index + 1}
              </span>
              <span className={`text-sm ${active ? "font-medium" : done ? "" : "text-muted"}`}>{label}</span>
              {active && <span className="ml-auto text-xs tabular-nums text-muted">{stepDetail(index, state, data)}</span>}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-muted">Vous pouvez quitter cette page : l&apos;import continue en arrière-plan.</p>
    </Card>
  );
}

function stepDetail(index: number, state: State, data: ImportStatus | null) {
  if (index === 0 && state.phase === "uploading") return `${Math.round(state.progress * 100)} %`;
  if (index === 2 && data) return `${formatNumber(data.importedConversations)} / ${formatNumber(data.totalConversations)}`;
  if (index === 3 && data && data.totalChunks > 0) return `${Math.round((data.indexedChunks / data.totalChunks) * 100)} %`;
  return "";
}
