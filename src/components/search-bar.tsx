"use client";

import Form from "next/form";
import { useFormStatus } from "react-dom";
import { Loader2, Search } from "lucide-react";

/**
 * Barre de recherche : envoie vers /search?q=… (fonctionne même sans JavaScript).
 * Avec JavaScript, `Form` affiche immédiatement l'écran de chargement.
 */
export function SearchBar({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <Form action="/search" className="relative" role="search">
      <SearchIcon />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        maxLength={300}
        placeholder="Rechercher dans mon historique…"
        aria-label="Rechercher dans mon historique"
        className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-[15px] shadow-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </Form>
  );
}

function SearchIcon() {
  const { pending } = useFormStatus();
  const className = "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted";
  return pending ? <Loader2 className={`${className} animate-spin`} /> : <Search className={className} />;
}
