import { Search } from "lucide-react";

/** Simple formulaire GET vers /search : fonctionne même sans JavaScript. */
export function SearchBar({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        maxLength={500}
        placeholder="Rechercher dans mon historique…"
        className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-[15px] shadow-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </form>
  );
}
