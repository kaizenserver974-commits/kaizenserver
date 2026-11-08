"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseNavigateur, appelAuthentifie } from "../../lib/supabaseClient.js";
import { STATUTS, ACOMPTES, MODELES_LIENS, statut, montantEnLigne, offreModifiable } from "../../lib/espace.js";
import MotDePasse from "../components/MotDePasse.js";
import { FriseStatut, FilMessages, CarteDevis, BlocMaquette, date, euros } from "../components/Espace.js";
import { TYPES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "../../lib/catalogue.js";
import { labelFormule } from "../../lib/commande.js";

export default function Admin() {
  const sb = supabaseNavigateur();
  const [donnees, setDonnees] = useState(null);
  const [etat, setEtat] = useState("chargement");
  const [erreur, setErreur] = useState("");
  const [choisie, setChoisie] = useState(null);
  const [filtre, setFiltre] = useState("actives");
  // Menu « Tous les projets » : /admin?filtre=toutes
  useEffect(() => { if (new URLSearchParams(window.location.search).get("filtre") === "toutes") setFiltre("toutes"); }, []);

  const charger = useCallback(async () => {
    try {
      const d = await appelAuthentifie("/api/admin");
      setDonnees(d);
      setChoisie((c) => c || d.commandes[0]?.id || null);
      setEtat("pret");
    } catch (e) {
      setErreur(e.message);
      if (e.status === 401) await sb?.auth.signOut({ scope: "local" }).catch(() => {});
      setEtat(e.status === 401 ? "deconnecte" : e.status === 403 ? "interdit" : e.status === 503 ? "inactif" : "erreur");
    }
  }, []);

  useEffect(() => {
    if (!sb) { setEtat("inactif"); return undefined; }
    const { data } = sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") charger(); });
    return () => data.subscription.unsubscribe();
  }, [sb, charger]);

  const action = async (corps) => { await appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify(corps) }); await charger(); };
  const liste = useMemo(() => (donnees?.commandes || []).filter((c) => filtre === "toutes" || !["livree", "devis_refuse", "annulee"].includes(c.statut)), [donnees, filtre]);
  const c = donnees?.commandes.find((x) => x.id === choisie);
  const clientNonLu = c?.messages.some((m) => m.auteur === "client" && !m.lu);
  useEffect(() => { if (c && clientNonLu) action({ action: "lu", commandeId: c.id }).catch(() => {}); }, [c?.id, clientNonLu]); // eslint-disable-line react-hooks/exhaustive-deps

  if (etat !== "pret") {
    const textes = {
      chargement: "Chargement…",
      inactif: "L'espace Server n'est pas encore activé (configuration Supabase manquante).",
      deconnecte: "Connectez-vous avec l'adresse de Server.",
      interdit: erreur || "Accès réservé à Server, le maître du jeu.",
      erreur,
    };
    return (
      <main className="conteneur page">
        <section className="carte connexion-carte">
          <h1 className="h-page">Espace Server · Maître du jeu</h1>
          <p className="discret">{textes[etat]}</p>
          {etat === "deconnecte" && <a className="btn" href="/connexion">Se connecter</a>}
        </section>
      </main>
    );
  }

  return (
    <main className="conteneur page">
      <div className="titre-ligne">
        <div className="maitre-titre"><img src="/personnages/server.webp" alt="" width="60" height="60" /><div><p className="surtitre">Espace Server · Maître du jeu</p><h1 className="h-page">Projets clients</h1><a className="note lien-cyan" href="/espace?client=1">Voir le site comme un client</a><div style={{ marginTop: 8 }}><MotDePasse /></div></div></div>
        <div className="actions">
          {donnees.nonLus > 0 && <span className="badge">✉️ {donnees.nonLus} message{donnees.nonLus > 1 ? "s" : ""} non lu{donnees.nonLus > 1 ? "s" : ""}</span>}
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Filtre" style={{ width: "auto" }}>
            <option value="actives">En cours</option>
            <option value="toutes">Toutes</option>
          </select>
        </div>
      </div>

      <div className="admin-grille">
        <aside className="admin-liste">
          <NouveauProjet creer={async (p) => { const r = await appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify({ action: "creer", ...p }) }); await charger(); setChoisie(r.id); }} />
          {liste.length === 0 && <p className="discret">Aucune commande.</p>}
          {liste.map((x) => {
            const nl = x.messages.filter((m) => m.auteur === "client" && !m.lu).length;
            return (
              <button key={x.id} className={`admin-ligne ${x.id === choisie ? "actif" : ""}`} onClick={() => setChoisie(x.id)}>
                <strong>{x.nom || x.email}</strong>
                <span>{x.source === "manuel" ? "✍️ " : ""}{x.recap?.titre || x.projet?.nom || "Application"} · {date(x.created_at)}</span>
                <small>{statut(x.statut).icone} {statut(x.statut).label}{nl > 0 ? ` · ✉️ ${nl}` : ""}</small>
              </button>
            );
          })}
        </aside>

        {c && (
          <section className="admin-detail">
            <div className="carte">
              <div className="titre-ligne">
                <div><h2>{c.recap?.titre || c.projet?.nom || "Application"}</h2><p className="discret">N° {c.numero} · {date(c.created_at)}</p></div>
                <ChoixStatut c={c} action={action} />
              </div>
              <FriseStatut valeur={c.statut} />
              <InfosProjet c={c} action={action} />
            </div>

            <div className="carte">
              <h2>🖼️ Maquette</h2>
              <BlocMaquette
                key={c.id}
                jeton={c.maquette?.jeton}
                disponible={Boolean(c.maquette)}
                infos={c.maquette ? `Maquette ${c.maquette.source === "ia" ? "créée par l'IA" : "créée à partir du modèle"} le ${date(c.maquette.updated_at)}. Visible aussi par le client dans son espace.` : "Pas encore de maquette pour ce projet."}
                lire={async () => (await appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify({ action: "maquette_lire", commandeId: c.id }) })).html}
                consignesInitiales={c.projet?.idee && c.projet.idee.length >= 10 ? c.projet.idee : ""}
                generer={async ({ consignes, images }) => { await appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify({ action: "maquette_generer", commandeId: c.id, consignes, images }) }); await charger(); }}
              />
            </div>

            <Liens c={c} action={action} />

            <div className="carte">
              <h2>Votre offre au client</h2>
              {c.devis.map((d) => <OffreServer key={d.id} d={d} c={c} action={action} paiementEnLigne={donnees.paiementEnLigne} />)}
              <NouveauDevis paiementEnLigne={donnees.paiementEnLigne} envoyer={(d) => action({ action: "devis", commandeId: c.id, ...d })} />
            </div>

            <div className="carte">
              <h2>Messages et conseils</h2>
              <FilMessages conseil messages={c.messages} moi="equipe" placeholder="Répondre au client ou lui donner un conseil (il sera prévenu par e-mail)…" envoyer={(contenu, type) => action({ action: "message", commandeId: c.id, contenu, type })} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ChoixStatut({ c, action }) {
  const [prevenir, setPrevenir] = useState(true);
  return (
    <div className="choix-statut">
      <select value={c.statut} onChange={(e) => action({ action: "statut", commandeId: c.id, statut: e.target.value, prevenir })} aria-label="Statut">
        {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.icone} {s.label}</option>)}
      </select>
      <label className="note"><input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} /> prévenir le client</label>
    </div>
  );
}

