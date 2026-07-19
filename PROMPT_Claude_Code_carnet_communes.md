# Projet « Carnet de voyage – Communes de France » — Brief de préparation pour Claude Code

> À coller tel quel dans Claude Code à l'ouverture d'un dossier vide. Ce fichier sert à la fois de **prompt de démarrage** et de **cahier des charges** (garde-le à la racine sous le nom `CLAUDE.md` pour que Claude Code s'y réfère à chaque session).

---

## 1. Rôle attendu de Claude Code

Tu es mon assistant de développement sur un projet personnel. Tu construis une petite application **locale, simple et durable** : un carnet de voyage qui suit ma progression de visite sur les communes de France, avec une carte qui se colorie selon les communes visitées.

Je ne suis pas développeur professionnel : je travaille à mi-temps et je cherche des solutions **rigoureuses, automatisées et faciles à maintenir**. Privilégie la simplicité, documente ce que tu fais, et évite toute dépendance lourde. Chaque brique doit rester compréhensible et modifiable par moi.

Avant de coder une étape, propose ton plan et attends ma validation.

---

## 2. Objectif du projet

Trois briques, reliées entre elles :

1. **Référentiel** — la liste de référence de toutes les communes de France (34 875 au 01/01/2025, millésime des données à jour).
2. **Suivi de progression** — pour chaque commune : un statut (`à visiter` / `prévu` / `visité`), une date, des notes. Progression calculée **par département** puis nationale.
3. **Carte à zones remplies** — chaque commune coloriée selon son statut, dans le navigateur (Leaflet).

Objectif à terme : une petite interface locale unique (« mini-carnet ») qui regroupe référentiel + suivi + carte, sans logiciel lourd.

---

## 3. Décisions d'architecture déjà arrêtées (non négociables)

- **Clé unique = code INSEE** (5 caractères). C'est LUI qui relie le référentiel, le suivi et la géométrie. **Ne jamais utiliser le code postal comme identifiant** (relation non biunivoque avec les communes).
- **Principe « saisir une seule fois »** : une donnée n'est jamais dupliquée. Le nom, le département, la région d'une commune viennent toujours du référentiel via le code INSEE. Le suivi ne stocke que le code INSEE + le statut + date + notes.
- **Approche « par département d'abord »** : on démarre sur la **Vienne (86)**, on valide tout le circuit, puis on étend. La progression s'affiche par département pour rester lisible (sinon la barre nationale reste proche de 0 % très longtemps).
- **Carte = Leaflet** dans une page web autonome, coloriage automatique depuis le fichier de suivi.
- **Millésime** : les communes fusionnent chaque année (−60 en 2025). Le référentiel doit porter une **date de version** et être **rafraîchissable** sans casser le suivi (le suivi référence des codes INSEE ; prévoir un contrôle des codes disparus/fusionnés).

---

## 4. Sources de données officielles (libres, Licence ouverte Etalab)

### 4.1 Référentiel (noms, codes, département, région, population)
Paquet npm officiel Etalab, **millésime 2026**, mis à jour chaque année :

```bash
npm install @etalab/decoupage-administratif
# fichiers utiles :
#   node_modules/@etalab/decoupage-administratif/data/communes.json   (~35 000 communes)
#   node_modules/@etalab/decoupage-administratif/data/departements.json
#   node_modules/@etalab/decoupage-administratif/data/regions.json
```
Filtrer sur `type === "commune-actuelle"`. Champs par commune : `code` (INSEE), `nom`, `departement`, `region`, `population`, `codesPostaux`.
Table millésime → version du paquet dans le README du paquet (2026 = v6.0.0, 2025 = v5.3.0, etc.).

### 4.2 Contours géographiques (GeoJSON, avec code INSEE)
Deux options, au choix :

- **API par commune / département** (à jour, contours simplifiés légers) :
  `https://geo.api.gouv.fr/communes?codeDepartement=86&geometry=contour&format=geojson&fields=nom,code`
  → renvoie une FeatureCollection ; chaque feature porte `properties.code` (INSEE) et `properties.nom`.
- **Fond national Etalab « contours-administratifs latest »** (fichiers nationaux simplifiés 5m/50m/100m/1000m, à découper par département au build) :
  `https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson/`

> À écarter : `gregoiredavid/france-geojson` (pratique mais figé au millésime 2018) et `MTES-MCT/geo-api` (serveur archivé, licence AGPL contraignante). On les garde seulement comme dépannage.

---

## 5. Stack technique recommandée (rester léger)

- **Node.js** uniquement pour les scripts de préparation des données (téléchargement, filtrage, découpe par département). Pas de framework.
- **Front = HTML + JS vanilla + Leaflet** (via CDN cdnjs), fond de tuiles OpenStreetMap. Page(s) statique(s) ouvrables directement dans un navigateur.
- **Données = fichiers JSON/GeoJSON** dans `/data`, un par département pour la géométrie. Le suivi est un JSON simple (ou un CSV) édité à la main ou via l'interface.
- Optionnel plus tard : export/import Excel (`.xlsx`) du suivi pour ceux qui préfèrent le tableur.

Pas de base de données ni de serveur au départ : tout tourne en local, fichiers plats. On pourra ajouter un petit backend seulement si le besoin apparaît.

---

## 6. Arborescence cible du dépôt

```
carnet-communes/
├── CLAUDE.md                  # ce fichier
├── package.json
├── data/
│   ├── referentiel.json       # toutes les communes (build depuis @etalab/decoupage-administratif)
│   ├── suivi.json             # { "86194": {"statut":"visité","date":"2026-05-10","notes":"..."} }
│   └── contours/
│       └── communes-86.geojson
├── scripts/
│   ├── build-referentiel.mjs  # génère data/referentiel.json + version/millésime
│   ├── fetch-contours.mjs     # télécharge les contours d'un département (param --dept 86)
│   └── check-millesime.mjs    # compare suivi vs référentiel, signale les codes disparus/fusionnés
├── web/
│   ├── index.html             # carte Leaflet + tableau de progression
│   ├── app.js
│   └── style.css
└── README.md
```

---

## 7. Feuille de route (étapes, à valider une par une)

1. **Scaffolding** : créer l'arborescence, `package.json`, `CLAUDE.md`, `README.md`.
2. **Référentiel** : `build-referentiel.mjs` → `data/referentiel.json` avec code INSEE, nom, département, région, population + un champ `millesime`.
3. **Contours Vienne** : `fetch-contours.mjs --dept 86` → `data/contours/communes-86.geojson` (via geo.api.gouv.fr, les 265 communes).
4. **Suivi** : initialiser `data/suivi.json` (tous les codes du 86 à `à visiter`, quelques-uns en démo).
5. **Carte** : `web/index.html` — Leaflet, coloriage par statut (visité/prévu/à visiter), légende, popups (nom + code INSEE + statut), progression du département en direct.
6. **Édition du statut** : pouvoir cliquer une commune et changer son statut, avec sauvegarde dans `suivi.json` (au minimum export du JSON ; idéalement écriture locale).
7. **Contrôle millésime** : `check-millesime.mjs` — après une mise à jour annuelle du référentiel, lister les codes du suivi qui n'existent plus (fusions) pour correction manuelle.
8. **Extension** : généraliser la carte à plusieurs départements + un tableau de bord national (progression par département).

---

## 8. Point de départ existant (à réutiliser)

J'ai déjà une démo validée sur 12 communes autour de Poitiers (circuit référentiel ↔ suivi ↔ carte fonctionnel, jointure par code INSEE vérifiée). Je peux te fournir :
- `communes-86-demo.geojson` (12 contours réels geo.api.gouv.fr) — modèle du format de géométrie attendu ;
- `suivi-86.json` (mapping code INSEE → statut) — modèle du format de suivi ;
- une carte Leaflet de démo (`Carte_communes_Vienne.html`) — base directement réutilisable pour `web/index.html`.

Reproduis ce format, puis passe à l'échelle des 265 communes du 86.

---

## 9. Règles de qualité / vérification (obligatoires)

- Après chaque script de données, **vérifie** : nombre d'enregistrements attendu, unicité des codes INSEE, contours GeoJSON valides (anneaux fermés, coordonnées WGS84 dans les bornes du département).
- Toute géométrie doit porter `properties.code` (INSEE) et `properties.nom`.
- La progression affichée doit correspondre au comptage réel des statuts dans `suivi.json`.
- Documente dans le README chaque source de données, avec sa date de récupération et son millésime.

---

## 10. Contraintes & préférences

- **Simplicité avant tout** : pas de sur-ingénierie, pas de dépendance non justifiée.
- Code commenté en français, messages clairs.
- Chaque étape doit être **relançable** et **automatisable** (scripts idempotents).
- Je dois pouvoir tout maintenir seul, à mi-temps, une fois les bases posées.

---

## 11. Premier message à donner à Claude Code (prêt à coller)

> Lis `CLAUDE.md`. Commence par l'étape 1 (scaffolding) puis l'étape 2 (référentiel) : installe `@etalab/decoupage-administratif`, écris `scripts/build-referentiel.mjs` qui génère `data/referentiel.json` (communes actuelles uniquement : code INSEE, nom, département, région, population + champ `millesime`), et affiche un contrôle (nombre de communes, unicité des codes). Montre-moi le plan avant d'écrire le code, puis fais-le et donne-moi le résultat du contrôle. On validera avant de passer aux contours de la Vienne.
