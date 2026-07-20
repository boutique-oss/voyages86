// Applique db/schema.sql sur la base Neon.
// Usage : npm run db:schema   (nécessite DATABASE_URL dans .env.local)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const ici = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquante (à mettre dans .env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(join(ici, "schema.sql"), "utf-8");

// On découpe sur les ';' pour exécuter chaque instruction séparément
// (le driver HTTP n'accepte pas plusieurs requêtes d'un coup).
const instructions = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("--"));

for (const instr of instructions) {
  await sql.query(instr);
  console.log("OK :", instr.split("\n")[0].slice(0, 60), "…");
}
console.log("\nSchéma appliqué.");
