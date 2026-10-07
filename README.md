# AI Toolbox

Le deuxième cerveau pour vos conversations IA : importez votre historique ChatGPT, puis recherchez-y naturellement.

Aucune IA externe ni API payante : la recherche fonctionne entièrement dans l'application.

MVP entièrement gratuit : pas de paiement, pas d'abonnement.

## Démarrage facile sur Windows (sans Docker)

1. Installez [Node.js](https://nodejs.org) (bouton « LTS »).
2. Créez une base de données gratuite sur [Neon](https://neon.tech), puis copiez son adresse (`postgresql://…`).
3. Double-cliquez sur **`lancer-windows.bat`**. Au premier lancement, il installe tout et vous demande l'adresse Neon. Ensuite, il ouvre le site dans votre navigateur.

Pour arrêter l'application, fermez la fenêtre noire. Pour la relancer, double-cliquez de nouveau sur le fichier.

## Démarrer en local (avec Docker)

Prérequis : [Node.js 22+](https://nodejs.org) et [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Installer les dépendances (génère aussi le client Prisma)
npm install

# 2. Créer votre fichier de configuration
cp .env.example .env
#    puis ouvrez .env et remplissez :
#    - BETTER_AUTH_SECRET : générez-le avec `openssl rand -base64 32`

# 3. Lancer la base de données (Postgres)
docker compose up -d

# 4. Créer les tables
npm run db:migrate

# 5. Lancer l'application
npm run dev
```

Ouvrez ensuite http://localhost:3000.

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
│   ├── (app)/                Application connectée (dashboard, import, recherche…)
│   │   └── actions.ts        Server Actions (favori, suppression)
│   └── api/
│       ├── auth/             Routes d'authentification (Better Auth)
│       └── imports/          Upload du ZIP + suivi de l'avancement
├── components/               Composants d'interface
├── lib/                      Configuration (env, base de données, auth)
├── server/                   Logique métier, exécutée uniquement côté serveur
│   ├── importers/            Parsers d'export (un fichier par fournisseur)
│   ├── imports.ts            Pipeline d'import : analyse → stockage → indexation
│   ├── chunking.ts           Découpage des conversations en extraits
│   ├── search/               Moteur de recherche (sans IA)
│   │   ├── text.ts           Accents, mots vides, pluriels
│   │   ├── synonyms.ts       Dictionnaire de termes associés (à enrichir)
│   │   ├── engine.ts         Score de pertinence, extraits, surlignage
│   │   └── index.ts          Index PostgreSQL + recherche par utilisateur
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
 → index de recherche (texte sans accents) → terminé
```

L'import tourne en arrière-plan. La page d'import interroge `/api/imports/[id]` pour afficher la progression.

### Ajouter une nouvelle source (Claude, Gemini…)

1. Ajouter la valeur dans l'enum `ConversationSource` de `prisma/schema.prisma`, puis lancer `npm run db:migrate`.
2. Créer `src/server/importers/claude.ts`, qui implémente l'interface `ImportParser` (voir `types.ts` et `chatgpt.ts`).
3. L'ajouter au tableau `parsers` dans `src/server/importers/index.ts`.
4. Ajouter son nom dans `SOURCE_LABELS` (`src/lib/format.ts`).

### Le moteur de recherche (sans IA)

1. **Analyse de la recherche** : on retire les mots vides (« mes », « les conversations où je parle de »…). Les accents, majuscules et pluriels sont ignorés (« idées » trouve « idée »).
2. **Termes associés** : `src/server/search/synonyms.ts` associe des mots (« saas » → startup, business…). Ils améliorent le classement, mais un terme associé isolé ne fait jamais apparaître une conversation : il faut un mot de la recherche, ou au moins deux indices différents.
3. **Candidats** : l'index plein texte de PostgreSQL trouve rapidement les extraits qui contiennent ces mots, uniquement parmi ceux de l'utilisateur connecté.
4. **Score** : un mot dans le titre compte plus que dans le texte, contenir tous les mots est récompensé, et les mots qui se suivent donnent un bonus.
5. **Affichage** : classement, indicateur de pertinence, extrait centré sur le passage trouvé et mots surlignés (aussi dans la conversation ouverte).

Pour améliorer les résultats d'un domaine, enrichissez `synonyms.ts`, puis vérifiez avec `npm test`.

## Sécurité et confidentialité

- **Isolation des données.** Chaque table porte un `userId`, et chaque requête filtre dessus (`src/server/*`). La conversation d'un autre utilisateur renvoie une 404.
- **Vérification de session partout.** Chaque page, Server Action et route API revérifie la session côté serveur (`requireUser()` / `getCurrentUser()`).
- **Fichiers uploadés.** Taille limitée (`MAX_UPLOAD_MB`), vérification de la signature ZIP, protection contre les « zip bombs », et aucune écriture sur disque.
- **Secrets.** Ils restent dans `.env`, qui est ignoré par git, et ne sont lus que dans du code `server-only`.
- **Suppression.** Une conversation, toutes les données ou le compte entier (suppression en cascade).
