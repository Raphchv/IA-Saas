import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Confidentialité" };

export default async function PrivacyPage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader isLoggedIn={Boolean(user)} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Confidentialité</h1>
        <p className="mt-2 text-sm text-muted">Dernière mise à jour : octobre 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted">
          <p>
            Vos conversations avec des IA peuvent contenir des informations personnelles. Cette page explique
            simplement ce qu&apos;AI Toolbox stocke, pourquoi, et comment tout supprimer.
          </p>

          <section>
            <h2>Ce que nous stockons</h2>
            <ul>
              <li><strong className="text-fg">Votre compte</strong> : nom, adresse email et mot de passe (chiffré, jamais lisible).</li>
              <li><strong className="text-fg">Vos sessions de connexion</strong> : adresse IP et navigateur, pour sécuriser votre compte.</li>
              <li>
                <strong className="text-fg">Vos conversations importées</strong> : titres, dates et texte de vos messages et des réponses
                de l&apos;IA.
              </li>
              <li>
                <strong className="text-fg">Un index de recherche</strong> : des extraits de ces conversations, préparés pour
                que la recherche soit rapide.
              </li>
              <li><strong className="text-fg">Vos favoris</strong> et un historique de vos imports (nom et taille du fichier, nombre de conversations).</li>
            </ul>
          </section>

          <section>
            <h2>Ce que nous ne stockons pas</h2>
            <ul>
              <li>
                <strong className="text-fg">Le fichier .zip que vous importez.</strong> Il est lu en mémoire, seules les conversations en
                sont extraites, puis il est oublié. Il n&apos;est jamais écrit sur nos serveurs.
              </li>
              <li>Les images, fichiers audio et pièces jointes contenus dans votre export.</li>
              <li>Les messages techniques (instructions système, appels d&apos;outils, raisonnements internes de l&apos;IA).</li>
              <li>Aucun cookie publicitaire ni outil de suivi. Seul un cookie de session vous garde connecté.</li>
            </ul>
          </section>

          <section>
            <h2>Qui peut voir vos données</h2>
            <ul>
              <li>Vos conversations ne sont accessibles qu&apos;à votre compte. Elles ne sont ni partagées, ni vendues, ni publiées.</li>
              <li>
                Aucun service d&apos;intelligence artificielle externe n&apos;est utilisé : la recherche fonctionne
                entièrement dans AI Toolbox, et vos conversations ne sont transmises à aucun tiers.
              </li>
            </ul>
          </section>

          <section>
            <h2>Supprimer vos données</h2>
            <ul>
              <li>Une conversation : bouton « Supprimer » sur la conversation.</li>
              <li>Toutes vos conversations : Paramètres → « Supprimer mes données ». Votre compte est conservé.</li>
              <li>
                Votre compte : Paramètres → « Supprimer mon compte ». Votre compte et absolument toutes les données associées
                sont définitivement effacés.
              </li>
            </ul>
          </section>

        </div>
      </main>
      <SiteFooter />
    </>
  );
}
