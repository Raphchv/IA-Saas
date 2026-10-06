import Link from "next/link";
import {
  ArrowRight,
  Database,
  EyeOff,
  FileArchive,
  Lock,
  MessagesSquare,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/server/session";

const FAQ = [
  {
    q: "AI Toolbox est-il vraiment gratuit ?",
    a: "Oui. Pendant toute la phase de lancement, l'ensemble des fonctionnalités est gratuit, sans carte bancaire.",
  },
  {
    q: "Quelles IA sont prises en charge ?",
    a: "ChatGPT pour le moment. Les exports de Claude et Gemini arrivent ensuite : l'application a été conçue pour les accueillir.",
  },
  {
    q: "Comment récupérer mon historique ChatGPT ?",
    a: "Dans ChatGPT : Paramètres → Gestion des données → Exporter les données. Vous recevez un fichier .zip par email, qu'il suffit de déposer dans AI Toolbox.",
  },
  {
    q: "L'IA peut-elle inventer des réponses ?",
    a: "Ask my history répond uniquement à partir de vos conversations et affiche toujours ses sources. Si votre historique ne contient pas la réponse, il vous le dit.",
  },
  {
    q: "Puis-je supprimer mes données ?",
    a: "À tout moment, en un clic depuis les paramètres : une conversation, toutes vos données, ou votre compte entier.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user
    ? { href: "/dashboard", label: "Ouvrir mon dashboard" }
    : { href: "/signup", label: "Commencer gratuitement" };

  return (
    <>
      <SiteHeader isLoggedIn={Boolean(user)} />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted shadow-sm">
            <Sparkles className="size-3.5 text-accent" /> Gratuit pendant le lancement
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Ne perdez plus jamais une idée trouvée avec une IA.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            AI Toolbox transforme vos conversations avec ChatGPT et vos autres IA en une base de connaissances
            personnelle, consultable en quelques secondes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={cta.href} className={buttonClass("primary", "lg")}>
              {cta.label} <ArrowRight className="size-4" />
            </Link>
            <a href="#fonctionnement" className={buttonClass("ghost", "lg")}>
              Comment ça marche
            </a>
          </div>
          <HeroPreview />
        </section>

        {/* 1. Le problème */}
        <Section id="probleme" eyebrow="Le problème" title="Vos meilleures idées dorment dans des centaines de conversations.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature icon={MessagesSquare} title="Des centaines de fils">
              Idées de projets, conseils, décisions… tout est éparpillé dans un historique que personne ne relit.
            </Feature>
            <Feature icon={Search} title="Une recherche limitée">
              Retrouver « cette conversation où l&apos;on parlait de mon stage » relève du défilement sans fin.
            </Feature>
            <Feature icon={EyeOff} title="Un savoir perdu">
              Ce que vous avez déjà réfléchi, comparé ou décidé est oublié, et vous recommencez de zéro.
            </Feature>
          </div>
        </Section>

        {/* 2. Comment ça fonctionne */}
        <Section id="fonctionnement" eyebrow="Comment ça fonctionne" title="Trois étapes, quelques minutes.">
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: FileArchive, title: "Exportez", text: "Demandez l'export de vos données dans les paramètres de ChatGPT." },
              { icon: Upload, title: "Importez", text: "Déposez le fichier .zip : vos conversations sont analysées et indexées." },
              { icon: Sparkles, title: "Retrouvez", text: "Recherchez, ou posez directement vos questions à votre historique." },
            ].map((step, i) => (
              <li key={step.title} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <span className="text-xs font-medium text-accent">Étape {i + 1}</span>
                <step.icon className="mt-3 size-5" />
                <p className="mt-3 font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* 3. Recherche intelligente */}
        <Section id="recherche" eyebrow="Recherche intelligente" title="Cherchez une idée, pas un mot exact.">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <p className="text-muted">
              AI Toolbox comprend le sens de votre recherche. Tapez « mes idées de SaaS » et retrouvez la conversation où
              vous parliez d&apos;un « projet de startup », même si les mots ne correspondent pas.
            </p>
            <div className="space-y-2 rounded-xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <Search className="size-4 text-muted" /> mes idées de SaaS
              </div>
              {["Projet de startup pour les freelances", "Brainstorm : outil de prise de notes IA", "Business plan application fitness"].map(
                (title) => (
                  <div key={title} className="rounded-lg px-3 py-2 text-sm hover:bg-subtle">
                    {title}
                  </div>
                ),
              )}
            </div>
          </div>
        </Section>

        {/* 4. Ask my history */}
        <Section id="ask" eyebrow="Ask my history" title="Posez une question à tout votre historique.">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="order-2 space-y-3 rounded-xl border border-line bg-surface p-4 text-sm shadow-sm md:order-1">
              <p className="rounded-lg bg-accent-soft px-3 py-2">Quelles idées de SaaS ai-je abandonnées et pourquoi ?</p>
              <p className="leading-relaxed">
                Vous avez mis de côté l&apos;application de fitness, jugée trop concurrentielle{" "}
                <Cite n={1} />, et l&apos;outil pour freelances, faute de temps pour le développer <Cite n={2} />.
              </p>
              <div className="space-y-1 border-t border-line pt-3 text-xs text-muted">
                <p><Cite n={1} /> Business plan application fitness · mars 2025</p>
                <p><Cite n={2} /> Projet de startup pour les freelances · juin 2025</p>
              </div>
            </div>
            <div className="order-1 space-y-3 text-muted md:order-2">
              <p>
                AI Toolbox retrouve les passages pertinents de vos conversations et en tire une réponse claire, avec les
                sources pour vérifier.
              </p>
              <p>
                Il ne répond <strong className="text-fg">qu&apos;à partir de vos propres conversations</strong>. Si
                l&apos;information n&apos;y est pas, il vous le dit plutôt que d&apos;inventer.
              </p>
            </div>
          </div>
        </Section>

        {/* 5. Confidentialité */}
        <Section id="confidentialite" eyebrow="Confidentialité" title="Vos conversations restent les vôtres.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Lock} title="Isolées">
              Vos données ne sont accessibles qu&apos;à votre compte. Jamais partagées, jamais vendues.
            </Feature>
            <Feature icon={FileArchive} title="Archive non conservée">
              Le fichier .zip est lu en mémoire puis oublié : il n&apos;est jamais stocké.
            </Feature>
            <Feature icon={Database} title="Le strict nécessaire">
              Seul le texte de vos conversations est conservé ; images et audios sont ignorés.
            </Feature>
            <Feature icon={Trash2} title="Suppression en un clic">
              Supprimez une conversation, toutes vos données ou votre compte à tout moment.
            </Feature>
          </div>
          <p className="mt-6 text-sm">
            <Link href="/privacy" className="text-accent hover:underline">
              Lire la politique de confidentialité →
            </Link>
          </p>
        </Section>

        {/* 6. FAQ */}
        <Section id="faq" eyebrow="FAQ" title="Questions fréquentes">
          <div className="divide-y divide-line rounded-xl border border-line bg-surface shadow-sm">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Votre historique IA mérite mieux qu&apos;un défilement sans fin.</h2>
          <Link href={cta.href} className={buttonClass("primary", "lg", "mt-8")}>
            {cta.label} <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16">
      <p className="text-sm font-medium text-accent">{eyebrow}</p>
      <h2 className="mb-8 mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Feature({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <Icon className="size-5 text-accent" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

function Cite({ n }: { n: number }) {
  return <span className="rounded bg-accent-soft px-1 text-xs font-medium text-accent">{n}</span>;
}

/** Aperçu stylisé de l'application (HTML pur, pas d'image). */
function HeroPreview() {
  return (
    <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-line bg-surface p-2 text-left shadow-xl shadow-black/5">
      <div className="rounded-xl border border-line bg-bg p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm shadow-sm">
          <Sparkles className="size-4 text-accent" />
          <span>Qu&apos;avais-je décidé pour le nom de mon projet ?</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          Vous aviez retenu « Nova » pour sa simplicité <Cite n={1} />, après avoir écarté « Brainly », déjà utilisé{" "}
          <Cite n={2} />.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {["Brainstorm nom de marque", "Vérification des noms disponibles"].map((title, i) => (
            <div key={title} className="rounded-lg border border-line bg-surface px-3 py-2 text-xs">
              <Cite n={i + 1} /> <span className="ml-1">{title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
