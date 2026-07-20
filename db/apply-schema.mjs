// Applique db/schema.sql sur la base Neon.
// Usage : npm run db:schema   (nécessite DATABASE_URL dans .env.local)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const ici = dirname(fileURLToPath(import.meta.url));
// Next.js lit .env.local, mais un script Node ne le fait pas seul : on le charge.
dotenv.config({ path: join(ici, "..", ".env.local") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquante (à mettre dans .env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(join(ici, "schema.sql"), "utf-8");

// On retire d'abord les commentaires (lignes commençant par --), puis on
// découpe sur les ';' — le driver HTTP n'accepte qu'une requête à la fois.
const instructions = schema
  .split("\n")
  .filter((ligne) => !ligne.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// Le driver neon() s'utilise comme un tag de template. Pour exécuter une chaîne
// brute (DDL sans paramètre), on l'enveloppe en faux template literal.
function executer(texte) {
  const tpl = Object.assign([texte], { raw: [texte] });
  return sql(tpl);
}

for (const instr of instructions) {
  await executer(instr);
  console.log("OK :", instr.split("\n")[0].slice(0, 60), "…");
}
console.log("\nSchéma appliqué.");
