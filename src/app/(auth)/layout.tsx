import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { getCurrentUser } from "@/server/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // Déjà connecté : inutile d'afficher la connexion.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
