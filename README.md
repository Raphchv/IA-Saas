# AI Toolbox

Le deuxième cerveau pour vos conversations IA : importez votre historique ChatGPT, recherchez-y par le sens, et posez-lui des questions (« Ask my history »).

MVP entièrement gratuit : pas de paiement, pas d'abonnement.

## Démarrer en local

Prérequis : [Node.js 22+](https://nodejs.org) et [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Installer les dépendances (génère aussi le client Prisma)
npm install

# 2. Créer votre fichier de configuration
cp .env.example .env
#    puis ouvrez .env et remplissez :
#    - BETTER_AUTH_SECRET : générez-le avec `openssl rand -base64 32`
#    - OPENAI_API_KEY     : https://platform.openai.com/api-keys

# 3. Lancer la base de données (Postgres + pgvector)
docker compose up -d

# 4. Créer les tables
npm run db:migrate

# 5. Lancer l'application
npm run dev
```

Ouvrez ensuite http://localhost:3000.

Sans clé OpenAI, l'import et la recherche par mots-clés fonctionnent quand même. La recherche par le sens et Ask my history, eux, ont besoin de la clé.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests automatiques (parser d'import…) |
| `npm run lint` / `npm run typecheck` | Vérifications du code |
| `npm run db:migrate` | Appliquer une modification de `prisma/schema.prisma` |
| `npm run db:studio` | Explorer la base de données dans le navigateur |

## Architecture

```
src/
├── app/                      Pages et routes (Next.js App Router)
│   ├── page.tsx              Landing page publique
│   ├── privacy/              Page Confidentialité
│   ├── (auth)/               Connexion / inscription
│   ├── (app)/                Application connectée (dashboard, import, recherche, ask…)
│   │   └── actions.ts        Server Actions (favori, suppression, Ask my history)
│   └── api/
│       ├── auth/             Routes d'authentification (Better Auth)
│       └── imports/          Upload du ZIP + suivi de l'avancement
├── components/               Composants d'interface
├── lib/                      Configuration (env, base de données, auth)
├── server/                   Logique métier, exécutée uniquement côté serveur
│   ├── importers/            Parsers d'export (un fichier par fournisseur)
│   ├── imports.ts            Pipeline d'import : analyse → stockage → indexation
│   ├── chunking.ts           Découpage des conversations en extraits
│   ├── search.ts             Recherche hybride (mots-clés + sens)
│   ├── ask.ts                Ask my history (RAG)
│   └── conversations.ts      Accès aux conversations (toujours filtré par utilisateur)
└── proxy.ts                  Redirection rapide vers /login
prisma/schema.prisma          Schéma de la base de données
```

### Le pipeline d'import

```
ZIP (en mémoire, jamais écrit sur disque)
 → extraction des seuls fichiers utiles (conversations*.json)
 → détection du format → parser (ChatGPT)
 → format commun NormalizedConversation
 → stockage (Conversation + Message) + découpage en extraits
 → embeddings OpenAI (recherche par le sens) → terminé
```

L'import tourne en arrière-plan. La page d'import interroge `/api/imports/[id]` pour afficher la progression.

### Ajouter une nouvelle source (Claude, Gemini…)

1. Ajouter la valeur dans l'enum `ConversationSource` de `prisma/schema.prisma`, puis lancer `npm run db:migrate`.
2. Créer `src/server/importers/claude.ts`, qui implémente l'interface `ImportParser` (voir `types.ts` et `chatgpt.ts`).
3. L'ajouter au tableau `parsers` dans `src/server/importers/index.ts`.
4. Ajouter son nom dans `SOURCE_LABELS` (`src/lib/format.ts`).

### Recherche et Ask my history

- **Recherche** : on combine l'index plein texte de Postgres (les mots exacts) et la similarité entre embeddings, via pgvector (le sens). Les deux classements sont fusionnés.
- **Ask my history** : on cherche les extraits les plus pertinents, puis on les transmet à l'IA avec la consigne de répondre *uniquement* à partir de ces extraits, en citant ses sources. Si rien de pertinent n'est trouvé, on répond « Je n'ai pas trouvé suffisamment d'informations dans votre historique. » sans même appeler l'IA.

## Sécurité et confidentialité

- **Isolation des données.** Chaque table porte un `userId`, et chaque requête filtre dessus (`src/server/*`). La conversation d'un autre utilisateur renvoie une 404.
- **Vérification de session partout.** Chaque page, Server Action et route API revérifie la session côté serveur (`requireUser()` / `getCurrentUser()`).
- **Fichiers uploadés.** Taille limitée (`MAX_UPLOAD_MB`), vérification de la signature ZIP, protection contre les « zip bombs », et aucune écriture sur disque.
- **Secrets.** Ils restent dans `.env`, qui est ignoré par git, et ne sont lus que dans du code `server-only`.
- **Suppression.** Une conversation, toutes les données ou le compte entier (suppression en cascade).
