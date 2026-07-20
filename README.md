# voyages86 — Carnet de voyage des communes

Carte des communes de la **Vienne (86)** coloriée par statut de visite
(`À visiter` / `Prévu` / `Visité`), avec édition en ligne protégée par mot de passe.

**Stack** : Next.js (App Router) · Neon (Postgres serverless) · déploiement Vercel branché sur GitHub.

- Clé unique partout : **code INSEE** (jamais le code postal).
- « Saisir une seule fois » : le suivi ne stocke que statut/date/notes ; le nom vient du référentiel.
- Fond de carte en niveaux de gris ; la couleur est réservée à la donnée.

## Données

| Source | Usage | Millésime |
| --- | --- | --- |
| `@etalab/decoupage-administratif` (`data/package/`) | référentiel communes | 2026 (v6) |
| `geo.api.gouv.fr` → `public/data/communes-86.geojson` | contours (12 communes démo) | récupéré 2026-07 |
| `data/suivi-86.json` | statuts initiaux pour le seed | — |

## Mise en route

### 1. Local

```bash
npm install
cp .env.local.example .env.local   # puis remplir DATABASE_URL et APP_PASSWORD
npm run db:schema                  # crée les tables sur Neon
npm run db:seed                    # charge les 265 communes du 86 + statuts
npm run dev                        # http://localhost:3000
```

### 2. Neon

1. Créer un projet sur https://neon.tech
2. Copier la **Connection string** (option *pooled*) → la coller dans `.env.local` (`DATABASE_URL`).
3. Lancer `npm run db:schema` puis `npm run db:seed`.

### 3. Vercel + GitHub

1. Vercel → **Add New Project** → importer `boutique-oss/voyages86`.
2. Vercel détecte Next.js automatiquement (aucune config à changer).
3. **Settings → Environment Variables** : ajouter `DATABASE_URL` et `APP_PASSWORD`.
4. Déployer. Chaque `git push` sur `main` redéploie automatiquement.

## Structure

```
app/
  page.tsx              # monte la carte (client uniquement)
  api/suivi/route.ts    # GET (public) + PUT (protégé par mot de passe)
components/Carte.tsx    # carte Leaflet + éditeur de statut
lib/db.ts               # connexion Neon
db/
  schema.sql            # tables commune + suivi
  apply-schema.mjs      # npm run db:schema
  seed.mjs              # npm run db:seed
public/data/            # géométrie GeoJSON servie statiquement
```

## À suivre (feuille de route)

- Récupérer les **265 contours** du 86 (`geo.api.gouv.fr`) pour remplacer la démo à 12 communes.
- Étendre à d'autres départements + tableau de bord national.
