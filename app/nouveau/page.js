"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TYPES, FONCTIONNALITES, PLATEFORMES, STYLES, BUDGETS, DELAIS, PRIORITES, ETAPES_SUIVI,
  trouver, fonctionnalite,
} from "../../lib/catalogue.js";
import { chargerProjet, enregistrerProjet, nouveauProjet } from "../../lib/stockage.js";
import { solde, debiter, crediter, PACKS, COUT_MODIFICATION, COUT_COMMANDE, prixTexte } from "../../lib/pieces.js";
import { lireFichiers, enregistrerFichiers, ajouterFichiers, tailleLisible, LIMITES } from "../../lib/fichiers.js";
import Avatar from "../components/Avatar.js";
import { OPTIONS_AVATAR, PRESETS_AVATAR, AVATAR_DEFAUT, PERSONNAGES, trouverPersonnage } from "../../lib/avatar.js";
import {
  UNIVERS, BADGES, trouverUnivers, trouverAvatar, niveau, nouveauJeu, recompenser, recit,
} from "../../lib/jeu.js";

const ETAPES = ["Idée", "Type", "Fonctionnalités", "Style", "Budget & délai", "Récapitulatif", "Maquette", "Commander", "Suivi"];

const EXEMPLES = [
  "Je veux une application pour que mes clients réservent leurs séances de coaching et paient en ligne.",
  "Je veux accompagner les personnes que je suis dans leurs démarches, avec des étapes et des documents à déposer.",
  "Je veux vendre mes créations artisanales en ligne et gérer mes commandes.",
  "Je veux un outil pour gérer le stock et les tâches de mon équipe.",
];

const ICONES_TYPES = { reservation: "📅", accompagnement: "🤝", boutique: "🛒", communaute: "👥", gestion: "📊", education: "🎓", sante: "💗", vitrine: "🌐", autre: "➕" };
const ICONES_PLATEFORMES = { web: "💻", mobile: "📱", les_deux: "🔁" };


async function appeler(url, corps) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  const donnees = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(donnees.erreur || "Kaizen n'a pas pu répondre. Réessayez.");
  return donnees;
}

export default function Page() {
  return (
    <Suspense fallback={<main className="conteneur page"><p className="discret">Chargement…</p></main>}>
      <Parcours />
    </Suspense>
  );
}

