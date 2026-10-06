import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Optionnel ici : `prisma generate` (lancé par npm install) n'en a pas besoin,
    // seules les commandes de migration l'utilisent.
    url: process.env.DATABASE_URL,
  },
});
