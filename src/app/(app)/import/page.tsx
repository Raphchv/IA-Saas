import type { Metadata } from "next";
import { ImportUploader } from "@/components/import-uploader";
import { env } from "@/lib/env";
import { findActiveImport } from "@/server/imports";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Importer" };

export default async function ImportPage() {
  const user = await requireUser();
  const active = await findActiveImport(user.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Importer mon historique</h1>
        <p className="mt-1 text-sm text-muted">
          Réimporter un export plus récent ajoute les nouvelles conversations sans créer de doublons.
        </p>
      </header>

      <ImportUploader maxUploadMb={env.MAX_UPLOAD_MB} activeImportId={active?.id ?? null} />

      <section className="grid gap-6 text-sm sm:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-medium">Comment obtenir mon export ChatGPT ?</h2>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Dans ChatGPT, ouvrez <strong className="text-fg">Paramètres → Gestion des données</strong>.</li>
            <li>Cliquez sur <strong className="text-fg">Exporter les données</strong> et confirmez.</li>
            <li>Vous recevez un email avec un lien de téléchargement (quelques minutes).</li>
            <li>Déposez le fichier <strong className="text-fg">.zip</strong> reçu ci-dessus, sans le décompresser.</li>
          </ol>
        </div>
        <div className="space-y-2">
          <h2 className="font-medium">Que devient mon fichier ?</h2>
          <p className="text-muted">
            Seules vos conversations sont lues. L&apos;archive est traitée en mémoire puis immédiatement oubliée :
            elle n&apos;est jamais enregistrée sur nos serveurs. Les images et fichiers audio de l&apos;export sont ignorés.
          </p>
        </div>
      </section>
    </div>
  );
}
