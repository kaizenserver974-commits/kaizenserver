"use client";

import { useEffect, useState } from "react";
import { PARCOURS_STATUTS, SUIVI_CLIENT, statut, montantEnLigne } from "../../lib/espace.js";

export const euros = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
export const date = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export const heure = (d) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Suivi de commande pour le client (lecture seule), façon suivi de colis.
export function SuiviCommande({ valeur, majLe }) {
  const sortie = !PARCOURS_STATUTS.includes(valeur);
  const index = PARCOURS_STATUTS.indexOf(valeur);
  const s = SUIVI_CLIENT[valeur] || SUIVI_CLIENT.nouvelle;
  const pourcent = sortie ? 0 : Math.round(((index + 1) / PARCOURS_STATUTS.length) * 100);
  return (
    <div className="suivi-commande">
      <div className="suivi-entete">
        <span className="suivi-icone" aria-hidden="true">{statut(valeur).icone}</span>
        <div>
          <p className="suivi-etape">{sortie ? statut(valeur).label : `Étape ${index + 1} sur ${PARCOURS_STATUTS.length}`}{majLe ? ` · mis à jour le ${date(majLe)}` : ""}</p>
          <h3>{s.titre}</h3>
          <p className="discret">{s.detail}</p>
        </div>
      </div>
      {!sortie && <div className="suivi-barre" role="progressbar" aria-valuenow={pourcent} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement de la commande"><i style={{ width: `${pourcent}%` }} /></div>}
      <ol className="suivi-etapes">
        {PARCOURS_STATUTS.map((id, i) => (
          <li key={id} className={!sortie && i < index ? "fait" : !sortie && i === index ? "actif" : ""}>
            <span aria-hidden="true">{!sortie && i < index ? "✓" : statut(id).icone}</span><small>{statut(id).label}</small>
          </li>
        ))}
      </ol>
      <p className="suivi-suite"><b>Et ensuite ?</b> {s.suite}</p>
    </div>
  );
}

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
            {m.auteur === "equipe" && m.auteur !== moi && <img className="message-avatar" src="/personnages/server.webp" alt="" width="32" height="32" />}
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

export function CarteDevis({ d, repondre, paiements = [], payer, paiementEnLigne = false }) {
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  async function choisir(decision) {
    if (decision === "accepte" && !window.confirm(`Accepter l'offre de ${euros(d.montant)} ?\n\nEn acceptant, vous acceptez les conditions générales de vente (kaizenserver : page « Conditions de vente »).`)) return;
    setAttente(true); setErreur("");
    try { await repondre(decision); } catch (e) { setErreur(e.message); } finally { setAttente(false); }
  }
  const etiquette = { envoye: "En attente de réponse", accepte: "Acceptée", refuse: "Refusée" }[d.statut];
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
          <small className="discret">En acceptant, vous acceptez nos <a className="lien-cyan" href="/cgv" target="_blank" rel="noopener">conditions de vente</a>.</small>
          <button className="btn secondaire" disabled={attente} onClick={() => choisir("refuse")}>Refuser</button>
        </div>
      )}
      <BlocPaiement d={d} paiements={paiements.filter((p) => p.devis_id === d.id)} payer={payer} actif={paiementEnLigne} />
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </article>
  );
}

