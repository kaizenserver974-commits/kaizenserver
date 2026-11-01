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

export function FilMessages({ messages, moi, envoyer, placeholder, conseil = false }) {
  const [texte, setTexte] = useState("");
  const [estConseil, setEstConseil] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  async function soumettre(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true); setErreur("");
    try { await envoyer(texte.trim(), estConseil ? "conseil" : "message"); setTexte(""); setEstConseil(false); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  return (
    <div className="fil">
      <div className="fil-messages" aria-live="polite">
        {messages.length === 0 && <p className="discret">Aucun message pour l'instant.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.auteur === moi ? "moi" : "autre"} ${m.type === "conseil" ? "conseil-maitre" : ""}`}>
            {m.auteur === "equipe" && m.auteur !== moi && <img className="message-avatar" src="/personnages/server.svg" alt="" width="32" height="32" />}
            {m.type === "conseil" && <strong className="etiquette-conseil">💡 Conseil du maître du jeu</strong>}
            <p>{m.contenu}</p>
            <small>{m.auteur === "equipe" ? "Server · Maître du jeu" : "Client"} · {heure(m.created_at)}</small>
          </div>
        ))}
      </div>
      <form className="fil-saisie" onSubmit={soumettre}>
        <textarea rows={2} maxLength={4000} value={texte} placeholder={placeholder} onChange={(e) => setTexte(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) soumettre(e); }} />
        <button className="btn" disabled={envoi || !texte.trim()}>{envoi ? "Envoi…" : "Envoyer"}</button>
      </form>
      {conseil && <label className="note"><input type="checkbox" checked={estConseil} onChange={(e) => setEstConseil(e.target.checked)} /> Envoyer comme 💡 conseil du maître du jeu</label>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

export function CarteDevis({ d, repondre }) {
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  async function choisir(decision) {
    if (decision === "accepte" && !window.confirm(`Accepter l'offre de ${euros(d.montant)} ?`)) return;
    setAttente(true); setErreur("");
    try { await repondre(decision); } catch (e) { setErreur(e.message); } finally { setAttente(false); }
  }
  const etiquette = { envoye: "En attente de votre réponse", accepte: "Accepté", refuse: "Refusé" }[d.statut];
  return (
    <article className={`devis devis-${d.statut}`}>
      <div className="devis-tete">
        <div><small className="discret">Offre de Server du {date(d.created_at)}</small><p className="prix">{euros(d.montant)}</p></div>
        <span className="badge">{etiquette}</span>
      </div>
      {d.delai_semaines && <p className="discret">Délai estimé : environ {d.delai_semaines} semaine{d.delai_semaines > 1 ? "s" : ""}</p>}
      {d.details && <p className="devis-details">{d.details}</p>}
      {repondre && d.statut === "envoye" && (
        <div className="actions">
          <button className="btn" disabled={attente} onClick={() => choisir("accepte")}>Accepter l'offre</button>
          <button className="btn secondaire" disabled={attente} onClick={() => choisir("refuse")}>Refuser</button>
        </div>
      )}
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </article>
  );
}
