"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteConversationAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui";

export function DeleteConversationButton({ conversationId }: { conversationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Supprimer définitivement cette conversation ?")) return;
        startTransition(() => deleteConversationAction(conversationId));
      }}
    >
      <Trash2 className="size-4" /> {pending ? "Suppression…" : "Supprimer"}
    </Button>
  );
}
