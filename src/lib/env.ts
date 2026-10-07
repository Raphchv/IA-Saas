import "server-only";
import { z } from "zod";

/**
 * Variables d'environnement validées au démarrage.
 * `server-only` garantit que ce fichier (et donc les secrets) ne peut
 * jamais être importé dans du code envoyé au navigateur.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit faire au moins 32 caractères"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(500),
});

// Une valeur vide dans .env (ex: MAX_UPLOAD_MB="") est traitée comme absente.
const raw = Object.fromEntries(
  Object.keys(schema.shape).map((key) => [key, process.env[key] || undefined]),
);

export const env = schema.parse(raw);
