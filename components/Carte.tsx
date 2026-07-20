"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";

// --- Types ---
type Statut = "À visiter" | "Prévu" | "Visité";
type LigneSuivi = {
  code_insee: string;
  nom: string;
  statut: Statut;
  date_visite: string | null;
  notes: string | null;
};
type Suivi = Record<string, LigneSuivi>;

const STATUTS: Statut[] = ["À visiter", "Prévu", "Visité"];
const COULEURS: Record<Statut, string> = {
  Visité: "#0f766e",
  Prévu: "#d97706",
  "À visiter": "#cbd5e1",
};
const CLASSE: Record<Statut, string> = {
  Visité: "s-visite",
  Prévu: "s-prevu",
  "À visiter": "s-avisiter",
};

export default function Carte() {
  const carteRef = useRef<L.Map | null>(null);
  const coucheRef = useRef<L.GeoJSON | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  const [suivi, setSuivi] = useState<Suivi>({});
  const [selection, setSelection] = useState<string | null>(null);
  const [motDePasse, setMotDePasse] = useState<string | null>(null);
  const [saisieMdp, setSaisieMdp] = useState("");
  const [enreg, setEnreg] = useState(false);
  const [msg, setMsg] = useState<{ texte: string; ok: boolean } | null>(null);

  // Brouillon d'édition local (avant enregistrement)
  const [brouillon, setBrouillon] = useState<{ statut: Statut; date: string; notes: string }>({
    statut: "À visiter",
    date: "",
    notes: "",
  });

  // Récupère le mot de passe mémorisé pour la session
  useEffect(() => {
    const m = sessionStorage.getItem("voyage86_mdp");
    if (m) setMotDePasse(m);
  }, []);

  // --- Initialisation carte + chargement des données ---
  useEffect(() => {
    if (carteRef.current || !divRef.current) return;

    const carte = L.map(divRef.current, { zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(carte);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; contributeurs OpenStreetMap",
    }).addTo(carte);
    carteRef.current = carte;

    Promise.all([
      fetch("/data/communes-86.geojson").then((r) => r.json()),
      fetch("/api/suivi")
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([geo, lignes]: [GeoJSON.FeatureCollection, LigneSuivi[]]) => {
      const parCode: Suivi = {};
      // Si la base n'est pas encore connectée, l'API renvoie un objet d'erreur :
      // on retombe alors sur une carte vide (tout « À visiter ») sans planter.
      if (Array.isArray(lignes)) for (const l of lignes) parCode[l.code_insee] = l;
      setSuivi(parCode);

      const couche = L.geoJSON(geo, {
        style: (f) => styleCommune(parCode[f?.properties.code]?.statut ?? "À visiter"),
        onEachFeature: (f, layer) => {
          const code = f.properties.code as string;
          layer.on({
            click: () => setSelection(code),
            mouseover: (e) => (e.target as L.Path).setStyle({ weight: 3, fillOpacity: 0.85 }),
            mouseout: (e) => coucheRef.current?.resetStyle(e.target),
          });
        },
      }).addTo(carte);
      coucheRef.current = couche;
      carte.fitBounds(couche.getBounds(), { padding: [30, 30] });
    });

    return () => {
      carte.remove();
      carteRef.current = null;
    };
  }, []);

  // --- Quand on sélectionne une commune, on charge son brouillon ---
  useEffect(() => {
    if (!selection) return;
    const l = suivi[selection];
    setBrouillon({
      statut: l?.statut ?? "À visiter",
      date: l?.date_visite ?? "",
      notes: l?.notes ?? "",
    });
    setMsg(null);
  }, [selection, suivi]);

  // --- Recoloriage de la carte quand le suivi change ---
  useEffect(() => {
    coucheRef.current?.eachLayer((layer) => {
      const f = (layer as L.GeoJSON).feature as GeoJSON.Feature;
      const code = f?.properties?.code as string;
      (layer as L.Path).setStyle(styleCommune(suivi[code]?.statut ?? "À visiter"));
    });
  }, [suivi]);

  // --- Progression (sur les 265 communes renvoyées par l'API) ---
  const stats = useMemo(() => {
    const total = Object.keys(suivi).length;
    const c = { Visité: 0, Prévu: 0, "À visiter": 0 } as Record<Statut, number>;
    for (const l of Object.values(suivi)) c[l.statut]++;
    const pct = total ? Math.round((1000 * c["Visité"]) / total) / 10 : 0;
    return { total, ...c, pct };
  }, [suivi]);

  // --- Enregistrer le brouillon ---
  async function enregistrer() {
    if (!selection || !motDePasse) return;
    setEnreg(true);
    setMsg(null);
    try {
      const res = await fetch("/api/suivi", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-app-password": motDePasse },
        body: JSON.stringify({
          code: selection,
          statut: brouillon.statut,
          date: brouillon.date || null,
          notes: brouillon.notes || null,
        }),
      });
      if (res.status === 401) {
        setMsg({ texte: "Mot de passe incorrect.", ok: false });
        setMotDePasse(null);
        sessionStorage.removeItem("voyage86_mdp");
        return;
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setMsg({ texte: e.erreur ?? "Erreur d'enregistrement.", ok: false });
        return;
      }
      const ligne: LigneSuivi = await res.json();
      setSuivi((s) => ({
        ...s,
        [selection]: { ...s[selection], ...ligne, statut: brouillon.statut },
      }));
      setMsg({ texte: "Enregistré ✓", ok: true });
    } catch {
      setMsg({ texte: "Réseau indisponible.", ok: false });
    } finally {
      setEnreg(false);
    }
  }

  function connecter() {
    if (!saisieMdp) return;
    sessionStorage.setItem("voyage86_mdp", saisieMdp);
    setMotDePasse(saisieMdp);
    setSaisieMdp("");
  }
  function deconnecter() {
    sessionStorage.removeItem("voyage86_mdp");
    setMotDePasse(null);
  }

  const sel = selection ? suivi[selection] : null;

  return (
    <div className="app">
      <aside id="panneau">
        <h1>Carnet de voyage</h1>
        <p className="sous-titre">Vienne (86)</p>

        {/* Connexion */}
        <div className={"auth" + (motDePasse ? " ok" : "")}>
          {motDePasse ? (
            <>
              <span className="etat-ok">● Édition activée</span>{" "}
              <a onClick={deconnecter}>se déconnecter</a>
            </>
          ) : (
            <>
              <span className="bloc-titre" style={{ margin: 0 }}>
                Mot de passe pour modifier
              </span>
              <input
                type="password"
                value={saisieMdp}
                onChange={(e) => setSaisieMdp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connecter()}
                placeholder="••••••"
              />
              <button onClick={connecter}>Activer l’édition</button>
            </>
          )}
        </div>

        <p className="bloc-titre">Progression du département</p>
        <div className="chiffre">
          {stats.pct} %<small> — {stats["Visité"]} / {stats.total} communes</small>
        </div>
        <div className="barre">
          <span
            className="seg-visite"
            style={{ width: stats.total ? `${(100 * stats["Visité"]) / stats.total}%` : "0%" }}
          />
          <span
            className="seg-prevu"
            style={{ width: stats.total ? `${(100 * stats["Prévu"]) / stats.total}%` : "0%" }}
          />
        </div>

        <p className="bloc-titre">Statuts</p>
        <ul className="legende">
          <li>
            <i className="pastille" style={{ background: COULEURS["Visité"] }} /> Visité
            <b className="n">{stats["Visité"]}</b>
          </li>
          <li>
            <i className="pastille" style={{ background: COULEURS["Prévu"] }} /> Prévu
            <b className="n">{stats["Prévu"]}</b>
          </li>
          <li>
            <i className="pastille" style={{ background: COULEURS["À visiter"] }} /> À visiter
            <b className="n">{stats["À visiter"]}</b>
          </li>
        </ul>

        {/* Éditeur de la commune sélectionnée */}
        {sel ? (
          <div>
            <p className="bloc-titre">Modifier — {sel.nom}</p>
            <div className="popup-code">INSEE {sel.code_insee}</div>
            <div className="edit-statuts">
              {STATUTS.map((st) => (
                <button
                  key={st}
                  className={CLASSE[st] + (brouillon.statut === st ? " actif" : "")}
                  onClick={() => setBrouillon((b) => ({ ...b, statut: st }))}
                >
                  {st}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="edit-champ"
              value={brouillon.date}
              onChange={(e) => setBrouillon((b) => ({ ...b, date: e.target.value }))}
            />
            <textarea
              className="edit-champ"
              rows={2}
              placeholder="Notes…"
              value={brouillon.notes}
              onChange={(e) => setBrouillon((b) => ({ ...b, notes: e.target.value }))}
            />
            <button className="edit-enreg" onClick={enregistrer} disabled={!motDePasse || enreg}>
              {enreg ? "Enregistrement…" : motDePasse ? "Enregistrer" : "Mot de passe requis"}
            </button>
            {msg && <div className={"edit-msg " + (msg.ok ? "ok" : "ko")}>{msg.texte}</div>}
          </div>
        ) : (
          <p className="note">
            Clique une commune sur la carte pour changer son statut. Seules les 12 communes de
            la démo autour de Poitiers ont une géométrie ; la progression porte sur les{" "}
            {stats.total} communes du département.
          </p>
        )}
      </aside>

      <div id="carte" ref={divRef} />
    </div>
  );
}

function styleCommune(statut: Statut): L.PathOptions {
  return {
    fillColor: COULEURS[statut] ?? COULEURS["À visiter"],
    fillOpacity: 0.68,
    color: "#ffffff",
    weight: 1.5,
  };
}
