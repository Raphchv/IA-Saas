import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Bon retour</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Connectez-vous pour retrouver votre historique.</p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
