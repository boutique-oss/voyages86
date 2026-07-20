// Connexion à Neon (Postgres serverless).
// Le driver ouvre une connexion HTTP à la demande : parfait pour les fonctions
// serverless de Vercel, aucun pool à gérer.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

// L'intégration Neon de Vercel peut nommer la variable de plusieurs façons
// (avec ou sans préfixe). On accepte les noms usuels, en priorité DATABASE_URL.
function trouverUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

// Initialisation paresseuse : on ne lit l'URL qu'au premier appel réel, jamais
// au chargement du module (sinon le build Next.js échoue sans la variable).
function client(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = trouverUrl();
  if (!url) {
    throw new Error(
      "URL de base introuvable. En local : DATABASE_URL dans .env.local. " +
        "Sur Vercel : Settings → Environment Variables (DATABASE_URL ou POSTGRES_URL)."
    );
  }
  _sql = neon(url);
  return _sql;
}

// `sql` s'utilise comme un template : sql`select ... where x = ${valeur}`.
// Les valeurs interpolées sont automatiquement paramétrées (pas d'injection SQL).
export const sql: NeonQueryFunction<false, false> = ((...args: unknown[]) =>
  // @ts-expect-error — on relaie les arguments du tag template au vrai client
  client()(...args)) as NeonQueryFunction<false, false>;