function Parcours() {
  const router = useRouter();
  const params = useSearchParams();
  const [projet, setProjet] = useState(null);
  const [chargement, setChargement] = useState("");
  const [erreur, setErreur] = useState("");
  const [gain, setGain] = useState(null);
  const [choixPerso, setChoixPerso] = useState(false);
  const [infoAchat, setInfoAchat] = useState("");

  useEffect(() => {
    const id = params.get("id");
    const existant = id ? chargerProjet(id) : null;
    if (existant) {
      // Anciens projets : le suivi était l'étape 7 avant l'ajout de « Commander ».
      if (!existant.schema && existant.etape === 7) existant.etape = 8;
      setProjet({ ...existant, schema: 2 });
      return;
    }
    const p = { ...nouveauProjet(), schema: 2 };
    const ideeProposee = params.get("idee");
    if (ideeProposee) p.idee = ideeProposee.slice(0, 2000);
    setProjet(p);
    router.replace(`/nouveau?id=${p.id}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gain) return undefined;
    const t = setTimeout(() => setGain(null), 3800);
    return () => clearTimeout(t);
  }, [gain]);

  // À chaque changement d'étape (de niveau), on remonte en haut pour voir le narrateur.
  const etapeCourante = projet?.etape;
  useEffect(() => {
    if (etapeCourante !== undefined) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [etapeCourante]);

  // Retour de Mollie après un achat de pièces : on crédite une seule fois.
  const achatRetour = params.get("achat");
  useEffect(() => {
    if (!projet || !achatRetour) return;
    (async () => {
      try {
        const r = await appeler("/api/pieces/verifier", { achat: achatRetour });
        if (r.statut === "paid" && r.pieces > 0) {
          setProjet((p) => enregistrerProjet({ ...p, pieces: crediter(p, r.pieces), journal: [...(p.journal || []), { date: new Date().toISOString(), texte: `Recharge de ${r.pieces} pièces` }] }));
          setInfoAchat(`🪙 +${r.pieces} pièces ajoutées. Merci !`);
        } else if (r.statut === "paid") {
          setInfoAchat("Ces pièces ont déjà été ajoutées.");
        } else if (["open", "pending", "authorized"].includes(r.statut)) {
          setInfoAchat("Paiement en cours de validation : rechargez la page dans un instant.");
        } else {
          setInfoAchat("Le paiement n'a pas abouti : aucune pièce n'a été débitée.");
        }
      } catch (e) {
        setErreur(e.message);
      } finally {
        router.replace(`/nouveau?id=${projet.id}`);
      }
    })();
  }, [projet?.id, achatRetour]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projet) return <main className="conteneur page"><p className="discret">Chargement…</p></main>;

  // Calcule les récompenses à partir de l'état actuel du jeu et déclenche l'animation.
  const gagner = (cles) => {
    const { jeu, gains } = recompenser(projet.jeu, cles);
    if (gains) setGain({ ...gains, cle: Date.now() });
    return jeu;
  };
  const maj = (champs, cles = []) => {
    const jeu = cles.length ? gagner(cles) : undefined;
    setProjet((p) => enregistrerProjet({ ...p, ...champs, ...(jeu ? { jeu } : {}) }));
  };
  const noter = (p, texte) => [...(p.journal || []), { date: new Date().toISOString(), texte }];
  const allerA = (etape, cles = []) => {
    setErreur("");
    maj({ etape }, cles);
  };

  async function lancer(message, action) {
    setErreur("");
    setChargement(message);
    try { await action(); } catch (e) { setErreur(e.message); } finally { setChargement(""); }
  }

  const analyser = () => lancer("Kaizen étudie votre idée…", async () => {
    const a = await appeler("/api/analyser", { idee: projet.idee });
    const jeu = gagner(["idee"]);
    setProjet((p) => enregistrerProjet({
      ...p,
      jeu,
      analyse: { ...a, ideeAnalysee: p.idee },
      typeId: a.typeId,
      plateforme: a.plateforme || p.plateforme,
      fonctionnalites: a.fonctionnalites,
      nom: p.nom || a.nomSuggere || "",
      publicCible: p.publicCible || a.publicCible || "",
      etape: 1,
      journal: noter(p, "Idée analysée par Kaizen"),
    }));
  });

  const preparerRecap = () => lancer("Kaizen rédige le récapitulatif de votre projet…", async () => {
    const { recap } = await appeler("/api/recapitulatif", { projet });
    const jeu = gagner(["budget", "recap", "scribe", ...(projet.precisions.trim() ? ["precisions"] : [])]);
    setProjet((p) => enregistrerProjet({
      ...p, jeu, recap, estimation: null, etape: 5,
      statut: p.statut === "idee" ? "cadrage" : p.statut,
      journal: noter(p, "Récapitulatif du projet préparé"),
    }));
  });

  // Demande de modification de la maquette par le client : coûte des pièces d'or.
  const modifierMaquette = (retour) => lancer("Kaizen redessine la maquette avec vos remarques… (jusqu'à une minute)", async () => {
    const pieces = debiter(projet, COUT_MODIFICATION);
    if (!pieces) throw new Error(`Il vous faut ${COUT_MODIFICATION} pièces pour demander une modification : rechargez vos pièces ci-dessous.`);
    const { html, source } = await appeler("/api/maquette", { projet, recap: projet.recap, retour });
    setProjet((p) => enregistrerProjet({
      ...p, pieces, maquetteValidee: false,
      maquette: { html, source, genereLe: new Date().toISOString() },
      retours: [...(p.retours || []), { texte: retour, date: new Date().toISOString() }].slice(-10),
      journal: noter(p, `Modification demandée (−${COUT_MODIFICATION} pièces) : ${retour.slice(0, 80)}`),
    }));
  });

  const validerMaquette = () => maj({ maquetteValidee: true, journal: noter(projet, "Maquette acceptée par le client"), etape: 7 });

  const genererMaquette = () => lancer("Kaizen dessine la maquette de votre application… (jusqu'à une minute)", async () => {
    const { html, source } = await appeler("/api/maquette", { projet, recap: projet.recap });
    const jeu = gagner(["maquette"]);
    setProjet((p) => enregistrerProjet({
      ...p, jeu, maquette: { html, source, genereLe: new Date().toISOString() }, etape: 6,
      statut: ["idee", "cadrage"].includes(p.statut) ? "maquette" : p.statut,
      journal: noter(p, p.maquette ? "Maquette régénérée" : "Maquette générée"),
    }));
  });

  // Écran de choix du personnage : au début d'un projet, ou sur demande.
  if (!projet.jeu || choixPerso) {
    return (
      <main className="conteneur page">
        <ChoixPersonnage
          initial={projet.jeu}
          valider={(choix) => {
            const jeu = choix
              ? { ...nouveauJeu(choix), ...(projet.jeu?.actif ? { points: projet.jeu.points, badges: projet.jeu.badges, recompenses: projet.jeu.recompenses } : {}) }
              : { actif: false };
            maj({ jeu, journal: noter(projet, choix ? `Aventure « ${trouverUnivers(jeu.univers).nom} » avec ${jeu.pseudo}` : "Mode classique choisi") });
            setChoixPerso(false);
          }}
          annuler={projet.jeu ? () => setChoixPerso(false) : null}
          contact={projet.contact || {}}
          majContact={(champ, valeur) => maj({ contact: { ...(projet.contact || {}), [champ]: valeur } })}
        />
      </main>
    );
  }

  const enJeu = projet.jeu.actif;
  const univers = enJeu ? trouverUnivers(projet.jeu.univers) : null;
  const etape = projet.etape || 0;
  const accessible = (i) =>
    i === 0 ? true :
    i <= 4 ? Boolean(projet.analyse) :
    i === 5 || i === 7 ? Boolean(projet.recap) :
    i === 6 ? Boolean(projet.maquette) :
    Boolean(projet.maquette || projet.commande);

  return (
    <main
      className={`conteneur page ${enJeu ? "en-jeu" : ""}`}
      style={enJeu ? { "--jeu": univers.couleur, "--jeu-clair": univers.clair } : undefined}
    >
      {enJeu
        ? <TableauJoueur jeu={projet.jeu} pieces={solde(projet)} changer={() => setChoixPerso(true)} />
        : <p className="mode-classique">Mode classique · <button onClick={() => setChoixPerso(true)}>Passer en mode jeu</button></p>}

      <ol className="progression">
        {ETAPES.map((nom, i) => (
          <li key={nom} className={i === etape ? "actif" : i < etape ? "fait" : ""}>
            <button disabled={!accessible(i) || Boolean(chargement)} onClick={() => allerA(i)} title={nom}>
              <span>{enJeu && i < etape ? "✓" : i + 1}</span>{enJeu ? univers.niveaux[i] : nom}
            </button>
          </li>
        ))}
      </ol>

      {enJeu && <Narrateur jeu={projet.jeu} etape={etape} />}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      {chargement && <div className="chargement"><span className="rond" /> {chargement}</div>}

      <div className={chargement ? "voile" : ""}>
        {etape === 0 && <EtapeIdee projet={projet} maj={maj} analyser={analyser} />}
        {etape === 1 && <EtapeType projet={projet} maj={maj} suivant={() => allerA(2, ["type"])} precedent={() => allerA(0)} />}
        {etape === 2 && <EtapeFonctionnalites projet={projet} maj={maj} suivant={() => allerA(3, ["fonctionnalites", ...(projet.personnalisees.length ? ["perso"] : [])])} precedent={() => allerA(1)} />}
        {etape === 3 && <EtapeStyle projet={projet} maj={maj} suivant={() => allerA(4, ["style"])} precedent={() => allerA(2)} />}
        {etape === 4 && <EtapeBudget projet={projet} maj={maj} suivant={preparerRecap} precedent={() => allerA(3)} />}
        {etape === 5 && <EtapeRecap projet={projet} modifier={() => allerA(1)} suivant={projet.maquette ? () => allerA(6) : genererMaquette} actualiser={preparerRecap} commander={() => allerA(7)} />}
        {etape === 6 && <EtapeMaquette projet={projet} modifier={modifierMaquette} valider={validerMaquette} infoAchat={infoAchat} precedent={() => allerA(5)} suivant={() => allerA(7)} />}
        {etape === 7 && <EtapeCommande projet={projet} infoAchat={infoAchat} maj={maj} noter={noter} precedent={() => allerA(projet.maquette ? 6 : 5)} suivant={() => allerA(8)} />}
        {etape === 8 && <EtapeSuivi projet={projet} maj={maj} noter={noter} actualiser={preparerRecap} />}
      </div>

      {gain && enJeu && <Recompense key={gain.cle} gain={gain} univers={univers} />}
    </main>
  );
}

// ---------------- Jeu ----------------

function ChoixPersonnage({ initial, valider, annuler, contact = {}, majContact }) {
  const debut = initial?.actif ? initial : null;
  const [univers, setUnivers] = useState(debut?.univers || UNIVERS[0].id);
  const [avatar, setAvatar] = useState(typeof debut?.avatar === "object" ? debut.avatar : { forme: "illustre", perso: "kai" });
  const [pseudo, setPseudo] = useState(debut?.pseudo || (debut ? "" : "Kai"));
  const u = trouverUnivers(univers);
  const changer = (champ, valeur) => setAvatar((a) => ({ ...a, [champ]: valeur }));
  const humain = avatar.forme !== "robot";
  const illustre = avatar.forme === "illustre";

  const couleurs = (champ, liste, nom) => (
    <div className="pastilles" role="radiogroup" aria-label={nom}>
      {liste.map((c) => (
        <button key={c} role="radio" aria-checked={avatar[champ] === c} aria-label={`${nom} ${c}`} className={`pastille-couleur ${avatar[champ] === c ? "choisie" : ""}`} style={{ background: c }} onClick={() => changer(champ, c)} />
      ))}
    </div>
  );
  const options = (champ, liste) => (
    <div className="puces">
      {liste.map((o) => <button key={o.id} className={`puce ${avatar[champ] === o.id ? "choisie" : ""}`} onClick={() => changer(champ, o.id)}>{o.label}</button>)}
    </div>
  );

  return (
    <section className="carte etape choix-perso" style={{ "--jeu": u.couleur, "--jeu-clair": u.clair }}>
      <p className="surtitre">Étape 0 · Qui êtes-vous ?</p>
      <h1 className="h-page">Créez votre avatar</h1>
      <p className="discret">Chaque étape de votre projet deviendra un niveau. Gagnez des {u.monnaie} et des badges jusqu'à la mise en ligne de votre application !</p>

      <div className="perso-grille vestiaire">
        {/* Vitrine : le personnage choisi en grand, façon vestiaire */}
        <div
          className="vitrine"
          style={{ "--p": illustre ? trouverPersonnage(avatar.perso).couleur : "var(--jeu)" }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height) - 0.5) * -10}deg`);
            e.currentTarget.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) - 0.5) * 14}deg`);
          }}
          onPointerLeave={(e) => { e.currentTarget.style.setProperty("--rx", "0deg"); e.currentTarget.style.setProperty("--ry", "0deg"); }}
        >
          <div className="vitrine-fond" aria-hidden="true" />
          <div className="vitrine-banniere">
            <strong>{(pseudo.trim() || (illustre ? trouverPersonnage(avatar.perso).nom : "Votre nom")).toUpperCase()}</strong>
            <small>{u.icone} {u.nom} · Niveau 1</small>
          </div>
          <div className="vitrine-particules" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--i": i }} />)}</div>
          <div key={illustre ? avatar.perso : "perso"} className="vitrine-perso">
            <div className="vitrine-vivant">
              {illustre
                ? (trouverPersonnage(avatar.perso).video
                  // Animation vidéo du personnage (boucle silencieuse), si elle existe
                  ? <video src={trouverPersonnage(avatar.perso).video} poster={trouverPersonnage(avatar.perso).pied || trouverPersonnage(avatar.perso).buste} autoPlay muted loop playsInline aria-label={`Personnage ${trouverPersonnage(avatar.perso).nom}`} />
                  : <img className={trouverPersonnage(avatar.perso).pied ? "detoure" : ""} src={trouverPersonnage(avatar.perso).pied || trouverPersonnage(avatar.perso).buste} alt={`Personnage ${trouverPersonnage(avatar.perso).nom}`} />)
                : <Avatar config={avatar} taille={240} titre="Aperçu de votre avatar" />}
            </div>
          </div>
          <div className="vitrine-sol" aria-hidden="true" />
          <p className="vitrine-lieu">Premier lieu : {u.niveaux[0]}</p>
        </div>

        <div className="vestiaire-choix">
          <label className="champ" style={{ marginTop: 0 }}>
            <span>Votre nom de joueur</span>
            <input value={pseudo} maxLength={30} placeholder="Ex. : Kai, Mia, Capitaine Zoé…" onChange={(e) => setPseudo(e.target.value)} />
          </label>

          <div className="formulaire-deux">
            <label className="champ"><span>Prénom / Nom <small className="discret">(facultatif)</small></span><input autoComplete="name" value={contact.nom || ""} maxLength={100} placeholder="Votre nom complet" onChange={(e) => majContact("nom", e.target.value)} /></label>
            <label className="champ"><span>E-mail <small className="discret">(facultatif)</small></span><input type="email" autoComplete="email" value={contact.email || ""} maxLength={160} placeholder="votre@email.com" onChange={(e) => majContact("email", e.target.value)} /></label>
          </div>
          <p className="note">🔒 Vos coordonnées restent sur votre appareil et servent seulement si vous commandez.</p>

          <p className="petit-titre">Choisissez votre personnage</p>
          <div className="personnages" role="radiogroup" aria-label="Personnage">
            {PERSONNAGES.map((pe) => (
              <button
                key={pe.id}
                role="radio"
                aria-checked={illustre && avatar.perso === pe.id}
                className={`carte-perso ${illustre && avatar.perso === pe.id ? "choisie" : ""}`}
                style={{ "--p": pe.couleur }}
                onClick={() => { setAvatar({ forme: "illustre", perso: pe.id }); if (!pseudo.trim() || PERSONNAGES.some((x) => x.nom === pseudo)) setPseudo(pe.nom); }}
              >
                <img src={pe.buste} alt="" loading="lazy" />
                <span className="etiquette">{pe.nom}</span>
              </button>
            ))}
            <button
              role="radio"
              aria-checked={!illustre}
              className={`carte-perso creer ${!illustre ? "choisie" : ""}`}
              style={{ "--p": "#2ad4ff" }}
              onClick={() => { if (illustre) setAvatar({ ...AVATAR_DEFAUT }); }}
            >
              <span className="plus" aria-hidden="true">✏️</span>
              <strong>Créer le mien</strong>
              <small className="discret">Peau, coiffure, couleurs…</small>
            </button>
          </div>

          {!illustre && (
            <>
              <p className="petit-titre">Modèles de départ</p>
              <div className="presets">
                {PRESETS_AVATAR.map((pr) => (
                  <button key={pr.nom} className="preset" onClick={() => setAvatar({ ...pr.config })}>
                    <Avatar config={pr.config} taille={56} titre={pr.nom} />{pr.nom}
                  </button>
                ))}
              </div>

              <p className="petit-titre">Personnaliser</p>
              <div className="reglage"><span>Forme</span>{options("forme", OPTIONS_AVATAR.forme)}</div>
              {humain && <div className="reglage"><span>Peau</span>{couleurs("peau", OPTIONS_AVATAR.peau, "Couleur de peau")}</div>}
              {humain && <div className="reglage"><span>Coiffure</span>{options("coiffure", OPTIONS_AVATAR.coiffure)}</div>}
              {humain && <div className="reglage"><span>Cheveux</span>{couleurs("cheveux", OPTIONS_AVATAR.cheveux, "Couleur des cheveux")}</div>}
              <div className="reglage"><span>{humain ? "Yeux" : "Lumières"}</span>{couleurs("yeux", OPTIONS_AVATAR.yeux, "Couleur des yeux")}</div>
              <div className="reglage"><span>Tenue</span>{couleurs("tenue", OPTIONS_AVATAR.tenue, "Couleur de la tenue")}</div>
              {humain && <div className="reglage"><span>Accessoire</span>{options("accessoire", OPTIONS_AVATAR.accessoire)}</div>}
            </>
          )}
        </div>
      </div>

      <p className="petit-titre">Votre univers de jeu</p>
      <div className="choix-grille univers-grille">
        {UNIVERS.map((x) => (
          <button key={x.id} className={`choix univers ${univers === x.id ? "choisi" : ""}`} style={{ "--u": x.couleur }} onClick={() => setUnivers(x.id)}>
            <span className="univers-icone" aria-hidden="true">{x.icone}</span>
            <strong>{x.nom}</strong>
            <span>{x.accroche}</span>
          </button>
        ))}
      </div>

      <div className="navigation">
        <div className="actions">
          {annuler && <button className="btn secondaire" onClick={annuler}>Annuler</button>}
          <button className="btn secondaire" onClick={() => valider(null)}>Mode classique, sans jeu</button>
        </div>
        <button className="btn grand" onClick={() => valider({ univers, avatar, pseudo })}>Commencer l'aventure →</button>
      </div>
    </section>
  );
}

// Affiche l'avatar du joueur : illustré (nouveau) ou emoji (anciens projets).
function AvatarJoueur({ jeu, taille, classe }) {
  if (jeu?.avatar && typeof jeu.avatar === "object") return <Avatar config={jeu.avatar} taille={taille} titre={jeu.pseudo} />;
  return <span className={classe} aria-hidden="true">{trouverAvatar(jeu?.avatar).emoji}</span>;
}

function TableauJoueur({ jeu, changer, pieces }) {
  const u = trouverUnivers(jeu.univers);
  const n = niveau(jeu.points);
  return (
    <div className="joueur">
      <AvatarJoueur jeu={jeu} taille={72} classe="avatar-grand" />
      <div className="joueur-infos">
        <div className="joueur-ligne">
          <strong>{jeu.pseudo}</strong>
          <span className="badge-niveau">Niveau {n.numero}</span>
          <span className="discret">{u.icone} {u.nom}</span>
        </div>
        <div className="barre-xp" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(n.progression * 100)} aria-label="Progression vers le niveau suivant">
          <i style={{ width: `${Math.max(4, n.progression * 100)}%` }} />
        </div>
        <small className="discret">🪙 {pieces} {u.monnaie} disponibles · encore {n.restant} points pour le niveau {n.numero + 1}</small>
      </div>
      <div className="badges" aria-label="Badges">
        {Object.entries(BADGES).map(([id, b]) => (
          <span key={id} className={`badge-jeu ${jeu.badges.includes(id) ? "obtenu" : ""}`} title={`${b.nom} — ${b.detail}${jeu.badges.includes(id) ? "" : " (à débloquer)"}`}>{b.icone}</span>
        ))}
      </div>
      <button className="btn petit secondaire" onClick={changer}>Changer</button>
    </div>
  );
}

function Narrateur({ jeu, etape }) {
  return (
    <div className="narrateur">
      <AvatarJoueur jeu={jeu} taille={52} classe="avatar-moyen" />
      <p className="bulle">{recit(jeu, etape)}</p>
    </div>
  );
}

function Recompense({ gain, univers }) {
  return (
    <div className="recompense" role="status" aria-live="polite">
      {gain.points > 0 && <strong>+{gain.points} {univers.monnaie}</strong>}
      {gain.badges.map((id) => (
        <span key={id} className="recompense-badge">{BADGES[id].icone} Badge « {BADGES[id].nom} » débloqué !</span>
      ))}
      {gain.niveauAtteint && <span className="recompense-niveau">🎉 Niveau {gain.niveauAtteint} atteint !</span>}
    </div>
  );
}

// ---------------- Étapes ----------------

function Navigation({ precedent, suivant, libelle = "Continuer", desactive }) {
  return (
    <div className="navigation">
      {precedent ? <button className="btn secondaire" onClick={precedent}>Retour</button> : <span />}
      {suivant && <button className="btn" disabled={desactive} onClick={suivant}>{libelle}</button>}
    </div>
  );
}

function EtapeIdee({ projet, maj, analyser }) {
  const assez = projet.idee.trim().length >= 10;
  const dejaAnalysee = projet.analyse?.ideeAnalysee === projet.idee;
  return (
    <section className="carte etape">
      <h1 className="h-page">Parlez-nous de votre projet</h1>
      <p className="discret">Décrivez votre idée en quelques mots, comme si vous l'expliquiez à un ami.</p>
      <label className="champ">
        <span>Titre de votre projet <small className="discret">(facultatif)</small></span>
        <input value={projet.nom} maxLength={80} placeholder="Ex. : Mon super projet" onChange={(e) => maj({ nom: e.target.value })} />
      </label>
      <label className="champ">
        <span>Décrivez votre idée *</span>
        <textarea
          rows={6}
          value={projet.idee}
          maxLength={2000}
          placeholder="Vos objectifs, ce que l'application doit permettre, vos utilisateurs… Exemple : je veux que mes clients réservent en ligne et reçoivent un rappel."
          onChange={(e) => maj({ idee: e.target.value })}
        />
        <small className={`compteur ${projet.idee.length > 1800 ? "presque" : ""}`}>{projet.idee.length}/2000</small>
      </label>
      <label className="champ">
        <span>À qui s'adresse votre application ?</span>
        <input value={projet.publicCible} maxLength={300} placeholder="Ex. : étudiants, professionnels, particuliers…" onChange={(e) => maj({ publicCible: e.target.value })} />
      </label>
      <p className="petit-titre">Besoin d'inspiration ?</p>
      <div className="puces">
        {EXEMPLES.map((ex) => <button key={ex} className="puce" onClick={() => maj({ idee: ex })}>{ex}</button>)}
      </div>
      <div className="navigation">
        <span />
        <div className="actions">
          {dejaAnalysee && <button className="btn secondaire" onClick={() => maj({ etape: 1 })}>Continuer sans réanalyser</button>}
          <button className="btn" disabled={!assez} onClick={analyser}>{dejaAnalysee ? "Réanalyser" : "Analyser mon idée →"}</button>
        </div>
      </div>
    </section>
  );
}

function PiecesJointes({ projetId }) {
  const [fichiers, setFichiers] = useState([]);
  const [refus, setRefus] = useState([]);
  const [survol, setSurvol] = useState(false);
  useEffect(() => { lireFichiers(projetId).then(setFichiers); }, [projetId]);
  async function ajouter(liste) {
    const { fichiers: suivants, refus: r } = await ajouterFichiers(fichiers, [...liste]);
    setRefus(r);
    setFichiers(suivants);
    await enregistrerFichiers(projetId, suivants).catch(() => setRefus((x) => [...x, "Impossible d'enregistrer les fichiers sur cet appareil."]));
  }
  async function retirer(i) {
    const suivants = fichiers.filter((_, j) => j !== i);
    setFichiers(suivants);
    await enregistrerFichiers(projetId, suivants).catch(() => {});
  }
  return (
    <div className="champ">
      <span>Avez-vous des références ou des inspirations ?</span>
      <label
        className={`depot ${survol ? "survol" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files); }}
      >
        <input type="file" multiple accept={LIMITES.types.join(",")} onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} />
        <span aria-hidden="true">⬆️</span>
        <strong>Ajouter des images, documents…</strong>
        <small className="discret">Facultatif · images ou PDF · {LIMITES.nombre} fichiers, 2,5 Mo au total · joints à votre commande</small>
      </label>
      {fichiers.length > 0 && (
        <ul className="perso">
          {fichiers.map((f, i) => (
            <li key={`${f.nom}-${i}`}>{f.type === "application/pdf" ? "📄" : "🖼️"} {f.nom} <small className="discret">({tailleLisible(f.taille)})</small> <button aria-label={`Retirer ${f.nom}`} onClick={() => retirer(i)}>×</button></li>
          ))}
        </ul>
      )}
      {refus.map((r) => <p key={r} className="alerte">{r}</p>)}
    </div>
  );
}

