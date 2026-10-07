-- Recherche sans IA : suppression des embeddings OpenAI.

-- Les vecteurs calculés par OpenAI ne sont plus utilisés.
ALTER TABLE "ConversationChunk" DROP COLUMN "embedding";
DROP EXTENSION IF EXISTS vector;

-- L'index de recherche est désormais construit sur le texte sans accents :
-- on le remet à zéro, il est reconstruit automatiquement (src/server/search/index.ts).
UPDATE "ConversationChunk" SET "searchVector" = NULL;
