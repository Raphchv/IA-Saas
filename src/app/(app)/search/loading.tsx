/** Affiché pendant la recherche (Next.js l'utilise automatiquement). */
export default function SearchLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Recherche en cours">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rechercher dans mon historique</h1>
        <p className="mt-1 text-sm text-muted">Recherche en cours…</p>
      </div>
      <div className="h-12 animate-pulse rounded-xl border border-line bg-surface" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse space-y-3 rounded-xl border border-line bg-surface p-4">
            <div className="h-4 w-1/2 rounded bg-subtle" />
            <div className="h-3 w-1/4 rounded bg-subtle" />
            <div className="h-3 w-full rounded bg-subtle" />
            <div className="h-3 w-5/6 rounded bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