function NouveauDevis({ envoyer, paiementEnLigne }) {
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert) return <button className="btn" onClick={() => setOuvert(true)}>+ Envoyer une offre (tarif, délai)</button>;
  return <FormulaireOffre paiementEnLigne={paiementEnLigne} envoyer={async (f) => { await envoyer(f); setOuvert(false); }} annuler={() => setOuvert(false)} libelle="Envoyer l'offre au client" />;
}

function FormulaireOffre({ envoyer, annuler, paiementEnLigne, initial, libelle, avecPrevenir = false }) {
  const [f, setF] = useState(initial || { montant: "", delaiSemaines: "", details: "", acomptePct: paiementEnLigne ? 30 : 0, prevenir: true });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  async function soumettre(e) {
    e.preventDefault(); setErreur(""); setEnvoi(true);
    try { await envoyer(f); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  return (
    <form onSubmit={soumettre} className="nouveau-devis">
      <div className="formulaire-deux">
        <label className="champ"><span>Montant (€ TTC) *</span><input inputMode="decimal" required value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} placeholder="6500" /></label>
        <label className="champ"><span>Délai (semaines)</span><input inputMode="numeric" value={f.delaiSemaines} onChange={(e) => setF({ ...f, delaiSemaines: e.target.value })} placeholder="8" /></label>
      </div>
      <label className="champ"><span>Détails</span><textarea rows={4} maxLength={4000} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Contenu, étapes, conseils, conditions de paiement…" /></label>
      <label className="champ"><span>Paiement en ligne (Mollie)</span>
        <select value={f.acomptePct} onChange={(e) => setF({ ...f, acomptePct: Number(e.target.value) })} disabled={!paiementEnLigne}>
          {ACOMPTES.map((a) => <option key={a.pct} value={a.pct}>{a.label}</option>)}
        </select>
        {!paiementEnLigne && <small className="discret">Ajoutez MOLLIE_API_KEY dans Vercel pour activer le paiement en ligne.</small>}
      </label>
      {f.montant && Number(f.acomptePct) > 0 && Number.isFinite(Number(f.montant.replace(",", "."))) && <p className="note">Le client paiera en ligne : {euros(montantEnLigne({ montant: Number(f.montant.replace(",", ".")), acompte_pct: Number(f.acomptePct) }))} après acceptation.</p>}
      {f.montant && <p className="note">Le client verra : {Number.isFinite(Number(f.montant.replace(",", "."))) ? euros(Number(f.montant.replace(",", "."))) : "montant invalide"}</p>}
      {avecPrevenir && <label className="note"><input type="checkbox" checked={f.prevenir !== false} onChange={(e) => setF({ ...f, prevenir: e.target.checked })} /> prévenir le client par e-mail</label>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn" disabled={envoi}>{envoi ? "Enregistrement…" : libelle}</button>
        <button type="button" className="btn secondaire" onClick={annuler}>Annuler</button>
      </div>
    </form>
  );
}

// Création d'un projet à la main (client venu par téléphone, bouche-à-oreille…).
function NouveauProjet({ creer }) {
  const vide = { titre: "", nom: "", email: "", telephone: "", idee: "" };
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(vide);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  if (!ouvert) return <button className="btn" onClick={() => setOuvert(true)}>+ Nouveau projet</button>;
  async function soumettre(e) {
    e.preventDefault(); setErreur(""); setEnvoi(true);
    try { await creer(f); setF(vide); setOuvert(false); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  const champ = (cle, label, props = {}) => (
    <label className="champ" style={{ marginTop: 8 }}><span>{label}</span><input value={f[cle]} onChange={(e) => setF({ ...f, [cle]: e.target.value })} {...props} /></label>
  );
  return (
    <form className="carte nouveau-projet" onSubmit={soumettre}>
      <strong>Nouveau projet</strong>
      {champ("titre", "Nom de l'application *", { maxLength: 120, required: true, placeholder: "Ex. : RésaYoga" })}
      {champ("nom", "Client *", { maxLength: 100, required: true, placeholder: "Prénom Nom" })}
      {champ("email", "E-mail du client *", { type: "email", maxLength: 160, required: true, placeholder: "client@exemple.fr" })}
      {champ("telephone", "Téléphone", { maxLength: 30 })}
      <label className="champ" style={{ marginTop: 8 }}><span>Description</span><textarea rows={3} maxLength={2000} value={f.idee} onChange={(e) => setF({ ...f, idee: e.target.value })} /></label>
      {erreur && <p className="alerte erreur">{erreur}</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn petit" disabled={envoi}>{envoi ? "Création…" : "Créer le projet"}</button>
        <button type="button" className="btn petit secondaire" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
      <p className="note">Le client pourra suivre ce projet en se connectant avec cet e-mail.</p>
    </form>
  );
}

// Liens du projet : livrables partagés avec le client, et accès privés de Server.
function Liens({ c, action }) {
  const [f, setF] = useState({ titre: "", url: "", visibleClient: true, prevenir: true });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const liens = c.liens || [];
  async function ajouter(e) {
    e.preventDefault(); setErreur(""); setEnvoi(true);
    try { await action({ action: "lien_ajouter", commandeId: c.id, ...f }); setF({ titre: "", url: "", visibleClient: true, prevenir: true }); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  const groupe = (visible) => liens.filter((l) => l.visible_client === visible);
  const liste = (items) => (
    <ul className="liste-liens">
      {items.map((l) => (
        <li key={l.id}>
          <a className="lien-cyan" href={l.url} target="_blank" rel="noopener noreferrer">{l.titre}</a>
          <button className="lien-danger" aria-label={`Supprimer ${l.titre}`} onClick={() => { if (window.confirm(`Supprimer le lien « ${l.titre} » ?`)) action({ action: "lien_supprimer", commandeId: c.id, lienId: l.id }); }}>×</button>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="carte">
      <h2>Liens et accès du projet</h2>
      <div className="deux-colonnes">
        <div><h3>🔗 Partagés avec le client</h3>{groupe(true).length ? liste(groupe(true)) : <p className="note">Aucun lien pour l'instant.</p>}</div>
        <div><h3>🔒 Vos accès (privés)</h3>{groupe(false).length ? liste(groupe(false)) : <p className="note">Code, Supabase, hébergement…</p>}</div>
      </div>
      <form onSubmit={ajouter} className="ajout-lien">
        <div className="puces" style={{ marginTop: 12 }}>
          {MODELES_LIENS.map((m) => (
            <button
              type="button"
              key={m.titre}
              className="puce"
              onClick={() => setF({ ...f, titre: m.titre, visibleClient: m.client, url: m.titre === "Maquette" && c.maquette?.jeton ? `${window.location.origin}/maquette/${c.maquette.jeton}` : f.url })}
            >{m.client ? "🔗" : "🔒"} {m.titre}</button>
          ))}
        </div>
        <div className="formulaire-deux">
          <label className="champ"><span>Nom du lien</span><input value={f.titre} maxLength={80} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Application web" /></label>
          <label className="champ"><span>Adresse</span><input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" /></label>
        </div>
        <label className="note"><input type="checkbox" checked={f.visibleClient} onChange={(e) => setF({ ...f, visibleClient: e.target.checked })} /> Visible par le client</label>
        {f.visibleClient && <label className="note" style={{ marginLeft: 14 }}><input type="checkbox" checked={f.prevenir} onChange={(e) => setF({ ...f, prevenir: e.target.checked })} /> le prévenir par e-mail</label>}
        {erreur && <p className="alerte erreur">{erreur}</p>}
        <div className="actions" style={{ marginTop: 10 }}><button className="btn petit" disabled={envoi || !f.titre || !f.url}>{envoi ? "Ajout…" : "Ajouter le lien"}</button></div>
        <p className="note">⚠️ N'enregistrez jamais de mot de passe ici : seulement des adresses.</p>
      </form>
    </div>
  );
}

// Une offre côté Server : modifiable ou retirable tant que le client n'a pas répondu.
function OffreServer({ d, c, action, paiementEnLigne }) {
  const [edition, setEdition] = useState(false);
  const [erreur, setErreur] = useState("");
  const modifiable = offreModifiable(d, c.paiements || []);
  if (edition) {
    return (
      <div className="carte-edition">
        <strong>Modifier l'offre</strong>
        <FormulaireOffre
          paiementEnLigne={paiementEnLigne}
          avecPrevenir
          libelle="Enregistrer l'offre"
          initial={{ montant: String(d.montant).replace(".", ","), delaiSemaines: d.delai_semaines ? String(d.delai_semaines) : "", details: d.details || "", acomptePct: d.acompte_pct || 0, prevenir: true }}
          envoyer={async (f) => { await action({ action: "devis_modifier", commandeId: c.id, devisId: d.id, ...f }); setEdition(false); }}
          annuler={() => setEdition(false)}
        />
      </div>
    );
  }
  async function retirer() {
    if (!window.confirm("Retirer cette offre ? Le client ne la verra plus.")) return;
    setErreur("");
    try { await action({ action: "devis_retirer", commandeId: c.id, devisId: d.id }); } catch (e) { setErreur(e.message); }
  }
  return (
    <div>
      <CarteDevis d={d} paiements={c.paiements || []} />
      {modifiable ? (
        <div className="actions" style={{ marginTop: -4, marginBottom: 12 }}>
          <button className="btn petit secondaire" onClick={() => setEdition(true)}>✏️ Modifier l'offre</button>
          <button className="btn petit lien-danger" onClick={retirer}>Retirer</button>
        </div>
      ) : (
        <p className="note" style={{ marginTop: -4 }}>Offre {d.statut === "accepte" ? "acceptée" : d.statut === "refuse" ? "refusée" : "payée"} : pour changer le tarif, envoyez une nouvelle offre.</p>
      )}
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

// Coordonnées du client et infos du projet, modifiables par Server.
function InfosProjet({ c, action }) {
  const [edition, setEdition] = useState(false);
  const depart = { nom: c.nom || "", email: c.email || "", telephone: c.telephone || "", entreprise: c.entreprise || "", titre: c.recap?.titre || c.projet?.nom || "", idee: c.projet?.idee || "" };
  const [f, setF] = useState(depart);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { setF(depart); setEdition(false); }, [c.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!edition) {
    return (
      <div className="infos">
        <p><b>Client :</b> {c.nom} · <a className="lien-cyan" href={`mailto:${c.email}`}>{c.email}</a>{c.telephone ? ` · ${c.telephone}` : ""}{c.entreprise ? ` · ${c.entreprise}` : ""}</p>
        <p><b>Formule :</b> {labelFormule(c.formule)} · <b>Budget :</b> {trouver(BUDGETS, c.projet?.budget)?.label || "—"} · <b>Délai :</b> {trouver(DELAIS, c.projet?.delai)?.label || "—"} · <b>Priorité :</b> {trouver(PRIORITES, c.projet?.priorite)?.label || "—"}</p>
        <p><b>Type :</b> {trouver(TYPES, c.projet?.typeId)?.label || "—"}</p>
        <p><b>Idée :</b> {c.projet?.idee || "—"}</p>
        <p><b>Fonctionnalités :</b> {[...(c.projet?.fonctionnalites || []).map((id) => fonctionnalite(id)?.label || id), ...(c.projet?.personnalisees || [])].join(", ") || "—"}</p>
        {c.projet?.message && <p><b>Message :</b> {c.projet.message}</p>}
        <p><b>Maquette :</b> {c.projet?.maquetteValidee ? "✅ acceptée par le client" : "pas encore acceptée"}{c.projet?.retours?.length ? ` · ${c.projet.retours.length} demande(s) de modification` : ""}</p>
        {c.projet?.retours?.length > 0 && <ul className="retours-admin">{c.projet.retours.map((r, i) => <li key={i}>💬 {r}</li>)}</ul>}
        {c.projet?.pieces?.length > 0 && <p><b>Pièces jointes (reçues par e-mail) :</b> {c.projet.pieces.join(", ")}</p>}
        <button className="btn petit secondaire" onClick={() => setEdition(true)}>✏️ Modifier les coordonnées et le projet</button>
      </div>
    );
  }
  async function enregistrer(e) {
    e.preventDefault(); setErreur(""); setEnvoi(true);
    try { await action({ action: "infos_modifier", commandeId: c.id, ...f }); setEdition(false); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  const champ = (cle, label, props = {}) => <label className="champ"><span>{label}</span><input value={f[cle]} onChange={(e) => setF({ ...f, [cle]: e.target.value })} {...props} /></label>;
  return (
    <form className="carte-edition" onSubmit={enregistrer}>
      <strong>Modifier les coordonnées et le projet</strong>
      <div className="formulaire-deux">
        {champ("nom", "Client *", { maxLength: 100, required: true })}
        {champ("email", "E-mail du client *", { type: "email", maxLength: 160, required: true })}
        {champ("telephone", "Téléphone", { type: "tel", maxLength: 30 })}
        {champ("entreprise", "Entreprise / association", { maxLength: 120 })}
      </div>
      {champ("titre", "Nom de l'application", { maxLength: 120 })}
      <label className="champ"><span>Description du projet</span><textarea rows={4} maxLength={2000} value={f.idee} onChange={(e) => setF({ ...f, idee: e.target.value })} /></label>
      {f.email.trim().toLowerCase() !== (c.email || "").toLowerCase() && <p className="alerte">⚠️ Le client devra désormais se connecter avec la nouvelle adresse pour voir ce projet.</p>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" className="btn secondaire" onClick={() => { setF(depart); setEdition(false); }}>Annuler</button>
      </div>
    </form>
  );
}
