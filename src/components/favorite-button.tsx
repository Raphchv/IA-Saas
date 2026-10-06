"use client";

import { Star } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/(app)/actions";

export function FavoriteButton({ conversationId, isFavorite }: { conversationId: string; isFavorite: boolean }) {
  const [pending, startTransition] = useTransition();
  // Mise à jour immédiate à l'écran, confirmée ensuite par le serveur.
  const [optimistic, setOptimistic] = useOptimistic(isFavorite);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleFavoriteAction(conversationId);
        })
      }
      aria-pressed={optimistic}
      title={optimistic ? "Retirer des favoris" : "Ajouter aux favoris"}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-subtle hover:text-fg"
    >
      <Star className={`size-4 ${optimistic ? "fill-amber-400 text-amber-400" : ""}`} />
    </button>
  );
}
