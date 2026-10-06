"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Alert, Button, Input } from "@/components/ui";

/** N'accepte qu'un chemin interne (évite les redirections vers un site externe). */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name") || email.split("@")[0]) })
        : await authClient.signIn.email({ email, password });

    if (error) {
      setPending(false);
      setError(translateError(error.code, mode));
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <Field label="Prénom">
          <Input name="name" autoComplete="given-name" maxLength={80} placeholder="Camille" />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" />
      </Field>
      <Field label="Mot de passe">
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "8 caractères minimum" : ""}
        />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Un instant…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <Link
          href={`${mode === "signup" ? "/login" : "/signup"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-accent hover:underline"
        >
          {mode === "signup" ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function translateError(code: string | undefined, mode: "login" | "signup") {
  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Un compte existe déjà avec cet email.";
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email ou mot de passe incorrect.";
    case "PASSWORD_TOO_SHORT":
      return "Le mot de passe doit contenir au moins 8 caractères.";
    case "INVALID_EMAIL":
      return "Adresse email invalide.";
    default:
      return mode === "signup" ? "Impossible de créer le compte. Veuillez réessayer." : "Connexion impossible. Veuillez réessayer.";
  }
}
