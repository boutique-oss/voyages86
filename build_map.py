#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os
BASE=os.path.dirname(os.path.abspath(__file__))
gj=json.load(open(os.path.join(BASE,'data','communes-86-demo.geojson'),encoding='utf-8'))
suivi=json.load(open(os.path.join(BASE,'data','suivi-86.json'),encoding='utf-8'))
# only keep statuses for communes present in demo geojson
gj_codes={f['properties']['code'] for f in gj['features']}
demo_suivi={k:v for k,v in suivi.items() if k in gj_codes}

html = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carnet de voyage — Communes de la Vienne (démo)</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<style>
  :root{ --visite:#2e7d32; --prevu:#f9a825; --avisiter:#b0bec5; --ink:#1f4e5f; }
  html,body{margin:0;height:100%;font-family:Arial,Helvetica,sans-serif;color:#222;}
  #bar{background:var(--ink);color:#fff;padding:10px 16px;}
  #bar h1{margin:0;font-size:17px;}
  #bar p{margin:3px 0 0;font-size:12px;opacity:.85;}
  #map{position:absolute;top:56px;bottom:0;left:0;right:0;}
  .legend{background:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.3);font-size:13px;line-height:1.7;}
  .legend b{display:block;margin-bottom:4px;color:var(--ink);}
  .chip{display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:7px;vertical-align:-2px;border:1px solid #999;}
  .prog{background:#fff;padding:8px 12px;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.3);font-size:13px;color:var(--ink);font-weight:bold;}
  .leaflet-popup-content{font-size:13px;}
  .leaflet-popup-content .c{color:#666;font-size:11px;}
</style>
</head>
<body>
<div id="bar">
  <h1>Carnet de voyage — Communes de la Vienne (86)</h1>
  <p>Démo · 12 communes autour de Poitiers · contours officiels geo.api.gouv.fr (à jour) · coloriage par statut de visite</p>
</div>
<div id="map"></div>
<script>
const GEO = __GEO__;
const SUIVI = __SUIVI__;
const COLORS = {"Visité":"#2e7d32","Prévu":"#f9a825","À visiter":"#b0bec5"};
function statutOf(code){ return SUIVI[code] || "À visiter"; }
function styleFor(f){
  const s = statutOf(f.properties.code);
  return {color:"#ffffff", weight:1.5, fillColor:COLORS[s], fillOpacity:0.75};
}
const map = L.map('map', {zoomControl:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {maxZoom:18, attribution:'© OpenStreetMap'}).addTo(map);

const layer = L.geoJSON(GEO, {
  style: styleFor,
  onEachFeature: (f, lyr) => {
    const s = statutOf(f.properties.code);
    lyr.bindPopup(`<b>${f.properties.nom}</b><br><span class="c">code INSEE ${f.properties.code}</span><br>Statut : <b>${s}</b>`);
    lyr.on('mouseover', ()=>lyr.setStyle({weight:3, color:'#1f4e5f'}));
    lyr.on('mouseout', ()=>layer.resetStyle(lyr));
  }
}).addTo(map);
map.fitBounds(layer.getBounds(), {padding:[20,20]});

// legend with live counts
const counts={"Visité":0,"Prévu":0,"À visiter":0};
GEO.features.forEach(f=>counts[statutOf(f.properties.code)]++);
const total=GEO.features.length;
const legend=L.control({position:'bottomright'});
legend.onAdd=function(){
  const d=L.DomUtil.create('div','legend');
  d.innerHTML='<b>Statut de visite</b>'+
   `<span class="chip" style="background:#2e7d32"></span>Visité (${counts["Visité"]})<br>`+
   `<span class="chip" style="background:#f9a825"></span>Prévu (${counts["Prévu"]})<br>`+
   `<span class="chip" style="background:#b0bec5"></span>À visiter (${counts["À visiter"]})`;
  return d;
};
legend.addTo(map);
const prog=L.control({position:'topright'});
prog.onAdd=function(){
  const d=L.DomUtil.create('div','prog');
  const pct=Math.round(counts["Visité"]/total*100);
  d.innerHTML=`Progression démo : ${counts["Visité"]}/${total} visitées (${pct}%)`;
  return d;
};
prog.addTo(map);
</script>
</body>
</html>
"""

html = html.replace('__GEO__', json.dumps(gj, ensure_ascii=False))
html = html.replace('__SUIVI__', json.dumps(demo_suivi, ensure_ascii=False))
out=os.path.join(BASE,'Carte_communes_Vienne.html')
open(out,'w',encoding='utf-8').write(html)
print('written', out, os.path.getsize(out),'bytes')
print('statuses embedded:', demo_suivi)
