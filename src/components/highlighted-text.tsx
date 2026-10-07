import type { Segment } from "@/server/search/engine";

/** Affiche un texte dont certains passages (mots trouvés) sont surlignés. */
export function HighlightedText({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        segment.match ? (
          <mark key={i} className="rounded-sm bg-amber-200/70 px-0.5 text-fg dark:bg-amber-400/30">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
  );
}
