// Assistant de configuration : crée le fichier .env en posant 2 questions.
// Lancé automatiquement par lancer-windows.bat (ou : node scripts/setup.mjs).
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

if (existsSync(".env")) {
  console.log("Configuration deja presente (.env) : on passe a la suite.");
  process.exit(0);
}

const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(question) {
  process.stdout.write(question);
  const { value, done } = await lines.next();
  if (done) {
    console.log("\nConfiguration annulee.");
    process.exit(1);
  }
  return value.trim().replace(/^["']|["']$/g, "");
}

console.log("\n=== Configuration d'AI Toolbox (une seule fois) ===\n");
console.log("1) Colle l'adresse de ta base Neon (elle commence par postgresql://)");
console.log("   Astuce : dans cette fenetre, clic droit = coller.\n");

let databaseUrl = "";
while (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  databaseUrl = await ask("Adresse Neon : ");
  // Accepte aussi la commande copiee depuis Neon : psql 'postgresql://...'
  databaseUrl = databaseUrl.replace(/^psql\s+/, "").replace(/^["']|["']$/g, "");
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    console.log("   -> Ce n'est pas une adresse valide. Elle doit commencer par postgresql://\n");
  }
}
// Connexion directe (sans "-pooler") : necessaire pour creer les tables.
databaseUrl = databaseUrl.replace("-pooler.", ".");

console.log("\n2) Cle OpenAI (facultatif) : colle-la, ou appuie juste sur Entree pour passer.");
console.log("   Sans cle : import et recherche par mots-cles OK, mais pas Ask my history.\n");
const openaiKey = await ask("Cle OpenAI : ");
rl.close();

const set = (text, key, value) => text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}="${value}"`);
let env = readFileSync(".env.example", "utf8");
env = set(env, "DATABASE_URL", databaseUrl);
env = set(env, "BETTER_AUTH_SECRET", randomBytes(32).toString("base64"));
env = set(env, "OPENAI_API_KEY", openaiKey);
writeFileSync(".env", env);

console.log("\nConfiguration enregistree dans le fichier .env\n");
