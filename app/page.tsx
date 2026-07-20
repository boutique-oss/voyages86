"use client";

import dynamic from "next/dynamic";

// Leaflet manipule `window` : le composant carte ne doit s'exécuter que côté
// navigateur, jamais au rendu serveur. D'où le chargement dynamique sans SSR.
const Carte = dynamic(() => import("@/components/Carte"), { ssr: false });

export default function Page() {
  return <Carte />;
}
