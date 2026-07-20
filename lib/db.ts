// Connexion à Neon (Postgres serverless).
// Le driver ouvre une connexion HTTP à la demande : parfait pour les fonctions
// serverless de Vercel, aucun pool à gérer.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

// Initialisation paresseuse : on ne lit DATABASE_URL qu'au premier appel réel,
// jamais au chargement du module (sinon le build Next.js échoue sans la variable).
function client(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL manquante. En local : la mettre dans .env.local. " +
        "Sur Vercel : Settings → Environment Variables."
    );
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// `sql` s'utilise comme un template : sql`select ... where x = ${valeur}`.
// Les valeurs interpolées sont automatiquement paramétrées (pas d'injection SQL).
export const sql: NeonQueryFunction<false, false> = ((...args: unknown[]) =>
  // @ts-expect-error — on relaie les arguments du tag template au vrai client
  client()(...args)) as NeonQueryFunction<false, false>;
