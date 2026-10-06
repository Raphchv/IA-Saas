import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page introuvable</h1>
      <p className="text-sm text-muted">Cette page n&apos;existe pas, ou vous n&apos;y avez pas accès.</p>
      <Link href="/dashboard" className={buttonClass("secondary")}>Retour au dashboard</Link>
    </main>
  );
}
