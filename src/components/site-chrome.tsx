import Link from "next/link";
import { buttonClass, Logo } from "@/components/ui";

/** En-tête et pied de page des pages publiques (landing, confidentialité). */
export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/#fonctionnement" className="hidden px-3 py-1.5 text-muted hover:text-fg sm:block">
            Fonctionnement
          </Link>
          <Link href="/#faq" className="hidden px-3 py-1.5 text-muted hover:text-fg sm:block">
            FAQ
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className={buttonClass("primary", "sm", "ml-2")}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 text-muted hover:text-fg">
                Connexion
              </Link>
              <Link href="/signup" className={buttonClass("primary", "sm", "ml-1")}>
                Commencer
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row">
        <Logo className="text-fg" />
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-fg">Confidentialité</Link>
          <Link href="/#faq" className="hover:text-fg">FAQ</Link>
        </nav>
      </div>
    </footer>
  );
}
