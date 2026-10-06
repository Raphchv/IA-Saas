import type { Metadata } from "next";
import Link from "next/link";
import { DangerZone } from "@/components/danger-zone";
import { Card } from "@/components/ui";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Compte</h2>
        <Card className="divide-y divide-line text-sm">
          <div className="flex justify-between gap-4 p-4">
            <span className="text-muted">Nom</span>
            <span className="truncate">{user.name}</span>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <span className="text-muted">Email</span>
            <span className="truncate">{user.email}</span>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Données et confidentialité</h2>
        <p className="text-sm text-muted">
          Ce que nous stockons et pourquoi est détaillé sur la page{" "}
          <Link href="/privacy" className="text-accent hover:underline">Confidentialité</Link>.
        </p>
        <Card className="border-danger/30">
          <DangerZone />
        </Card>
      </section>
    </div>
  );
}
