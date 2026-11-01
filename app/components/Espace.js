"use client";

import { useState } from "react";
import { PARCOURS_STATUTS, statut } from "../../lib/espace.js";

export const euros = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
export const date = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export const heure = (d) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function FriseStatut({ valeur }) {
  const sortie = !PARCOURS_STATUTS.includes(valeur);
  const index = PARCOURS_STATUTS.indexOf(valeur);
  return (
    <div>
      <ol className="frise-statut">
        {PARCOURS_STATUTS.map((id, i) => (
          <li key={id} className={!sortie && i < index ? "fait" : !sortie && i === index ? "actif" : ""}>
            <span aria-hidden="true">{statut(id).icone}</span><small>{statut(id).label}</small>
          </li>
        ))}
      </ol>
      {sortie && <p className="alerte">{statut(valeur).icone} {statut(valeur).label}</p>}
    </div>
  );
}

export function FilMessages({ messages, moi, envoyer, placeholder }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  async function soumettre(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true); setErreur("");
    try { await envoyer(texte.trim()); setTexte(""); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  return (
    <div className="fil">
      <div className="fil-messages" aria-live="polite">
        {messages.length === 0 && <p className="discret">Aucun message pour l'instant.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.auteur === moi ? "moi" : "autre"}`}>
            <p>{m.contenu}</p>
            <small>{m.auteur === "equipe" ? "Équipe KaizenServer" : "Client"} · {heure(m.created_at)}</small>
          </div>
        ))}
      </div>
      <form className="fil-saisie" onSubmit={soumettre}>
        <textarea rows={2} maxLength={4000} value={texte} placeholder={placeholder} onChange={(e) => setTexte(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) soumettre(e); }} />
        <button className="btn" disabled={envoi || !texte.trim()}>{envoi ? "Envoi…" : "Envoyer"}</button>
      </form>
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

export function CarteDevis({ d, repondre }) {
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  async function choisir(decision) {
    if (decision === "accepte" && !window.confirm(`Accepter ce devis de ${euros(d.montant)} ?`)) return;
    setAttente(true); setErreur("");
    try { await repondre(decision); } catch (e) { setErreur(e.message); } finally { setAttente(false); }
  }
  const etiquette = { envoye: "En attente de votre réponse", accepte: "Accepté", refuse: "Refusé" }[d.statut];
  return (
    <article className={`devis devis-${d.statut}`}>
      <div className="devis-tete">
        <div><small className="discret">Devis du {date(d.created_at)}</small><p className="prix">{euros(d.montant)}</p></div>
        <span className="badge">{etiquette}</span>
      </div>
      {d.delai_semaines && <p className="discret">Délai estimé : environ {d.delai_semaines} semaine{d.delai_semaines > 1 ? "s" : ""}</p>}
      {d.details && <p className="devis-details">{d.details}</p>}
      {repondre && d.statut === "envoye" && (
        <div className="actions">
          <button className="btn" disabled={attente} onClick={() => choisir("accepte")}>Accepter le devis</button>
          <button className="btn secondaire" disabled={attente} onClick={() => choisir("refuse")}>Refuser</button>
        </div>
      )}
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </article>
  );
}
