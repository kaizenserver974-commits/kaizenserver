"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseNavigateur, appelAuthentifie } from "../../lib/supabaseClient.js";
import { STATUTS, statut } from "../../lib/espace.js";
import { FriseStatut, FilMessages, CarteDevis, date, euros } from "../components/Espace.js";
import { TYPES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "../../lib/catalogue.js";
import { FORMULES } from "../../lib/commande.js";

export default function Admin() {
  const sb = supabaseNavigateur();
  const [donnees, setDonnees] = useState(null);
  const [etat, setEtat] = useState("chargement");
  const [erreur, setErreur] = useState("");
  const [choisie, setChoisie] = useState(null);
  const [filtre, setFiltre] = useState("actives");

  const charger = useCallback(async () => {
    try {
      const d = await appelAuthentifie("/api/admin");
      setDonnees(d);
      setChoisie((c) => c || d.commandes[0]?.id || null);
      setEtat("pret");
    } catch (e) {
      setErreur(e.message);
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
      inactif: "L'espace équipe n'est pas encore activé (configuration Supabase manquante).",
      deconnecte: "Connectez-vous avec une adresse de l'équipe.",
      interdit: "Accès réservé à l'équipe KaizenServer.",
      erreur,
    };
    return (
      <main className="conteneur page">
        <section className="carte connexion-carte">
          <h1 className="h-page">Espace équipe</h1>
          <p className="discret">{textes[etat]}</p>
          {etat === "deconnecte" && <a className="btn" href="/connexion">Se connecter</a>}
        </section>
      </main>
    );
  }

  return (
    <main className="conteneur page">
      <div className="titre-ligne">
        <div><p className="surtitre">Espace équipe</p><h1 className="h-page">Commandes</h1></div>
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
          {liste.length === 0 && <p className="discret">Aucune commande.</p>}
          {liste.map((x) => {
            const nl = x.messages.filter((m) => m.auteur === "client" && !m.lu).length;
            return (
              <button key={x.id} className={`admin-ligne ${x.id === choisie ? "actif" : ""}`} onClick={() => setChoisie(x.id)}>
                <strong>{x.nom || x.email}</strong>
                <span>{x.recap?.titre || x.projet?.nom || "Application"} · {date(x.created_at)}</span>
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
              <div className="infos">
                <p><b>Client :</b> {c.nom} · <a className="lien-cyan" href={`mailto:${c.email}`}>{c.email}</a>{c.telephone ? ` · ${c.telephone}` : ""}{c.entreprise ? ` · ${c.entreprise}` : ""}</p>
                <p><b>Formule :</b> {FORMULES.find((f) => f.id === c.formule)?.label || c.formule} · <b>Budget :</b> {trouver(BUDGETS, c.projet?.budget)?.label || "—"} · <b>Délai :</b> {trouver(DELAIS, c.projet?.delai)?.label || "—"} · <b>Priorité :</b> {trouver(PRIORITES, c.projet?.priorite)?.label || "—"}</p>
                <p><b>Type :</b> {trouver(TYPES, c.projet?.typeId)?.label || "—"}</p>
                <p><b>Idée :</b> {c.projet?.idee}</p>
                <p><b>Fonctionnalités :</b> {[...(c.projet?.fonctionnalites || []).map((id) => fonctionnalite(id)?.label || id), ...(c.projet?.personnalisees || [])].join(", ") || "—"}</p>
                {c.projet?.message && <p><b>Message :</b> {c.projet.message}</p>}
                {c.projet?.pieces?.length > 0 && <p><b>Pièces jointes (reçues par e-mail) :</b> {c.projet.pieces.join(", ")}</p>}
              </div>
            </div>

            <div className="carte">
              <h2>Devis</h2>
              {c.devis.map((d) => <CarteDevis key={d.id} d={d} />)}
              <NouveauDevis envoyer={(d) => action({ action: "devis", commandeId: c.id, ...d })} />
            </div>

            <div className="carte">
              <h2>Messages</h2>
              <FilMessages messages={c.messages} moi="equipe" placeholder="Répondre au client (il sera prévenu par e-mail)…" envoyer={(contenu) => action({ action: "message", commandeId: c.id, contenu })} />
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

function NouveauDevis({ envoyer }) {
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ montant: "", delaiSemaines: "", details: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  if (!ouvert) return <button className="btn" onClick={() => setOuvert(true)}>+ Créer un devis</button>;
  async function soumettre(e) {
    e.preventDefault(); setErreur(""); setEnvoi(true);
    try { await envoyer(f); setF({ montant: "", delaiSemaines: "", details: "" }); setOuvert(false); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }
  return (
    <form onSubmit={soumettre} className="nouveau-devis">
      <div className="formulaire-deux">
        <label className="champ"><span>Montant (€ TTC) *</span><input inputMode="decimal" required value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} placeholder="6500" /></label>
        <label className="champ"><span>Délai (semaines)</span><input inputMode="numeric" value={f.delaiSemaines} onChange={(e) => setF({ ...f, delaiSemaines: e.target.value })} placeholder="8" /></label>
      </div>
      <label className="champ"><span>Détails</span><textarea rows={4} maxLength={4000} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Contenu de la prestation, étapes, conditions de paiement…" /></label>
      {f.montant && <p className="note">Le client verra : {Number.isFinite(Number(f.montant.replace(",", "."))) ? euros(Number(f.montant.replace(",", "."))) : "montant invalide"}</p>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn" disabled={envoi}>{envoi ? "Envoi…" : "Envoyer le devis au client"}</button>
        <button type="button" className="btn secondaire" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
    </form>
  );
}