function EtapeType({ projet, maj, suivant, precedent }) {
  const a = projet.analyse || {};
  return (
    <section className="carte etape">
      <h1 className="h-page">Quel type d'application ?</h1>
      {a.reformulation && <p className="reformulation">{a.reformulation}</p>}
      <p className="discret">Kaizen a présélectionné le type le plus proche de votre idée. Vous pouvez le changer.</p>
      <div className="choix-grille">
        {TYPES.map((t) => (
          <button key={t.id} className={`choix ${projet.typeId === t.id ? "choisi" : ""}`} onClick={() => maj({ typeId: t.id })}>
            <span className="icone-choix" aria-hidden="true">{ICONES_TYPES[t.id]}</span>
            <strong>{t.label}</strong><span>{t.description}</span>
          </button>
        ))}
      </div>
      <p className="petit-titre">Sur quel support ?</p>
      <div className="choix-grille trois">
        {PLATEFORMES.map((p) => (
          <button key={p.id} className={`choix ${projet.plateforme === p.id ? "choisi" : ""}`} onClick={() => maj({ plateforme: p.id })}>
            <span className="icone-choix" aria-hidden="true">{ICONES_PLATEFORMES[p.id]}</span>
            <strong>{p.label}</strong><span>{p.detail}</span>
          </button>
        ))}
      </div>
      {projet.plateforme !== "web" && (
        <p className="astuce">Astuce : une application web fonctionne aussi sur téléphone et coûte moins cher. On peut commencer par le web et passer au mobile ensuite.</p>
      )}
      <Navigation precedent={precedent} suivant={suivant} desactive={!projet.typeId} />
    </section>
  );
}

