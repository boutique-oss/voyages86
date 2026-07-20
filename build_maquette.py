#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère la maquette esthétique de la carte : maquette-carte.html

Principe repris de la skill « mapbox-style-patterns » (pattern « data-viz-base »),
transposé à Leaflet : fond de carte en niveaux de gris minimal, pour que la
couleur soit réservée exclusivement à la donnée (le statut de visite).

Script idempotent : relançable à volonté, il réécrit le HTML depuis les données.
"""
import json
from pathlib import Path

RACINE = Path(__file__).parent
GEOJSON = RACINE / "data" / "communes-86-demo.geojson"
SUIVI = RACINE / "data" / "suivi-86.json"
SORTIE = RACINE / "maquette-carte.html"

# --- Chargement des données réelles -----------------------------------------
geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
suivi = json.loads(SUIVI.read_text(encoding="utf-8"))

# On injecte le statut dans chaque géométrie via le code INSEE (clé unique).
# Le nom vient du référentiel/géométrie, jamais du suivi : « saisir une seule fois ».
for f in geo["features"]:
    f["properties"]["statut"] = suivi.get(f["properties"]["code"], "À visiter")

# Progression sur l'ensemble du département (265 communes), pas seulement les 12 tracées.
total_dept = len(suivi)
compte = {"Visité": 0, "Prévu": 0, "À visiter": 0}
for st in suivi.values():
    compte[st] = compte.get(st, 0) + 1

HTML = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carnet de voyage — Vienne (86)</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>
  /* --- Palette : le fond reste gris, la couleur est réservée à la donnée --- */
  :root {
    --visite:     #0f766e;  /* teal profond  */
    --prevu:      #d97706;  /* ambre         */
    --a-visiter:  #cbd5e1;  /* gris neutre   */
    --encre:      #1e293b;
    --sourdine:   #64748b;
    --bordure:    #e2e8f0;
    --panneau:    #ffffff;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font: 15px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--encre);
    background: #f8fafc;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* --- Panneau latéral --- */
  #panneau {
    width: 330px;
    flex: 0 0 330px;
    background: var(--panneau);
    border-right: 1px solid var(--bordure);
    padding: 26px 24px;
    overflow-y: auto;
  }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sous-titre { color: var(--sourdine); font-size: 13px; margin: 0 0 26px; }

  .bloc-titre {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--sourdine);
    margin: 0 0 12px;
  }

  /* --- Progression --- */
  .chiffre { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
  .chiffre small { font-size: 15px; font-weight: 400; color: var(--sourdine); }
  .barre {
    height: 8px; border-radius: 4px; background: var(--a-visiter);
    display: flex; overflow: hidden; margin: 12px 0 22px;
  }
  .barre span { display: block; height: 100%; }
  .seg-visite { background: var(--visite); }
  .seg-prevu  { background: var(--prevu); }

  /* --- Légende, qui sert aussi de compteur --- */
  .legende { list-style: none; padding: 0; margin: 0 0 28px; }
  .legende li {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 0; border-bottom: 1px solid var(--bordure);
    font-size: 14px;
  }
  .legende li:last-child { border-bottom: 0; }
  .pastille {
    width: 13px; height: 13px; border-radius: 3px; flex: 0 0 13px;
    border: 1px solid rgba(0,0,0,.18);
  }
  .legende .n { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--sourdine); }

  .note {
    font-size: 12.5px; color: var(--sourdine); background: #f1f5f9;
    border-left: 3px solid var(--bordure); padding: 11px 13px; border-radius: 0 6px 6px 0;
  }

  /* --- Carte --- */
  #carte { flex: 1; height: 100%; }

  /* Fond de tuiles désaturé : le pattern « data-viz-base » veut un socle neutre.
     Le filtre CSS suffit, pas besoin d'un fournisseur de tuiles supplémentaire. */
  .leaflet-tile-pane { filter: grayscale(1) contrast(0.92) brightness(1.06); }

  .leaflet-popup-content-wrapper { border-radius: 8px; }
  .leaflet-popup-content { margin: 13px 15px; font-size: 14px; }
  .popup-nom { font-weight: 600; font-size: 15px; }
  .popup-code { color: var(--sourdine); font-size: 12px; font-variant-numeric: tabular-nums; }
  .popup-statut {
    display: inline-block; margin-top: 7px; padding: 2px 9px;
    border-radius: 999px; font-size: 12px; font-weight: 600; color: #fff;
  }

  @media (max-width: 780px) {
    body { flex-direction: column; }
    #panneau { width: auto; flex: 0 0 auto; border-right: 0; border-bottom: 1px solid var(--bordure); max-height: 45vh; }
  }
</style>
</head>
<body>

<aside id="panneau">
  <h1>Carnet de voyage</h1>
  <p class="sous-titre">Vienne (86) — maquette</p>

  <p class="bloc-titre">Progression du département</p>
  <div class="chiffre">__PCT__ %<small> — __VISITE__ / __TOTAL__ communes</small></div>
  <div class="barre">
    <span class="seg-visite" style="width:__W_VISITE__%"></span>
    <span class="seg-prevu"  style="width:__W_PREVU__%"></span>
  </div>

  <p class="bloc-titre">Statuts</p>
  <ul class="legende">
    <li><i class="pastille" style="background:var(--visite)"></i> Visité      <b class="n">__VISITE__</b></li>
    <li><i class="pastille" style="background:var(--prevu)"></i> Prévu        <b class="n">__PREVU__</b></li>
    <li><i class="pastille" style="background:var(--a-visiter)"></i> À visiter <b class="n">__AVISITER__</b></li>
  </ul>

  <p class="note">
    Maquette esthétique. Les 12 communes tracées sont la démo autour de Poitiers ;
    la progression porte sur les __TOTAL__ communes du département.
    Les contours des 265 communes restent à récupérer (étape 3 du brief).
  </p>
</aside>

<div id="carte"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
// Données injectées au build : géométrie + statut joints par code INSEE.
const communes = __GEOJSON__;

const COULEURS = {
  "Visité":    getComputedStyle(document.documentElement).getPropertyValue('--visite').trim(),
  "Prévu":     getComputedStyle(document.documentElement).getPropertyValue('--prevu').trim(),
  "À visiter": getComputedStyle(document.documentElement).getPropertyValue('--a-visiter').trim()
};

const carte = L.map('carte', { zoomControl: false });
L.control.zoom({ position: 'bottomright' }).addTo(carte);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; contributeurs OpenStreetMap'
}).addTo(carte);

// Style de base : remplissage discret, contour blanc pour détacher les communes
// les unes des autres sans introduire de couleur parasite.
function style(feature) {
  return {
    fillColor: COULEURS[feature.properties.statut] || COULEURS["À visiter"],
    fillOpacity: 0.68,
    color: '#ffffff',
    weight: 1.5
  };
}

const couche = L.geoJSON(communes, {
  style: style,
  onEachFeature: (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(
      '<div class="popup-nom">' + p.nom + '</div>' +
      '<div class="popup-code">INSEE ' + p.code + '</div>' +
      '<div class="popup-statut" style="background:' + (COULEURS[p.statut]) + '">' + p.statut + '</div>'
    );
    // Survol : on épaissit le trait, on ne change pas la couleur (la couleur = la donnée).
    layer.on({
      mouseover: e => e.target.setStyle({ weight: 3, fillOpacity: 0.82 }),
      mouseout:  e => couche.resetStyle(e.target)
    });
  }
}).addTo(carte);

carte.fitBounds(couche.getBounds(), { padding: [30, 30] });
</script>
</body>
</html>
"""

