import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Toutes les routes /api/auth/* (inscription, connexion, déconnexion…)
// sont gérées par Better Auth.
export const { GET, POST } = toNextJsHandler(auth);
