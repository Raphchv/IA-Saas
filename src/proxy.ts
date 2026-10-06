import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Redirection rapide vers /login si aucun cookie de session n'est présent.
 * Ce n'est PAS une vérification de sécurité (un cookie peut être expiré ou faux) :
 * chaque page protégée appelle aussi `requireUser()` côté serveur.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Uniquement les pages de l'application. Les routes /api ne passent pas par
  // le proxy (elles vérifient la session elles-mêmes) : cela évite aussi que
  // le proxy mette en mémoire tampon les gros fichiers uploadés.
  matcher: ["/dashboard/:path*", "/import/:path*", "/conversations/:path*", "/search/:path*", "/ask/:path*", "/settings/:path*"],
};