visite = compte.get("Visité", 0)
prevu = compte.get("Prévu", 0)
a_visiter = compte.get("À visiter", 0)
pct = round(100 * visite / total_dept, 1)

html = (
    HTML.replace("__GEOJSON__", json.dumps(geo, ensure_ascii=False))
    .replace("__TOTAL__", str(total_dept))
    .replace("__VISITE__", str(visite))
    .replace("__PREVU__", str(prevu))
    .replace("__AVISITER__", str(a_visiter))
    .replace("__W_VISITE__", f"{100 * visite / total_dept:.2f}")
    .replace("__W_PREVU__", f"{100 * prevu / total_dept:.2f}")
    .replace("__PCT__", str(pct))
)
SORTIE.write_text(html, encoding="utf-8")

# --- Contrôles obligatoires (règle §9 du brief) ------------------------------
codes = [f["properties"]["code"] for f in geo["features"]]
assert len(codes) == len(set(codes)), "Codes INSEE dupliqués dans la géométrie"
orphelins = [c for c in codes if c not in suivi]
print(f"Maquette écrite    : {SORTIE.name}")
print(f"Géométries         : {len(codes)} (codes INSEE uniques : OK)")
print(f"Codes sans suivi   : {len(orphelins)} {orphelins if orphelins else ''}")
print(f"Suivi département  : {total_dept} communes")
print(f"  visité {visite} | prévu {prevu} | à visiter {a_visiter}  -> total {visite + prevu + a_visiter}")
print(f"Progression        : {pct} %")
