"use client";

import { useTransition } from "react";
import { deleteAccountAction, deleteAllDataAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui";

export function DangerZone() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="divide-y divide-line">
      <Row
        title="Supprimer toutes mes données"
        description="Conversations, messages, index de recherche, favoris et historique d'import. Votre compte est conservé."
      >
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (confirm("Supprimer définitivement toutes vos conversations importées ? Cette action est irréversible.")) {
              startTransition(() => deleteAllDataAction());
            }
          }}
        >
          Supprimer mes données
        </Button>
      </Row>
      <Row title="Supprimer mon compte" description="Supprime votre compte et absolument toutes les données associées.">
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (confirm("Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.")) {
              startTransition(() => deleteAccountAction());
            }
          }}
        >
          Supprimer mon compte
        </Button>
      </Row>
    </div>
  );
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