// Paiement en ligne (Mollie) d'une offre acceptée : bouton côté client,
// simple état côté Server (payer absent).
function BlocPaiement({ d, paiements, payer, actif }) {
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  const montant = montantEnLigne(d);
  if (!montant) return null;
  const paye = paiements.find((p) => p.statut === "paid");
  const enCours = paiements.find((p) => ["open", "pending", "authorized"].includes(p.statut));
  const libelle = d.acompte_pct < 100 ? `l'acompte de ${d.acompte_pct} % (${euros(montant)})` : euros(montant);
  async function lancer() {
    setAttente(true); setErreur("");
    try { const url = await payer(); window.location.href = url; } catch (e) { setErreur(e.message); setAttente(false); }
  }
  if (paye) return <p className="succes">✅ Paiement reçu : {euros(paye.montant)} le {date(paye.paid_at || paye.created_at)}. Merci !</p>;
  if (!payer) {
    return <p className="note">💳 Paiement en ligne prévu : {libelle}{enCours ? " · en cours chez Mollie" : d.statut === "accepte" ? " · en attente du client" : " · après acceptation"}</p>;
  }
  if (d.statut !== "accepte") return d.statut === "envoye" ? <p className="note">💳 Après acceptation, vous pourrez régler {libelle} en ligne.</p> : null;
  if (!actif) return <p className="note">💳 Server vous indiquera comment régler {libelle}.</p>;
  return (
    <div className="paiement">
      <button className="btn grand" disabled={attente} onClick={lancer}>{attente ? "Redirection vers Mollie…" : `Payer ${libelle}`}</button>
      <small className="discret">🔒 Paiement sécurisé par Mollie (carte bancaire, Apple Pay, virement…). {enCours ? "Un paiement est déjà en cours : vous pouvez le reprendre." : ""}</small>
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

// Réduit une image (max 1024 px, JPEG) pour l'envoyer à l'IA sans dépasser les limites.
function reduireImage(fichier) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error("Image illisible"));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => rejeter(new Error("Image illisible"));
      img.onload = () => {
        const echelle = Math.min(1, 1600 / Math.max(img.width, img.height)); // assez grand pour que l'IA lise les détails
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * echelle); c.height = Math.round(img.height * echelle);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/jpeg", 0.85);
        if (url.length > 1_300_000) url = c.toDataURL("image/jpeg", 0.65);
        resoudre(url);
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

// Maquette d'un projet, chargée à la demande et affichée dans une iframe isolée.
// Côté Server (generer fourni) : consignes et images de référence pour l'IA.
export function BlocMaquette({ disponible, lire, generer, infos, consignesInitiales = "", jeton, ouvrir = false, acceptee = false }) {
  const [copie, setCopie] = useState(false);
  const lien = jeton && typeof window !== "undefined" ? `${window.location.origin}/maquette/${jeton}` : "";
  const [html, setHtml] = useState("");
  const [attente, setAttente] = useState("");
  const [erreur, setErreur] = useState("");
  const [format, setFormat] = useState("bureau");
  const [consignes, setConsignes] = useState(consignesInitiales);
  const [partir, setPartir] = useState(true);
  const [images, setImages] = useState([]);
  async function ajouterImages(liste) {
    setErreur("");
    try {
      const nouvelles = [];
      for (const f of [...liste].slice(0, 3 - images.length)) {
        if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(f.type)) { setErreur("Images uniquement (JPG, PNG, WebP)."); continue; }
        nouvelles.push(await reduireImage(f));
      }
      setImages((x) => [...x, ...nouvelles].slice(0, 3));
    } catch (e) { setErreur(e.message); }
  }
  async function voir() {
    setErreur(""); setAttente("Chargement de la maquette…");
    try { setHtml(await lire()); } catch (e) { setErreur(e.message); } finally { setAttente(""); }
  }
  // Espace Server : la maquette s'affiche directement, sans cliquer.
  useEffect(() => { if (ouvrir && disponible) voir(); }, [ouvrir, disponible]); // eslint-disable-line react-hooks/exhaustive-deps
  async function creer() {
    if (acceptee && !window.confirm("Le client a déjà accepté cette maquette. La remplacer par une nouvelle version ?")) return;
    setErreur(""); setAttente("L'IA dessine la maquette… (1 à 3 minutes, surtout avec des images)");
    try {
      const r = await generer({ consignes, images, partir: disponible && partir });
      setHtml(await lire());
      if (r?.source && r.source !== "ia") setErreur(`L'IA n'a pas abouti (${r.raison || "pas de réponse"}) : c'est le modèle simple qui s'affiche. Réessayez.`);
    } catch (e) { setErreur(e.message); } finally { setAttente(""); }
  }
  function telecharger() {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = "maquette.html"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="bloc-maquette">
      {infos && <p className={acceptee ? "succes" : "note"}>{infos}</p>}
      <div className="actions">
        {disponible && !html && <button className="btn petit secondaire" disabled={Boolean(attente)} onClick={voir}>🖼️ Voir la maquette</button>}
        {disponible && lien && <a className="btn petit secondaire" href={lien} target="_blank" rel="noopener noreferrer">↗ Ouvrir en plein écran</a>}
        {disponible && lien && <button className="btn petit secondaire" onClick={async () => { try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { window.prompt("Copiez ce lien :", lien); } }}>{copie ? "✅ Lien copié" : "🔗 Copier le lien"}</button>}
        {generer && <button className="btn petit" disabled={Boolean(attente)} onClick={creer}>✨ {disponible ? "Améliorer avec mes consignes" : "Générer la maquette"}</button>}
        {html && (
          <>
            <button className={`btn petit ${format === "bureau" ? "" : "secondaire"}`} onClick={() => setFormat("bureau")}>Ordinateur</button>
            <button className={`btn petit ${format === "mobile" ? "" : "secondaire"}`} onClick={() => setFormat("mobile")}>Téléphone</button>
            <button className="btn petit secondaire" onClick={telecharger}>Télécharger</button>
          </>
        )}
      </div>
      {attente && <div className="chargement"><span className="rond" /> {attente}</div>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      {html && (
        <div className={`cadre-maquette ${format}`}>
          <iframe title="Maquette" sandbox="allow-scripts allow-modals" srcDoc={html} />
        </div>
      )}
      {generer && (
        <div className="consignes-ia" style={{ marginTop: 16 }}>
          <label className="champ" style={{ marginTop: 0 }}>
            <span>✍️ Vos améliorations visuelles <small className="discret">(prioritaires sur tout le reste)</small></span>
            <textarea rows={4} maxLength={2000} value={consignes} onChange={(e) => setConsignes(e.target.value)} placeholder="Votre côté visuel : couleurs, ambiance, mise en page, écrans à soigner… Ex. : « thème sombre premium, accents verts, grandes cartes arrondies, barre de menu en bas ». L'IA reprend déjà tout ce que le client a renseigné." />
          </label>
          <div className="images-ref">
            {images.map((src, i) => (
              <div key={i} className="vignette">
                <img src={src} alt={`Référence ${i + 1}`} />
                <button type="button" aria-label="Retirer l'image" onClick={() => setImages((x) => x.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            {images.length < 3 && (
              <label className="depot depot-petit">
                <input type="file" accept="image/*" multiple onChange={(e) => { ajouterImages(e.target.files); e.target.value = ""; }} />
                <span aria-hidden="true">🖼️</span>
                <small>Ajouter une image de référence (3 max)</small>
              </label>
            )}
          </div>
          <p className="note">Captures d'écran, croquis, applications que vous aimez : l'IA s'en inspire (mise en page, couleurs, ambiance). Les images servent seulement à la génération et ne sont pas enregistrées.</p>
          {disponible && (
            <label className="case" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={partir} onChange={(e) => setPartir(e.target.checked)} />
              <span>Partir de la maquette actuelle (garder ses écrans et son contenu, appliquer mes améliorations)</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
