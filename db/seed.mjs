// Remplit la base Neon depuis les données locales.
//   - table `commune` : les 265 communes actuelles du 86 (référentiel Etalab)
//   - table `suivi`   : leur statut depuis data/suivi-86.json
// Idempotent : relançable, met à jour au lieu de dupliquer (upsert).
// Usage : npm run db:seed   (nécessite DATABASE_URL dans .env.local)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, "..");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquante (à mettre dans .env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// --- Chargement du référentiel Etalab (paquet décompressé dans data/package) ---
const communes = JSON.parse(
  readFileSync(join(racine, "data/package/data/communes.json"), "utf-8")
);
const regions = Object.fromEntries(
  JSON.parse(readFileSync(join(racine, "data/package/data/regions.json"), "utf-8")).map(
    (r) => [r.code, r]
  )
);

const DEPT = "86";
const actuelles = communes.filter(
  (c) => c.type === "commune-actuelle" && c.departement === DEPT
);
actuelles.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

// --- Chargement du suivi existant (statuts) ---
const suivi = JSON.parse(readFileSync(join(racine, "data/suivi-86.json"), "utf-8"));

console.log(`Communes du ${DEPT} à charger : ${actuelles.length}`);

// --- Insertion référentiel (upsert par code_insee) ---
for (const c of actuelles) {
  await sql`
    insert into commune (code_insee, nom, departement, region, population)
    values (${c.code}, ${c.nom}, ${c.departement}, ${c.region ?? null}, ${c.population ?? null})
    on conflict (code_insee) do update
      set nom = excluded.nom, departement = excluded.departement,
          region = excluded.region, population = excluded.population
  `;
}
console.log("Référentiel inséré.");

// --- Insertion suivi (statut depuis le JSON, défaut "À visiter") ---
for (const c of actuelles) {
  const statut = suivi[c.code] ?? "À visiter";
  await sql`
    insert into suivi (code_insee, statut)
    values (${c.code}, ${statut})
    on conflict (code_insee) do update set statut = excluded.statut
  `;
}
console.log("Suivi inséré.");

// --- Contrôles (règle §9 du brief) ---
const [{ n: nbCommune }] = await sql`select count(*)::int as n from commune where departement = ${DEPT}`;
const repartition = await sql`
  select s.statut, count(*)::int as n
  from suivi s join commune c on c.code_insee = s.code_insee
  where c.departement = ${DEPT}
  group by s.statut order by s.statut
`;
console.log(`\nContrôle — communes en base : ${nbCommune}`);
for (const r of repartition) console.log(`  ${r.statut} : ${r.n}`);
console.log("\nSeed terminé.");
