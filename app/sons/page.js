"use client";

import { useEffect, useState } from "react";
import { PERSONNAGES } from "../../lib/avatar.js";
import { AMBIANCES, CHOIX, jouerSon, arreterSon, sonDisponible } from "../../lib/sons.js";

// Page d'écoute des ambiances (non listée dans le menu) : Server compare et choisit.
export default function Sons() {
  const [joue, setJoue] = useState(null);
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(sonDisponible()); return () => arreterSon(); }, []);
  function basculer(id, v) {
    const cle = `${id}-${v}`;
    if (joue === cle) { arreterSon(); setJoue(null); } else { jouerSon(id, null, v); setJoue(cle); }
  }
  return (
    <main className="conteneur page">
      <p className="surtitre">Espace Server</p>
      <h1 className="h-page">Ambiances sonores des mondes</h1>
      <p className="discret">Écoutez les 3 propositions de chaque personnage (avec un casque ou les haut-parleurs), puis indiquez votre choix : par exemple « Kai B, Mia A… ». ★ = ambiance actuelle du jeu.</p>
      {!ok && <p className="alerte">Le son n'est pas disponible sur ce navigateur.</p>}
      <div className="liste-sons">
        {PERSONNAGES.map((p) => (
          <article key={p.id} className="carte ligne-son" style={{ "--p": p.couleur }}>
            <img src={p.portrait} alt="" width="64" height="64" className="avatar-illustre" style={{ "--anneau": p.couleur }} />
            <div className="ligne-son-corps">
              <h2>{p.nom}</h2>
              <div className="choix-sons">
                {["A", "B", "C"].map((v) => {
                  const a = AMBIANCES[p.id]?.[v]; if (!a) return null;
                  const actif = joue === `${p.id}-${v}`;
                  return (
                    <button key={v} className={`bouton-ecoute ${actif ? "actif" : ""}`} onClick={() => basculer(p.id, v)} aria-pressed={actif}>
                      <span className="lettre">{actif ? "⏸" : "▶"} {v}{CHOIX[p.id] === v ? " ★" : ""}</span>
                      <strong>{a.nom}</strong>
                      <small>{a.desc}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
