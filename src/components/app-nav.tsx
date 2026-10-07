"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, LogOut, MessagesSquare, Search, Settings, Star, Upload } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Rechercher", icon: Search },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/conversations?favorites=1", label: "Favoris", icon: Star },
  { href: "/import", label: "Importer", icon: Upload },
];

export function AppNav() {
  const pathname = usePathname();
  // Favoris et Conversations partagent la même page : on regarde aussi le paramètre.
  const isFavorites = useSearchParams().has("favorites");

  function isActive(href: string) {
    const [path, query] = href.split("?");
    if (path !== pathname && !(path === "/conversations" && pathname.startsWith("/conversations/"))) return false;
    if (path === "/conversations") return Boolean(query) === isFavorites;
    return true;
  }

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            isActive(href) ? "bg-subtle font-medium text-fg" : "text-muted hover:bg-subtle hover:text-fg"
          }`}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AccountMenu({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 md:flex-col md:items-stretch">
      <Link
        href="/settings"
        className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          pathname === "/settings" ? "bg-subtle font-medium text-fg" : "text-muted hover:bg-subtle hover:text-fg"
        }`}
      >
        <Settings className="size-4" />
        <span className="hidden md:inline">Paramètres</span>
      </Link>
      <button
        onClick={signOut}
        className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-fg"
        title={`Déconnexion (${email})`}
      >
        <LogOut className="size-4" />
        <span className="hidden md:inline">Déconnexion</span>
      </button>
      <p className="hidden truncate px-2.5 pt-2 text-xs text-muted md:block">{email}</p>
    </div>
  );
}
