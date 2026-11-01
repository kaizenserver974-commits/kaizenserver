"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseNavigateur, appelAuthentifie } from "../../lib/supabaseClient.js";
import { statut } from "../../lib/espace.js";
import { FriseStatut, FilMessages, CarteDevis, date } from "../components/Espace.js";

const ONGLETS = [
  { id: "commandes", label: "Mes commandes", icone: "📦" },
  { id: "devis", label: "Devis", icone: "🧾" },
  { id: "messages", label: "Messages", icone: "✉️" },
  { id: "profil", label: "Profil", icone: "👤" },
];

export default function Page() {
  return <Suspense fallback={<main className="conteneur page"><p className="discret">Chargement…</p></main>}><Espace /></Suspense>;
}

function Espace() {
  const params = useSearchParams();
  const sb = supabaseNavigateur();
  const [onglet, setOnglet] = useState(ONGLETS.some((o) => o.id === params.get("onglet")) ? params.get("onglet") : "commandes");
  const [donnees, setDonnees] = useState(null);
  const [etat, setEtat] = useState("chargement"); // chargement | pret | deconnecte | inactif | erreur
  const [erreur, setErreur] = useState("");
  const [choisie, setChoisie] = useState(null);

  const charger = useCallback(async () => {
    try {
      const d = await appelAuthentifie("/api/espace");
      setDonnees(d);
      setChoisie((c) => c || d.commandes[0]?.id || null);
      setEtat("pret");
    } catch (e) {
      if (e.status === 401) setEtat("deconnecte");
      else if (e.status === 503) setEtat("inactif");
      else { setErreur(e.message); setEtat("erreur"); }
    }
  }, []);

  useEffect(() => {
    if (!sb) { setEtat("inactif"); return undefined; }
    const { data } = sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") charger(); if (evt === "SIGNED_OUT") setEtat("deconnecte"); });
    return () => data.subscription.unsubscribe();
  }, [sb, charger]);

  const changerOnglet = (id) => { setOnglet(id); window.history.replaceState(null, "", `/espace?onglet=${id}`); };
  const action = async (corps) => { await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify(corps) }); await charger(); };

  // Ouvrir les messages d'une commande les marque comme lus.
  const commande = donnees?.commandes.find((c) => c.id === choisie);
  const aNonLus = commande?.messages.some((m) => m.auteur === "equipe" && !m.lu);
  useEffect(() => {
    if (onglet === "messages" && commande && aNonLus) action({ action: "lu", commandeId: commande.id }).catch(() => {});
  }, [onglet, commande?.id, aNonLus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (etat === "chargement") return <main className="conteneur page"><p className="discret">Chargement de votre espace…</p></main>;
  if (etat === "inactif") return <Message titre="Espace client bientôt disponible" texte="La connexion n'est pas encore activée sur ce site. Vos projets restent disponibles dans « Mes projets »." lien="/projets" bouton="Mes projets" />;
  if (etat === "deconnecte") return <Message titre="Connectez-vous" texte="Retrouvez vos commandes, vos devis et vos messages avec l'e-mail utilisé lors de votre commande." lien="/connexion" bouton="Se connecter" />;
  if (etat === "erreur") return <Message titre="Oups" texte={erreur} lien="/espace" bouton="Réessayer" />;

  const { commandes } = donnees;
  const tousDevis = commandes.flatMap((c) => c.devis.map((d) => ({ ...d, commande: c })));
  const devisEnAttente = tousDevis.filter((d) => d.statut === "envoye").length;

  return (
    <main className="conteneur page">
      <div className="titre-ligne">
        <div><p className="surtitre">Mon espace</p><h1 className="h-page">Bonjour {commandes[0]?.nom?.split(" ")[0] || ""} 👋</h1></div>
        <div className="actions">
          {donnees.admin && <a className="btn contour petit" href="/admin">Espace équipe</a>}
          <a className="btn petit" href="/nouveau">Nouveau projet</a>
        </div>
      </div>

      <div className="onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button key={o.id} role="tab" aria-selected={onglet === o.id} className={`onglet ${onglet === o.id ? "actif" : ""}`} onClick={() => changerOnglet(o.id)}>
            <span aria-hidden="true">{o.icone}</span> {o.label}
            {o.id === "messages" && donnees.nonLus > 0 && <b className="pastille-compte">{donnees.nonLus}</b>}
            {o.id === "devis" && devisEnAttente > 0 && <b className="pastille-compte">{devisEnAttente}</b>}
          </button>
        ))}
      </div>

      {onglet !== "profil" && commandes.length === 0 && (
        <div className="carte vide"><p>Aucune commande associée à {donnees.email} pour l'instant.</p><a className="btn" href="/nouveau">Commander mon application</a></div>
      )}

      {onglet === "commandes" && commandes.map((c) => (
        <article key={c.id} className="carte commande-carte">
          <div className="titre-ligne">
            <div><h2>{c.recap?.titre || c.projet?.nom || "Mon application"}</h2><p className="discret">N° {c.numero} · commandée le {date(c.created_at)}</p></div>
            <span className="badge">{statut(c.statut).icone} {statut(c.statut).label}</span>
          </div>
          <FriseStatut valeur={c.statut} />
          <div className="actions">
            <button className="btn secondaire petit" onClick={() => { setChoisie(c.id); changerOnglet("messages"); }}>✉️ Messages ({c.messages.length})</button>
            {c.devis.length > 0 && <button className="btn secondaire petit" onClick={() => changerOnglet("devis")}>🧾 Devis ({c.devis.length})</button>}
          </div>
        </article>
      ))}

      {onglet === "devis" && commandes.length > 0 && (tousDevis.length === 0
        ? <div className="carte vide"><p>Pas encore de devis : l'équipe étudie votre projet et vous enverra une proposition ici.</p></div>
        : tousDevis.map((d) => (
          <div key={d.id} className="carte">
            <p className="discret">{d.commande.recap?.titre || "Mon application"} · N° {d.commande.numero}</p>
            <CarteDevis d={d} repondre={(decision) => action({ action: "devis", commandeId: d.commande.id, devisId: d.id, decision })} />
          </div>
        )))}

      {onglet === "messages" && commande && (
        <div className="carte">
          {commandes.length > 1 && (
            <label className="champ" style={{ marginTop: 0 }}><span>Commande</span>
              <select value={choisie} onChange={(e) => setChoisie(e.target.value)}>
                {commandes.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.recap?.titre || "Mon application"}</option>)}
              </select>
            </label>
          )}
          <h2>Échanges avec l'équipe</h2>
          <FilMessages messages={commande.messages} moi="client" placeholder="Écrivez à l'équipe KaizenServer…" envoyer={(contenu) => action({ action: "message", commandeId: commande.id, contenu })} />
        </div>
      )}

      {onglet === "profil" && (
        <div className="carte profil">
          <h2>Mon profil</h2>
          <p><span className="discret">E-mail :</span> {donnees.email}</p>
          {commandes[0]?.nom && <p><span className="discret">Nom :</span> {commandes[0].nom}</p>}
          {commandes[0]?.telephone && <p><span className="discret">Téléphone :</span> {commandes[0].telephone}</p>}
          <p><span className="discret">Commandes :</span> {commandes.length}</p>
          <div className="actions">
            <a className="btn secondaire" href="/projets">Mes projets (brouillons)</a>
            <button className="btn secondaire lien-danger" onClick={async () => { await sb.auth.signOut(); window.location.href = "/"; }}>Se déconnecter</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Message({ titre, texte, lien, bouton }) {
  return (
    <main className="conteneur page">
      <section className="carte etape connexion-carte">
        <img src="/personnages/bip.webp" alt="" width="72" height="72" className="avatar-illustre" style={{ "--anneau": "#7b5cff" }} />
        <h1 className="h-page">{titre}</h1>
        <p className="discret">{texte}</p>
        <a className="btn" href={lien}>{bouton}</a>
      </section>
    </main>
  );
}