function EtapeFonctionnalites({ projet, maj, suivant, precedent }) {
  const [ajout, setAjout] = useState("");
  const suggerees = new Set(projet.analyse?.fonctionnalites || []);
  const basculer = (id) => maj({
    fonctionnalites: projet.fonctionnalites.includes(id)
      ? projet.fonctionnalites.filter((f) => f !== id)
      : [...projet.fonctionnalites, id],
  });
  const ajouterPerso = (texte) => {
    const t = texte.trim();
    if (!t || projet.personnalisees.includes(t)) return;
    maj({ personnalisees: [...projet.personnalisees, t].slice(0, 10) });
    setAjout("");
  };
  const ordonnees = [...FONCTIONNALITES].sort((x, y) => Number(suggerees.has(y.id)) - Number(suggerees.has(x.id)));
  const autresSuggestions = (projet.analyse?.suggestionsPersonnalisees || []).filter((s) => !projet.personnalisees.includes(s));

  return (
    <section className="carte etape">
      <h1 className="h-page">Que doit faire votre application ?</h1>
      <p className="discret">Les fonctionnalités marquées « Conseillé » correspondent à votre idée. Moins il y en a au départ, plus vite vous serez en ligne.</p>
      <div className="cases">
        {ordonnees.map((f) => (
          <label key={f.id} className={`case ${projet.fonctionnalites.includes(f.id) ? "cochee" : ""}`}>
            <input type="checkbox" checked={projet.fonctionnalites.includes(f.id)} onChange={() => basculer(f.id)} />
            <span>{f.label}</span>
            {suggerees.has(f.id) && <em className="badge">Conseillé</em>}
            <small className="niveau">{["", "Simple", "Moyen", "Avancé"][f.complexite]}</small>
          </label>
        ))}
      </div>

      <p className="petit-titre">Une fonctionnalité propre à votre projet ?</p>
      {autresSuggestions.length > 0 && (
        <div className="puces">
          {autresSuggestions.map((sug) => <button key={sug} className="puce" onClick={() => ajouterPerso(sug)}>+ {sug}</button>)}
        </div>
      )}
      <div className="ligne-ajout">
        <input value={ajout} maxLength={120} placeholder="Ex. : envoyer un bilan PDF à la fin de l'accompagnement" onChange={(e) => setAjout(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ajouterPerso(ajout)} />
        <button className="btn secondaire" onClick={() => ajouterPerso(ajout)}>Ajouter</button>
      </div>
      {projet.personnalisees.length > 0 && (
        <ul className="perso">
          {projet.personnalisees.map((t) => (
            <li key={t}>{t} <button aria-label={`Retirer ${t}`} onClick={() => maj({ personnalisees: projet.personnalisees.filter((x) => x !== t) })}>×</button></li>
          ))}
        </ul>
      )}



      <Navigation precedent={precedent} suivant={suivant} desactive={projet.fonctionnalites.length + projet.personnalisees.length === 0} />
    </section>
  );
}

function EtapeStyle({ projet, maj, suivant, precedent }) {
  const style = trouver(STYLES, projet.style) || STYLES[0];
  return (
    <section className="carte etape">
      <h1 className="h-page">Le style de votre application</h1>
      <label className="champ">
        <span>Nom de l'application</span>
        <input value={projet.nom} maxLength={80} placeholder="Ex. : RésaFacile" onChange={(e) => maj({ nom: e.target.value })} />
      </label>
      <p className="petit-titre">Ambiance</p>
      <div className="choix-grille">
        {STYLES.map((s) => (
          <button key={s.id} className={`choix ${projet.style === s.id ? "choisi" : ""}`} onClick={() => maj({ style: s.id, couleur: "" })}>
            <span className="echantillon" style={{ background: s.fond, borderColor: s.couleur }}>
              <i style={{ background: s.couleur }} /><b style={{ fontFamily: s.police, color: s.couleur }}>Aa</b>
            </span>
            <strong>{s.label}</strong>
          </button>
        ))}
      </div>
      <label className="champ couleur">
        <span>Couleur principale (facultatif)</span>
        <input type="color" value={projet.couleur || style.couleur} onChange={(e) => maj({ couleur: e.target.value })} />
      </label>
      <Navigation precedent={precedent} suivant={suivant} />
    </section>
  );
}

function EtapeBudget({ projet, maj, suivant, precedent }) {
  const questions = projet.analyse?.questions || [];
  return (
    <section className="carte etape">
      <h1 className="h-page">Budget et délai</h1>
      <p className="discret">Il n'y a pas de mauvaise réponse : Server, le maître du jeu, adaptera son offre à vos moyens.</p>
      <p className="petit-titre">Budget envisagé</p>
      <div className="puces">
        {BUDGETS.map((b) => <button key={b.id} className={`puce ${projet.budget === b.id ? "choisie" : ""}`} onClick={() => maj({ budget: b.id })}>{b.label}</button>)}
      </div>
      <p className="petit-titre">Mise en ligne souhaitée</p>
      <div className="puces">
        {DELAIS.map((d) => <button key={d.id} className={`puce ${projet.delai === d.id ? "choisie" : ""}`} onClick={() => maj({ delai: d.id })}>{d.label}</button>)}
      </div>
      <p className="petit-titre">Priorité du projet</p>
      <div className="choix-grille">
        {PRIORITES.map((pr) => (
          <button key={pr.id} className={`choix ${projet.priorite === pr.id ? "choisi" : ""}`} onClick={() => maj({ priorite: pr.id })}>
            <strong>{pr.icone} {pr.label}</strong><span>{pr.detail}</span>
          </button>
        ))}
      </div>
      <label className="champ">
        <span>Liens d'inspiration (facultatif)</span>
        <input value={projet.inspirations || ""} maxLength={600} placeholder="Ex. : une application que vous aimez, un site concurrent, un lien…" onChange={(e) => maj({ inspirations: e.target.value })} />
      </label>
      <PiecesJointes projetId={projet.id} />
      <label className="champ">
        <span>Précisions (facultatif)</span>
        {questions.length > 0 && (
          <ul className="questions">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
        )}
        <textarea rows={4} maxLength={1500} value={projet.precisions} placeholder="Répondez librement aux questions ci-dessus, ou ajoutez ce qui vous semble important." onChange={(e) => maj({ precisions: e.target.value })} />
      </label>
      <Navigation precedent={precedent} suivant={suivant} libelle="Préparer le récapitulatif" desactive={!projet.budget || !projet.delai} />
    </section>
  );
}

function Liste({ titre, items }) {
  if (!items?.length) return null;
  return (
    <div className="bloc">
      <h3>{titre}</h3>
      <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

// Tarifs, délais et conseils ne sont jamais calculés pour le client :
// c'est Server, le maître du jeu, qui les donne après la commande.
function MotDuMaitre({ children }) {
  return (
    <div className="maitre">
      <img src="/personnages/server.webp" alt="" width="56" height="56" />
      <div>
        <strong>Server · Maître du jeu</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function EtapeRecap({ projet, modifier, suivant, actualiser, commander }) {
  const r = projet.recap;
  if (!r) return null;
  return (
    <section className="carte etape recap">
      <div className="titre-ligne">
        <h1 className="h-page">{r.titre || projet.nom || "Votre projet"}</h1>
        <button className="btn petit secondaire" onClick={() => window.print()}>Imprimer / PDF</button>
      </div>
      <div className="recap-resume">
        <div><span aria-hidden="true">{ICONES_TYPES[projet.typeId] || "📱"}</span><p><small>Type</small><b>{trouver(TYPES, projet.typeId)?.label || "À définir"}</b></p></div>
        <div><span aria-hidden="true">🧩</span><p><small>Fonctionnalités</small><b>{projet.fonctionnalites.length + projet.personnalisees.length} sélectionnée{projet.fonctionnalites.length + projet.personnalisees.length > 1 ? "s" : ""}</b></p></div>
        <div><span aria-hidden="true">💶</span><p><small>Budget</small><b>{trouver(BUDGETS, projet.budget)?.label || "—"}</b></p></div>
        <div><span aria-hidden="true">⏱️</span><p><small>Délai</small><b>{trouver(DELAIS, projet.delai)?.label || "—"}</b></p></div>
        <div><span aria-hidden="true">{trouver(PRIORITES, projet.priorite)?.icone || "🔵"}</span><p><small>Priorité</small><b>{trouver(PRIORITES, projet.priorite)?.label || "Moyenne"}</b></p></div>
      </div>
      <p className="resume">{r.resume}</p>
      {r.probleme && <div className="bloc"><h3>Le problème résolu</h3><p>{r.probleme}</p></div>}
      {r.utilisateurs?.length > 0 && (
        <div className="bloc">
          <h3>Utilisateurs</h3>
          <ul>{r.utilisateurs.map((u, i) => <li key={i}><strong>{u.role}</strong> : {u.besoin}</li>)}</ul>
        </div>
      )}
      <Liste titre="Parcours de l'utilisateur" items={r.parcours} />
      <div className="deux-colonnes">
        <Liste titre="Première version" items={r.v1} />
        <Liste titre="Plus tard" items={r.plusTard} />
      </div>
      {r.ecrans?.length > 0 && (
        <div className="bloc">
          <h3>Écrans</h3>
          <div className="ecrans">{r.ecrans.map((e, i) => <div key={i} className="ecran"><strong>{e.nom}</strong><span>{e.contenu}</span></div>)}</div>
        </div>
      )}
      <Liste titre="Informations enregistrées" items={r.donnees} />
      <Liste titre="Points d'attention" items={r.risques} />
      <MotDuMaitre>Le tarif, le délai et mes conseils pour votre projet, c'est moi qui vous les donne : commandez, j'étudie votre dossier et je vous envoie mon offre dans votre espace.</MotDuMaitre>
      <Liste titre="Prochaines étapes" items={r.prochainesEtapes} />
      {r.source === "regles" && <p className="note">Récapitulatif préparé par le moteur de règles de Kaizen (IA non configurée).</p>}

      <EnvoiDemande projet={projet} commander={commander} />

      <div className="navigation sans-impression">
        <div className="actions">
          <button className="btn secondaire" onClick={modifier}>Modifier mes réponses</button>
          <button className="btn secondaire" onClick={actualiser}>Régénérer</button>
        </div>
        <button className="btn" onClick={suivant}>{projet.maquette ? "Voir la maquette" : "Valider et créer la maquette"}</button>
      </div>
    </section>
  );
}

// Envoi de la demande : par e-mail si une adresse est configurée
// (NEXT_PUBLIC_KAIZEN_EMAIL), sinon copie ou PDF du dossier.
function texteDossier(projet) {
  const r = projet.recap || {};
  const lignes = [
    `Projet : ${r.titre || projet.nom || "Sans nom"}`,
    `Type : ${trouver(TYPES, projet.typeId)?.label || "—"} · ${trouver(PLATEFORMES, projet.plateforme)?.label || ""}`,
    `Budget : ${trouver(BUDGETS, projet.budget)?.label || "—"} · Délai : ${trouver(DELAIS, projet.delai)?.label || "—"} · Priorité : ${trouver(PRIORITES, projet.priorite)?.label || "—"}`,
    "",
    `Idée : ${projet.idee}`,
    "",
    `Résumé : ${r.resume || ""}`,
    "",
    "Première version :", ...(r.v1 || []).map((x) => `- ${x}`),
    "", "Plus tard :", ...(r.plusTard || []).map((x) => `- ${x}`),
  ];
  if (projet.inspirations) lignes.push("", `Inspirations : ${projet.inspirations}`);
  if (projet.precisions) lignes.push("", `Précisions : ${projet.precisions}`);
  return lignes.join("\n");
}

function EnvoiDemande({ projet, commander }) {
  const [message, setMessage] = useState("");
  async function copier() {
    try {
      await navigator.clipboard.writeText(texteDossier(projet));
      setMessage("Dossier copié : vous pouvez le coller dans un e-mail ou un message.");
    } catch {
      setMessage("La copie n'est pas disponible sur cet appareil : utilisez « Télécharger en PDF ».");
    }
  }
  return (
    <div className="envoi sans-impression">
      <h3>🚀 Parfait ! Votre projet est prêt</h3>
      <p className="discret">{projet.commande ? `Commande n° ${projet.commande.numero} envoyée le ${new Date(projet.commande.date).toLocaleDateString("fr-FR")}.` : "Commandez votre application : Server, le maître du jeu, étudie votre projet et vous envoie son offre et ses conseils."}</p>
      <div className="actions">
        {!projet.commande && commander && <button className="btn grand" onClick={commander}>Commander mon application 🛒</button>}
        <button className="btn secondaire" onClick={copier}>Copier mon dossier</button>
        <button className="btn secondaire" onClick={() => window.print()}>Télécharger en PDF</button>
      </div>
      {message && <p className="succes" role="status">{message}</p>}
    </div>
  );
}

function EtapeCommande({ projet, maj, noter, precedent, suivant, infoAchat }) {
  const contact = projet.contact || {};
  const [formule, setFormule] = useState(projet.commande?.formule || "v1");
  const [consentement, setConsentement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [nonConfigure, setNonConfigure] = useState(false);
  const [piege, setPiege] = useState("");
  const setContact = (champ, valeur) => maj({ contact: { ...contact, [champ]: valeur } });

  const formules = [
    { id: "v1", label: "Première version", detail: "L'essentiel d'abord, pour lancer vite", conseil: true },
    { id: "complet", label: "Projet complet", detail: "Toutes les fonctionnalités choisies" },
    { id: "nocode", label: "Solution no-code", detail: "Avec des outils existants" },
    { id: "conseil", label: "Je laisse Server me conseiller", detail: "Le maître du jeu choisit avec vous" },
  ];

  const [pieces, setPieces] = useState([]);
  useEffect(() => { lireFichiers(projet.id).then(setPieces); }, [projet.id]);

  const dispo = solde(projet);
  const monnaie = projet.jeu?.actif ? trouverUnivers(projet.jeu.univers).monnaie : "pièces d'or";
  const assezPieces = dispo >= COUT_COMMANDE;

  async function commander() {
    if (!assezPieces) { setErreur(`Il vous faut ${COUT_COMMANDE} ${monnaie} pour envoyer la commande.`); return; }
    setErreur(""); setNonConfigure(false); setEnvoi(true);
    try {
      const r = await fetch("/api/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projet: { ...projet, retours: (projet.retours || []).map((r) => r.texte) }, recap: projet.recap, contact, formule, consentement, siteWeb: piege, pieces: pieces.map(({ nom, type, contenu }) => ({ nom, type, contenu })), maquette: projet.maquette ? { html: projet.maquette.html, source: projet.maquette.source } : null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setNonConfigure(Boolean(d.nonConfigure)); throw new Error(d.erreur || "L'envoi a échoué. Réessayez."); }
      maj({
        pieces: debiter(projet, COUT_COMMANDE) || projet.pieces,
        commande: { numero: d.numero, date: d.date || new Date().toISOString(), formule, confirmationEnvoyee: d.confirmationEnvoyee, espaceClient: Boolean(d.espaceClient) },
        statut: ["idee", "cadrage", "maquette"].includes(projet.statut) ? "maquette" : projet.statut,
        journal: noter(projet, `Commande envoyée (n° ${d.numero}, −${COUT_COMMANDE} pièces)`),
      }, ["commande"]);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  if (projet.commande) {
    return (
      <section className="carte etape commande-ok">
        <div className="confettis" aria-hidden="true">🎉</div>
        <h1 className="h-page">Commande envoyée !</h1>
        <p className="resume">Merci {contact.nom || ""} : la commande de <b>{projet.recap?.titre || projet.nom || "votre application"}</b> est bien partie.</p>
        <div className="recap-resume">
          <div><span aria-hidden="true">🧾</span><p><small>Numéro</small><b>{projet.commande.numero}</b></p></div>
          <div><span aria-hidden="true">📅</span><p><small>Date</small><b>{new Date(projet.commande.date).toLocaleDateString("fr-FR")}</b></p></div>
          <div><span aria-hidden="true">📦</span><p><small>Formule</small><b>{formules.find((f) => f.id === projet.commande.formule)?.label}</b></p></div>
        </div>
        <p className="discret">
          {projet.commande.confirmationEnvoyee !== false ? `Un e-mail de confirmation a été envoyé à ${contact.email}. ` : ""}
          Server, le maître du jeu, étudie votre projet et vous enverra son offre — tarif, délai — et ses conseils.
        </p>
        {projet.commande.espaceClient && (
          <p className="succes">👤 Suivez votre commande, recevez votre devis et échangez avec l'équipe dans votre espace client : connectez-vous avec {contact.email}. <a className="lien-cyan" href="/connexion">Accéder à mon espace</a></p>
        )}
        <div className="navigation">
          <button className="btn secondaire" onClick={() => window.print()}>Télécharger mon dossier</button>
          <button className="btn" onClick={suivant}>Suivre mon projet →</button>
        </div>
      </section>
    );
  }

  const valide = (contact.nom || "").trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email || "") && consentement;

  return (
    <section className="carte etape">
      <p className="surtitre">Dernière ligne droite</p>
      <h1 className="h-page">Commander mon application</h1>
      <p className="discret">Choisissez une formule et laissez vos coordonnées. Ce n'est pas un paiement : Server, le maître du jeu, étudie votre projet et vous envoie son offre (tarif, délai) et ses conseils.</p>

      <p className="petit-titre">1. Votre formule</p>
      <div className="choix-grille">
        {formules.map((f) => (
          <button key={f.id} className={`choix ${formule === f.id ? "choisi" : ""}`} onClick={() => setFormule(f.id)}>
            <strong>{f.label} {f.conseil && <em className="badge">Conseillé</em>}</strong>
            <span>{f.detail}</span>
          </button>
        ))}
      </div>

      <p className="petit-titre">2. Vos coordonnées</p>
      <div className="formulaire-deux">
        <label className="champ"><span>Prénom et nom *</span><input autoComplete="name" value={contact.nom || ""} maxLength={100} onChange={(ev) => setContact("nom", ev.target.value)} placeholder="Votre nom complet" /></label>
        <label className="champ"><span>E-mail *</span><input type="email" autoComplete="email" value={contact.email || ""} maxLength={160} onChange={(ev) => setContact("email", ev.target.value)} placeholder="vous@exemple.fr" /></label>
        <label className="champ"><span>Téléphone</span><input type="tel" autoComplete="tel" value={contact.telephone || ""} maxLength={30} onChange={(ev) => setContact("telephone", ev.target.value)} placeholder="06 12 34 56 78" /></label>
        <label className="champ"><span>Entreprise / association</span><input autoComplete="organization" value={contact.entreprise || ""} maxLength={120} onChange={(ev) => setContact("entreprise", ev.target.value)} placeholder="Facultatif" /></label>
      </div>
      <label className="champ"><span>Un message pour l'équipe ?</span><textarea rows={3} maxLength={1500} value={contact.message || ""} onChange={(ev) => setContact("message", ev.target.value)} placeholder="Disponibilités pour un appel, questions…" /></label>
      {pieces.length > 0 && <p className="note">📎 {pieces.length} pièce{pieces.length > 1 ? "s" : ""} jointe{pieces.length > 1 ? "s" : ""} envoyée{pieces.length > 1 ? "s" : ""} avec la commande : {pieces.map((p) => p.nom).join(", ")}</p>}
      <input className="piege" tabIndex={-1} autoComplete="off" aria-hidden="true" value={piege} onChange={(ev) => setPiege(ev.target.value)} />

      <label className="case consentement">
        <input type="checkbox" checked={consentement} onChange={(ev) => setConsentement(ev.target.checked)} />
        <span>J'accepte que KaizenServer utilise ces informations pour me recontacter au sujet de mon projet (<a className="lien-cyan" href="/confidentialite" target="_blank">confidentialité</a>, <a className="lien-cyan" href="/cgv" target="_blank">conditions de vente</a>). *</span>
      </label>

      {erreur && <p className="alerte erreur" style={{ marginTop: 14 }}>{erreur}</p>}
      {nonConfigure && (
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn secondaire" onClick={() => navigator.clipboard?.writeText(`${texteDossier(projet)}\n\nContact : ${contact.nom} · ${contact.email} · ${contact.telephone || ""}`)}>Copier mon dossier</button>
          <button className="btn secondaire" onClick={() => window.print()}>Télécharger en PDF</button>
        </div>
      )}

      {infoAchat && <p className="succes" style={{ marginTop: 18 }}>{infoAchat}</p>}
      <div className="cout-commande">
        <span>Envoyer la commande : <b>🪙 {COUT_COMMANDE} {monnaie}</b></span>
        <span className="solde">🪙 {dispo} disponibles</span>
      </div>
      {!assezPieces && <Recharge projet={projet} cout={COUT_COMMANDE} motif="l'envoi de la commande" monnaie={monnaie} />}

      <div className="navigation">
        <button className="btn secondaire" onClick={precedent}>Retour</button>
        <button className="btn grand" disabled={!valide || envoi || !assezPieces} onClick={commander}>{envoi ? "Envoi en cours…" : `Envoyer ma commande (−${COUT_COMMANDE}) ✈`}</button>
      </div>
      <p className="note"><span aria-hidden="true">🔒</span> Vos coordonnées servent uniquement à vous recontacter au sujet de ce projet.</p>
      <p className="note"><span aria-hidden="true">📱</span> La publication sur Google Play / App Store n'est pas incluse : elle se fait avec votre propre compte développeur. Server vous fournit l'application et les liens utiles.</p>
    </section>
  );
}

function EtapeMaquette({ projet, modifier, valider, infoAchat, precedent, suivant }) {
  const [format, setFormat] = useState("bureau");
  const m = projet.maquette;
  if (!m) return null;
  function telecharger() {
    const url = URL.createObjectURL(new Blob([m.html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `maquette-${(projet.nom || "kaizen").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="carte etape">
      <div className="titre-ligne">
        <h1 className="h-page">La maquette de {projet.nom || "votre application"}</h1>
        <div className="actions">
          <button className={`btn petit ${format === "bureau" ? "" : "secondaire"}`} onClick={() => setFormat("bureau")}>Ordinateur</button>
          <button className={`btn petit ${format === "mobile" ? "" : "secondaire"}`} onClick={() => setFormat("mobile")}>Téléphone</button>
        </div>
      </div>
      <p className="discret">Cliquez dans la maquette pour naviguer entre les écrans. C'est un aperçu : les boutons ne font rien de réel.</p>
      <div className={`cadre-maquette ${format}`}>
        {/* sandbox sans allow-same-origin : la maquette ne peut accéder ni aux données de Kaizen ni au réseau du site */}
        <iframe title="Maquette" sandbox="allow-scripts allow-modals" srcDoc={m.html} />
      </div>
      <p className="note">
        {m.source === "ia" ? "Maquette dessinée par l'IA de Kaizen" : "Maquette générée à partir du gabarit Kaizen"} le {new Date(m.genereLe).toLocaleString("fr-FR")}.
      </p>
      <AvisMaquette projet={projet} modifier={modifier} valider={valider} infoAchat={infoAchat} />
      <div className="navigation">
        <div className="actions">
          <button className="btn secondaire" onClick={precedent}>Récapitulatif</button>
          <button className="btn secondaire" onClick={telecharger}>Télécharger</button>
        </div>
        <button className="btn grand" onClick={suivant}>{projet.commande ? "Voir ma commande" : "Commander cette application 🛒"}</button>
      </div>
    </section>
  );
}

// Recharge de pièces d'or par Mollie (packs).
function Recharge({ projet, cout, motif, monnaie }) {
  const [achat, setAchat] = useState("");
  const [erreur, setErreur] = useState("");
  async function acheter(pack) {
    setErreur(""); setAchat(pack);
    try {
      const r = await fetch("/api/pieces/acheter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack, projetLocal: projet.id }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erreur || "Le paiement n'a pas pu démarrer.");
      window.location.href = d.url;
    } catch (e) { setErreur(e.message); setAchat(""); }
  }
  const manque = Math.max(0, cout - solde(projet));
  return (
    <div className="recharge">
      <p><b>Plus assez de {monnaie} :</b> {motif} coûte {cout}. Il vous en manque {manque}. Rechargez pour continuer.</p>
      <div className="packs">
        {PACKS.map((pk) => (
          <button key={pk.id} className="pack" disabled={Boolean(achat)} onClick={() => acheter(pk.id)}>
            <strong>🪙 {pk.pieces}</strong><span>{prixTexte(pk.prix)}</span>
            {achat === pk.id && <small>Redirection…</small>}
          </button>
        ))}
      </div>
      <p className="note">🔒 Paiement sécurisé par Mollie. Les pièces sont ajoutées dès votre retour sur cette page.</p>
      {erreur && <p className="alerte erreur">{erreur}</p>}
    </div>
  );
}

// Avis du client sur la maquette : accepter, ou demander une modification (payante en pièces).
function AvisMaquette({ projet, modifier, valider, infoAchat }) {
  const [retour, setRetour] = useState("");
  const dispo = solde(projet);
  const monnaie = projet.jeu?.actif ? trouverUnivers(projet.jeu.univers).monnaie : "pièces d'or";
  const assez = dispo >= COUT_MODIFICATION;
  return (
    <div className="avis-maquette">
      <div className="titre-ligne">
        <h3>💬 Votre avis sur la maquette</h3>
        <span className="solde">🪙 {dispo} {monnaie}</span>
      </div>
      {infoAchat && <p className="succes">{infoAchat}</p>}
      {projet.maquetteValidee ? (
        <p className="succes">✅ Vous avez accepté cette maquette. Vous pouvez commander votre application.</p>
      ) : (
        <button className="btn" onClick={valider}>✅ J'accepte la maquette</button>
      )}
      <label className="champ">
        <span>Il manque quelque chose ? Une couleur, un écran, un texte à changer ?</span>
        <textarea rows={3} maxLength={1000} value={retour} onChange={(e) => setRetour(e.target.value)} placeholder="Ex. : je voudrais du vert plutôt que du violet, ajouter un écran « Mes réservations », et mettre mon logo en haut." />
      </label>
      <div className="actions">
        <button className="btn secondaire" disabled={retour.trim().length < 5 || !assez} onClick={() => { modifier(retour.trim()); setRetour(""); }}>
          ✏️ Demander la modification (−{COUT_MODIFICATION} {monnaie})
        </button>
      </div>
      {!assez && <Recharge projet={projet} cout={COUT_MODIFICATION} motif="une modification" monnaie={monnaie} />}
      {projet.retours?.length > 0 && (
        <div className="historique-retours">
          <p className="petit-titre">Vos demandes de modification</p>
          <ul>{[...projet.retours].reverse().map((r, i) => <li key={i}><time>{new Date(r.date).toLocaleDateString("fr-FR")}</time> {r.texte}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function EtapeSuivi({ projet, maj, noter, actualiser }) {
  const [note, setNote] = useState("");
  const [evolution, setEvolution] = useState("");
  const indexStatut = Math.max(0, ETAPES_SUIVI.findIndex((e) => e.id === projet.statut));

  const changerStatut = (id) => {
    if (id === projet.statut) return;
    maj({ statut: id, journal: noter(projet, `Étape : ${trouver(ETAPES_SUIVI, id).label}`) }, [id]);
  };
  const ajouterNote = () => {
    if (!note.trim()) return;
    maj({ journal: noter(projet, note.trim().slice(0, 500)) }, ["journal"]);
    setNote("");
  };
  const ajouterEvolution = () => {
    const t = evolution.trim().slice(0, 120);
    if (!t) return;
    maj({
      personnalisees: [...projet.personnalisees, t].slice(0, 10),
      journal: noter(projet, `Évolution souhaitée : ${t}`),
      evolutionsEnAttente: true,
    }, ["evolution_ajoutee"]);
    setEvolution("");
  };

  return (
    <section className="carte etape">
      <h1 className="h-page">Suivi de {projet.nom || "votre projet"}</h1>
      <p className="discret">Kaizen vous accompagne à chaque étape. Indiquez où en est votre projet.</p>

      <ol className="frise">
        {ETAPES_SUIVI.map((e, i) => (
          <li key={e.id} className={i < indexStatut ? "fait" : i === indexStatut ? "actif" : ""}>
            <button onClick={() => changerStatut(e.id)}><span>{i + 1}</span>{e.label}</button>
          </li>
        ))}
      </ol>

      <div className="bloc conseil">
        <h3>Ce que Kaizen vous conseille maintenant</h3>
        <p>{CONSEILS[ETAPES_SUIVI[indexStatut].id]}</p>
      </div>

      <div className="deux-colonnes">
        <div className="bloc">
          <h3>Faire évoluer l'application</h3>
          <p className="discret">Une nouvelle idée de fonctionnalité ? Ajoutez-la : le récapitulatif sera mis à jour, et Server vous dira ce qu'elle change.</p>
          <div className="ligne-ajout">
            <input value={evolution} maxLength={120} placeholder="Ex. : programme de fidélité" onChange={(e) => setEvolution(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ajouterEvolution()} />
            <button className="btn secondaire" onClick={ajouterEvolution}>Ajouter</button>
          </div>
          {projet.evolutionsEnAttente && (
            <button className="btn petit" onClick={() => { maj({ evolutionsEnAttente: false }); actualiser(); }}>Mettre à jour le récapitulatif</button>
          )}
        </div>
        <div className="bloc">
          <h3>Journal du projet</h3>
          <div className="ligne-ajout">
            <input value={note} maxLength={500} placeholder="Ajouter une note (devis reçu, retour d'un client…)" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ajouterNote()} />
            <button className="btn secondaire" onClick={ajouterNote}>Noter</button>
          </div>
          <ul className="journal">
            {[...(projet.journal || [])].reverse().slice(0, 30).map((j, i) => (
              <li key={i}><time>{new Date(j.date).toLocaleDateString("fr-FR")}</time> {j.texte}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const CONSEILS = {
  idee: "Terminez le parcours guidé pour obtenir votre récapitulatif et votre maquette.",
  cadrage: "Relisez le récapitulatif. Retirez tout ce qui n'est pas indispensable pour la première version.",
  maquette: "Si ce n'est pas encore fait, commandez votre application : Server, le maître du jeu, vous enverra son offre et ses conseils dans votre espace. Montrez aussi la maquette à 3 à 5 futurs utilisateurs et notez leurs remarques dans le journal.",
  developpement: "Prévoyez un point chaque semaine avec la personne qui développe. Testez vous-même chaque nouvelle fonctionnalité et notez les corrections dans le journal.",
  mise_en_ligne: "Vérifiez les mentions légales, la politique de confidentialité et faites tester l'application par quelques vrais utilisateurs avant de la faire connaître.",
  evolution: "Regardez ce que vos utilisateurs utilisent vraiment. Ajoutez les évolutions une par une, en commençant par celles qu'ils demandent le plus.",
};
