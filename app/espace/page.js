"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseNavigateur, appelAuthentifie } from "../../lib/supabaseClient.js";
import { statut, montantEnLigne } from "../../lib/espace.js";
import MotDePasse from "../components/MotDePasse.js";
import { COUT_MODIF_SERVER } from "../../lib/pieces.js";
import { SuiviCommande, FilMessages, CarteDevis, BlocMaquette, date, euros } from "../components/Espace.js";

const ONGLETS = [
  { id: "commandes", label: "Ma commande", icone: "🚚" },
  { id: "devis", label: "Offres de Server", icone: "🧾" },
  { id: "messages", label: "Maître du jeu", icone: "👑" },
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
      // Server (admin) arrive directement dans son espace, sauf s'il demande la vue client.
      const q = new URLSearchParams(window.location.search);
      if (d.admin && !q.has("client") && !q.has("paiement")) {
        window.location.replace("/admin");
        return;
      }
      setDonnees(d);
      setChoisie((c) => c || d.commandes[0]?.id || null);
      setEtat("pret");
    } catch (e) {
      if (e.status === 401) { await sb?.auth.signOut({ scope: "local" }).catch(() => {}); setEtat("deconnecte"); }
      else if (e.status === 503) setEtat("inactif");
      else { setErreur(e.message); setEtat("erreur"); }
    }
  }, []);

  useEffect(() => {
    if (!sb) { setEtat("inactif"); return undefined; }
    const { data } = sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") charger(); if (evt === "SIGNED_OUT") setEtat("deconnecte"); });
    return () => data.subscription.unsubscribe();
  }, [sb, charger]);

  const changerOnglet = (id) => {
    setOnglet(id);
    const vueClient = new URLSearchParams(window.location.search).has("client") ? "&client=1" : "";
    window.history.replaceState(null, "", `/espace?onglet=${id}${vueClient}`);
  };
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

  const tout = donnees.commandes;
  const commandes = tout.filter((c) => c.formule !== "contact"); // le fil « Message à Server » n'est pas une commande
  const tousDevis = commandes.flatMap((c) => c.devis.map((d) => ({ ...d, commande: c })));
  const devisEnAttente = tousDevis.filter((d) => d.statut === "envoye").length;

  return (
    <main className="conteneur page">
      <div className="titre-ligne">
        <div><p className="surtitre">Mon espace</p><h1 className="h-page">Bonjour {commandes[0]?.nom?.split(" ")[0] || ""} 👋</h1></div>
        <div className="actions">
          {donnees.admin && <a className="btn contour petit" href="/admin">👑 Retour à l'Espace Server</a>}
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

      {params.get("paiement") === "retour" && (
        <p className="succes">💳 Retour de Mollie : si votre paiement est validé, il apparaît ci-dessous sous quelques instants (rechargez la page au besoin). Vous recevrez aussi un e-mail.</p>
      )}

      {(onglet === "commandes" || onglet === "devis") && commandes.length === 0 && (
        <div className="carte vide"><p>Aucune commande associée à {donnees.email} pour l'instant.</p><a className="btn" href="/nouveau">Commander mon application</a></div>
      )}

      {onglet === "commandes" && commandes.map((c) => (
        <article key={c.id} className="carte commande-carte">
          <div className="titre-ligne">
            <div><h2>{c.recap?.titre || c.projet?.nom || "Mon application"}</h2><p className="discret">N° {c.numero} · commandée le {date(c.created_at)}</p></div>
            </div>
          <ParcoursCommande c={c} recharger={charger} paiementEnLigne={donnees.paiementEnLigne} />
          {c.liens?.length > 0 && (
            <div className="liens-client">
              <h3>🔗 Vos liens</h3>
              <ul>{c.liens.map((l) => <li key={l.id}><a className="lien-cyan" href={l.url} target="_blank" rel="noopener noreferrer">{l.titre}</a></li>)}</ul>
            </div>
          )}
          <div className="actions">
            <button className="btn secondaire petit" onClick={() => { setChoisie(c.id); changerOnglet("messages"); }}>👑 Maître du jeu ({c.messages.length})</button>
            {c.devis.length > 0 && <button className="btn secondaire petit" onClick={() => changerOnglet("devis")}>🧾 Offres ({c.devis.length})</button>}
          </div>
        </article>
      ))}

      {onglet === "devis" && commandes.length > 0 && (tousDevis.length === 0
        ? <div className="carte vide"><img src="/personnages/server.webp" alt="" width="64" height="64" /><p>Server, le maître du jeu, étudie votre projet : son offre (tarif, délai) apparaîtra ici.</p></div>
        : tousDevis.map((d) => (
          <div key={d.id} className="carte">
            <p className="discret">{d.commande.recap?.titre || "Mon application"} · N° {d.commande.numero}</p>
            <CarteDevis
              d={d}
              paiements={d.commande.paiements || []}
              paiementEnLigne={donnees.paiementEnLigne}
              repondre={(decision) => action({ action: "devis", commandeId: d.commande.id, devisId: d.id, decision })}
              payer={async () => (await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "payer", commandeId: d.commande.id, devisId: d.id }) })).url}
            />
          </div>
        )))}

      {onglet === "messages" && commande && (
        <div className="carte">
          {tout.length > 1 && (
            <label className="champ" style={{ marginTop: 0 }}><span>Discussion</span>
              <select value={choisie} onChange={(e) => setChoisie(e.target.value)}>
                {tout.map((c) => <option key={c.id} value={c.id}>{c.formule === "contact" ? "💬 Message à Server" : `${c.numero} — ${c.recap?.titre || "Mon application"}`}</option>)}
              </select>
            </label>
          )}
          <div className="maitre"><img src="/personnages/server.webp" alt="" width="56" height="56" /><div><strong>Server · Maître du jeu</strong><p>Posez vos questions : je vous réponds ici, avec mes conseils pour votre projet.</p></div></div>
          <FilMessages messages={commande.messages} moi="client" placeholder="Écrivez à Server, le maître du jeu…" envoyer={(contenu) => action({ action: "message", commandeId: commande.id, contenu })} />
        </div>
      )}

      {onglet === "messages" && !commande && (
        <div className="carte">
          <div className="maitre"><img src="/personnages/server.webp" alt="" width="56" height="56" /><div><strong>Server · Maître du jeu</strong><p>Une question, une idée, un conseil avant de commander ? Écrivez-moi : je vous réponds ici et par e-mail.</p></div></div>
          <FilMessages messages={[]} moi="client" placeholder="Écrivez à Server, le maître du jeu…" envoyer={async (contenu) => { await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "contact", contenu }) }); await charger(); }} />
        </div>
      )}

      {onglet === "profil" && (
        <div className="carte profil">
          <h2>Mon profil</h2>
          <p><span className="discret">E-mail :</span> {donnees.email}</p>
          {commandes[0]?.nom && <p><span className="discret">Nom :</span> {commandes[0].nom}</p>}
          {commandes[0]?.telephone && <p><span className="discret">Téléphone :</span> {commandes[0].telephone}</p>}
          <p><span className="discret">Commandes :</span> {commandes.length}</p>
          <MotDePasse />
          <div className="actions" style={{ marginTop: 12 }}>
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

// ---------- Parcours de la commande, étape par étape ----------
// 1. La maquette et l'offre (tarif, acompte) — accepter, ou demander une modification
// 2. Payer l'acompte en ligne
// 3. Votre commande est en cours — informations et choix envoyés par Server
// 4. Application livrée
const ETAPES_COMMANDE = [["maquette", "Maquette et offre"], ["paiement", "Paiement de l'acompte"], ["cours", "Commande en cours"], ["livree", "Livrée"]];

function etapeCommande(c) {
  if (c.statut === "livree") return "livree";
  const offres = c.devis || [];
  const offre = offres.find((d) => d.statut === "envoye") || [...offres].reverse().find((d) => d.statut === "accepte");
  const accepte = c.projet?.maquetteValidee === true && (!offre || offre.statut === "accepte");
  if (!accepte) return "maquette";
  const aPayer = offre && offre.statut === "accepte" ? montantEnLigne(offre) : 0;
  const paye = (c.paiements || []).some((p) => p.statut === "paid" && (!offre || p.devis_id === offre.id));
  if (aPayer > 0 && !paye && c.statut !== "en_developpement") return "paiement";
  return "cours";
}

// Toujours en haut de la commande : les pièces d'or du projet et l'achat de pièces.
function BarrePieces({ c }) {
  const [solde, setSolde] = useState(null);
  const projet = c.projet?.projetLocal;
  useEffect(() => {
    if (!projet) return;
    appelAuthentifie("/api/pieces/solde", { method: "POST", body: JSON.stringify({ projet }) }).then((d) => setSolde(d.solde)).catch(() => {});
  }, [projet]);
  if (!projet) return null;
  return (
    <div className="barre-pieces">
      <span>🪙 <b>{solde ?? "…"}</b> pièces d'or pour ce projet</span>
      <a className="btn petit bourse-acheter" href={`/nouveau?id=${encodeURIComponent(projet)}&recharge=1`}>＋ Acheter des pièces</a>
    </div>
  );
}

function ParcoursCommande({ c, recharger, paiementEnLigne }) {
  const etape = etapeCommande(c);
  const index = ETAPES_COMMANDE.findIndex(([id]) => id === etape);
  const [voirMaquette, setVoirMaquette] = useState(false);
  const lire = async () => (await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "maquette_lire", commandeId: c.id }) })).html;
  return (
    <div className="parcours-commande">
      <BarrePieces c={c} />
      <ol className="etapes-commande">
        {ETAPES_COMMANDE.map(([id, label], i) => (
          <li key={id} className={i < index ? "faite" : i === index ? "actuelle" : ""}><span>{i < index ? "✓" : i + 1}</span>{label}</li>
        ))}
      </ol>

      {etape === "maquette" && (
        !c.maquette ? (
          <div className="etape-commande"><h3>🧞 Server prépare votre maquette</h3><p className="discret">Vous serez prévenu par e-mail dès qu'elle est prête, avec son offre.</p><SuiviCommande valeur={c.statut} majLe={c.updated_at} /></div>
        ) : (
          <div className="etape-commande">
            <h3>1. Votre maquette et l'offre de Server</h3>
            <BlocMaquette disponible ouvrir lire={lire} />
            <OffreEtAcceptation c={c} recharger={recharger} />
            <DemandeModification c={c} recharger={recharger} />
          </div>
        )
      )}

      {etape === "paiement" && <EtapePaiement c={c} paiementEnLigne={paiementEnLigne} />}

      {(etape === "cours" || etape === "livree") && (
        <div className="etape-commande">
          <h3>{etape === "livree" ? "🚀 Votre application est livrée !" : "🛠️ Votre commande est en cours"}</h3>
          <p className="discret">{etape === "livree" ? "Retrouvez ci-dessous vos liens et vos accès." : "Server réalise votre application. Il vous transmet ici ses informations et les choix à faire : répondez pour qu'il avance."}</p>
          <SuiviCommande valeur={c.statut} majLe={c.updated_at} />
          <ChoixClient c={c} recharger={recharger} />
          {c.maquette && (
            <div className="revoir-maquette">
              <button className="btn petit secondaire" onClick={() => setVoirMaquette((x) => !x)}>{voirMaquette ? "Masquer la maquette" : "🖼️ Revoir la maquette acceptée"}</button>
              {voirMaquette && <BlocMaquette disponible ouvrir lire={lire} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Étape 1 : l'offre (tarif, délai, acompte) et le bouton « J'accepte la maquette et l'offre ».
function OffreEtAcceptation({ c, recharger }) {
  const offre = (c.devis || []).find((d) => d.statut === "envoye");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const enLigne = offre ? montantEnLigne(offre) : 0;
  async function accepter() {
    const texte = offre
      ? `Accepter la maquette et l'offre de ${euros(offre.montant)} ?\n\nEn acceptant, vous acceptez les conditions générales de vente (page « Conditions de vente »).`
      : "Accepter cette maquette ? Server sera prévenu et vous enverra son offre.";
    if (!window.confirm(texte)) return;
    setEnCours(true); setErreur("");
    try { await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "accepter_tout", commandeId: c.id }) }); await recharger(); }
    catch (e) { setErreur(e.message); } finally { setEnCours(false); }
  }
  return (
    <div className="accepter-maquette">
      {offre ? (
        <div className="offre-client">
          <p className="discret">🧾 L'offre de Server pour réaliser votre application</p>
          <p className="prix">{euros(offre.montant)}{offre.delai_semaines ? <small> · environ {offre.delai_semaines} semaine{offre.delai_semaines > 1 ? "s" : ""}</small> : null}</p>
          {offre.details && <p className="devis-details">{offre.details}</p>}
          <p>{enLigne > 0 ? <>💳 À régler en ligne après acceptation : <b>{offre.acompte_pct < 100 ? `acompte de ${offre.acompte_pct} % (${euros(enLigne)})` : euros(enLigne)}</b></> : "Server vous indiquera comment régler."}</p>
        </div>
      ) : <p className="discret">Server vous enverra son offre (tarif, délai) avec la maquette.</p>}
      <p><b>{offre ? "La maquette et l'offre vous conviennent ?" : "Cette maquette vous plaît ?"}</b> Acceptez{offre ? "-les" : "-la"}, ou demandez une modification juste en dessous.</p>
      <button className="btn grand" disabled={enCours} onClick={accepter}>{enCours ? "Envoi…" : offre ? "✅ J'accepte la maquette et l'offre" : "✅ J'accepte cette maquette"}</button>
      {offre && <small className="discret">En acceptant, vous acceptez nos <a className="lien-cyan" href="/cgv" target="_blank" rel="noopener">conditions de vente</a>.</small>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

// Étape 2 : payer l'acompte (Mollie).
function EtapePaiement({ c, paiementEnLigne }) {
  const offre = [...(c.devis || [])].reverse().find((d) => d.statut === "accepte");
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  if (!offre) return null;
  const montant = montantEnLigne(offre);
  const libelle = offre.acompte_pct < 100 ? `l'acompte de ${offre.acompte_pct} % (${euros(montant)})` : euros(montant);
  const enCours = (c.paiements || []).find((p) => p.devis_id === offre.id && ["open", "pending", "authorized"].includes(p.statut));
  async function payer() {
    setAttente(true); setErreur("");
    try {
      const r = await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "payer", commandeId: c.id, devisId: offre.id }) });
      window.location.href = r.url;
    } catch (e) { setErreur(e.message); setAttente(false); }
  }
  return (
    <div className="etape-commande">
      <h3>2. Payez l'acompte pour lancer votre application</h3>
      <p>✅ Vous avez accepté la maquette et l'offre de <b>{euros(offre.montant)}</b>. Il reste à régler <b>{libelle}</b> : dès réception, Server lance la réalisation.</p>
      {paiementEnLigne ? (
        <div className="paiement">
          <button className="btn grand" disabled={attente} onClick={payer}>{attente ? "Redirection vers le paiement…" : `💳 Payer ${libelle}`}</button>
          <small className="discret">🔒 Paiement sécurisé par Mollie (carte bancaire, Apple Pay, virement…). {enCours ? "Un paiement est déjà en cours : vous pouvez le reprendre." : ""}</small>
        </div>
      ) : <p className="note">💳 Server vous indiquera comment régler {libelle}.</p>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

// Étape 3 : les choix envoyés par Server (gratuits ou validés avec des pièces d'or).
function ChoixClient({ c, recharger }) {
  const liste = Array.isArray(c.projet?.choix) ? c.projet.choix : [];
  if (!liste.length) return <p className="note">📋 Aucun choix à faire pour le moment : Server vous préviendra par e-mail.</p>;
  const aFaire = liste.filter((x) => !x.reponse);
  return (
    <div className="choix-client">
      <h4>📋 Vos choix {aFaire.length ? <span className="badge">{aFaire.length} à faire</span> : null}</h4>
      {[...aFaire, ...liste.filter((x) => x.reponse)].map((ch) => <UnChoix key={ch.id} c={c} ch={ch} recharger={recharger} />)}
    </div>
  );
}

function UnChoix({ c, ch, recharger }) {
  const [option, setOption] = useState("");
  const [etat, setEtat] = useState("");
  async function valider() {
    if (ch.cout > 0 && !window.confirm(`Valider « ${option} » pour ${ch.cout} pièces d'or ?`)) return;
    setEtat("envoi");
    try { await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "choix_repondre", commandeId: c.id, choixId: ch.id, option }) }); setEtat(""); await recharger(); }
    catch (e) { setEtat(e.message); }
  }
  if (ch.reponse) {
    return <div className="un-choix fait"><p><b>{ch.question}</b></p><p>☑️ Votre choix : <b>{ch.reponse}</b>{ch.cout > 0 ? <small className="discret"> · {ch.cout} 🪙</small> : null}</p></div>;
  }
  return (
    <div className="un-choix">
      <div className="titre-ligne"><p><b>{ch.question}</b></p><span className={`badge ${ch.cout > 0 ? "badge-or" : "badge-gratuit"}`}>{ch.cout > 0 ? `🪙 ${ch.cout} pièces d'or` : "Gratuit"}</span></div>
      {ch.details && <p className="discret">{ch.details}</p>}
      <div className="options-choix">
        {ch.options.map((o) => (
          <label key={o} className={`option-choix ${option === o ? "choisie" : ""}`}>
            <input type="radio" name={`choix-${ch.id}`} checked={option === o} onChange={() => setOption(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <button className="btn" disabled={!option || etat === "envoi"} onClick={valider}>{etat === "envoi" ? "Envoi…" : ch.cout > 0 ? `Valider mon choix (−${ch.cout} 🪙)` : "Valider mon choix"}</button>
      {etat && etat !== "envoi" && <p className="alerte erreur">{etat}</p>}
    </div>
  );
}

// Accepter la maquette envoyée par Server (gratuit) : Server est prévenu et passe à la suite.
function AccepterMaquette({ c, recharger }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  if (c.projet?.maquetteValidee) {
    return <p className="succes">✅ Vous avez accepté cette maquette{c.projet.maquetteAccepteeLe ? ` le ${date(c.projet.maquetteAccepteeLe)}` : ""}. Server prépare la suite et vous enverra son offre.</p>;
  }
  async function accepter() {
    if (!window.confirm("Accepter cette maquette ? Server sera prévenu et préparera la suite de votre projet.")) return;
    setEnCours(true); setErreur("");
    try { await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "maquette_accepter", commandeId: c.id }) }); await recharger(); }
    catch (e) { setErreur(e.message); } finally { setEnCours(false); }
  }
  return (
    <div className="accepter-maquette">
      <p><b>Cette maquette vous plaît ?</b> Acceptez-la, ou demandez une modification juste en dessous.</p>
      <button className="btn" disabled={enCours} onClick={accepter}>{enCours ? "Envoi…" : "✅ J'accepte cette maquette"}</button>
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

// Demander à Server une modification de la maquette : 30 pièces d'or (bourse du projet).
function DemandeModification({ c, recharger }) {
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState("");
  const [solde, setSolde] = useState(null);
  const projet = c.projet?.projetLocal;
  useEffect(() => {
    if (!projet) return;
    appelAuthentifie("/api/pieces/solde", { method: "POST", body: JSON.stringify({ projet }) }).then((d) => setSolde(d.solde)).catch(() => {});
  }, [projet]);
  async function envoyer() {
    setEtat("envoi");
    try {
      const d = await appelAuthentifie("/api/espace", { method: "POST", body: JSON.stringify({ action: "modification", commandeId: c.id, contenu: texte.trim() }) });
      setSolde(d.solde); setTexte(""); setEtat("ok"); recharger?.();
    } catch (e) { setEtat(e.message); }
  }
  const assez = solde === null || solde >= COUT_MODIF_SERVER;
  return (
    <div className="demande-modif">
      <div className="titre-ligne">
        <h3>✏️ Demander une modification à Server</h3>
        {projet && solde !== null && <span className="solde">🪙 {solde} pièces d'or</span>}
      </div>
      <p className="discret">Dites précisément ce que vous voulez changer, un point par ligne (couleurs, écrans, textes, photos…). Server retouche votre maquette et vous prévient. Chaque demande coûte <b>{COUT_MODIF_SERVER} pièces d'or</b>.</p>
      <textarea rows={3} maxLength={3000} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={"Ex. :\nAccueil : mettre la photo de ma moto en arrière-plan\nAjouter un écran « Historique d'entretien »"} />
      {etat === "ok" && <p className="succes">✅ Demande envoyée à Server (−{COUT_MODIF_SERVER} 🪙). Il vous répond dans vos messages.</p>}
      {etat && etat !== "ok" && etat !== "envoi" && <p className="alerte erreur">{etat}</p>}
      {!assez && <p className="alerte">Il vous manque {COUT_MODIF_SERVER - solde} pièces d'or. {projet && <a className="lien-cyan" href={`/nouveau?id=${encodeURIComponent(projet)}&recharge=1`}>＋ Acheter des pièces</a>}</p>}
      <div className="actions">
        <button className="btn" disabled={texte.trim().length < 5 || etat === "envoi" || !assez} onClick={envoyer}>{etat === "envoi" ? "Envoi…" : `Envoyer la demande (−${COUT_MODIF_SERVER} 🪙)`}</button>
      </div>
    </div>
  );
}
