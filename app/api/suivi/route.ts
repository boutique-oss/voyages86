import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Toujours exécuté à la demande (données à jour), jamais mis en cache statique.
export const dynamic = "force-dynamic";

const STATUTS_VALIDES = ["À visiter", "Prévu", "Visité"] as const;
type Statut = (typeof STATUTS_VALIDES)[number];

// -------------------------------------------------------------------------
// GET /api/suivi
// Renvoie le suivi de toutes les communes du 86, joint au nom (référentiel).
// Lecture publique : consulter la carte ne demande pas de mot de passe.
// -------------------------------------------------------------------------
export async function GET() {
  const lignes = await sql`
    select c.code_insee, c.nom, s.statut, s.date_visite, s.notes, s.maj_le
    from commune c
    join suivi s on s.code_insee = c.code_insee
    where c.departement = '86'
    order by c.nom
  `;
  return NextResponse.json(lignes);
}

// -------------------------------------------------------------------------
// PUT /api/suivi   body: { code, statut, date?, notes? }
// Modifie le statut d'une commune. Protégé par mot de passe (en-tête).
// -------------------------------------------------------------------------
export async function PUT(request: Request) {
  // --- Contrôle du mot de passe ---
  const fourni = request.headers.get("x-app-password");
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json(
      { erreur: "APP_PASSWORD non configuré côté serveur." },
      { status: 500 }
    );
  }
  if (fourni !== process.env.APP_PASSWORD) {
    return NextResponse.json({ erreur: "Mot de passe incorrect." }, { status: 401 });
  }

  // --- Validation de l'entrée ---
  const body = await request.json().catch(() => null);
  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  const code: string = body.code;
  const statut: Statut = body.statut;
  if (!STATUTS_VALIDES.includes(statut)) {
    return NextResponse.json({ erreur: "Statut inconnu." }, { status: 400 });
  }
  const date: string | null = body.date || null;
  const notes: string | null = body.notes ?? null;

  // --- Écriture (la commune doit exister dans le référentiel) ---
  const res = await sql`
    update suivi
    set statut = ${statut}, date_visite = ${date}, notes = ${notes}, maj_le = now()
    where code_insee = ${code}
    returning code_insee, statut, date_visite, notes, maj_le
  `;
  if (res.length === 0) {
    return NextResponse.json({ erreur: "Code INSEE inconnu." }, { status: 404 });
  }
  return NextResponse.json(res[0]);
}
