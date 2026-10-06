import { createAuthClient } from "better-auth/react";

// Client utilisé dans le navigateur (formulaires de connexion/inscription).
// Il ne contient aucun secret : il appelle simplement /api/auth/*.
export const authClient = createAuthClient();
