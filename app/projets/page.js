"use client";

import { useEffect, useState } from "react";
import { listerProjets, supprimerProjet } from "../../lib/stockage.js";
import { ETAPES_SUIVI, TYPES, trouver } from "../../lib/catalogue.js";
import { trouverAvatar, trouverUnivers, niveau } from "../../lib/jeu.js";
import Avatar from "../components/Avatar.js";
import ExigeCompte from "../components/ExigeCompte.js";

function ListeProjets() {
  const [projets, setProjets] = useState(null);

  useEffect(() => setProjets(listerProjets()), []);

  function supprimer(id, nom) {
    if (!window.confirm(`Supprimer définitivement le projet « ${nom || "sans nom"} » ?`)) return;
    supprimerProjet(id);
    setProjets(listerProjets());
  }

  if (projets === null) return <main className="conteneur page"><p className="discret">Chargement…</p></main>;

  return (
    <main className="conteneur page">
      <div className="titre-ligne">
        <h1 className="h-page">Mes projets</h1>
        <a className="btn" href="/nouveau">Nouvelle idée</a>
      </div>
      <p className="discret">Vos projets sont enregistrés sur cet appareil.</p>

      {projets.length === 0 ? (
        <div className="carte vide">
          <p>Aucun projet pour l'instant.</p>
          <a className="btn" href="/nouveau">Décrire ma première idée</a>
        </div>
      ) : (
        <div className="liste-projets">
          {projets.map((p) => {
            const statut = trouver(ETAPES_SUIVI, p.statut);
            return (
              <article key={p.id} className="carte projet-carte">
                <div className="projet-corps">
                  {p.jeu?.actif && (typeof p.jeu.avatar === "object"
                    ? <Avatar config={p.jeu.avatar} taille={56} titre={p.jeu.pseudo} />
                    : <span className="avatar-moyen" aria-hidden="true">{trouverAvatar(p.jeu.avatar).emoji}</span>)}
                  <div>
                  <h3>{p.nom || "Projet sans nom"}</h3>
                  {p.jeu?.actif && <p className="discret">{p.jeu.pseudo} · {trouverUnivers(p.jeu.univers).icone} niveau {niveau(p.jeu.points).numero} · {p.jeu.points} {trouverUnivers(p.jeu.univers).monnaie} · {p.jeu.badges.length} badge{p.jeu.badges.length > 1 ? "s" : ""}</p>}
                  <p className="discret">{trouver(TYPES, p.typeId)?.label || "Type à définir"} · mis à jour le {new Date(p.majLe).toLocaleDateString("fr-FR")}</p>
                  <p className="extrait">{p.idee}</p>
                  </div>
                </div>
                <div className="projet-actions">
                  <span className="badge">{statut?.label || "Idée"}</span>
                  <a className="btn petit" href={`/nouveau?id=${encodeURIComponent(p.id)}`}>Ouvrir</a>
                  <button className="btn petit lien-danger" onClick={() => supprimer(p.id, p.nom)}>Supprimer</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}


export default function MesProjets() {
  return <ExigeCompte titre="Connectez-vous pour retrouver vos projets"><ListeProjets /></ExigeCompte>;
}
