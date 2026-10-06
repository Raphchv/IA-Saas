import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Créer un compte</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Gratuit, sans carte bancaire.</p>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
