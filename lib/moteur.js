// Moteur déterministe de Kaizen.
// - Les chiffres (estimation coût / délai) sont TOUJOURS calculés ici,
//   jamais inventés par l'IA.
// - Les fonctions "secours" produisent un résultat utile sans clé IA.

import {
  TYPES, FONCTIONNALITES, PLATEFORMES, STYLES, BUDGETS, DELAIS, PRIORITES,
  trouver, fonctionnalite,
} from "./catalogue.js";

const TJM = 450; // tarif journalier indicatif d'un développeur indépendant (€)
const JOURS_PAR_SEMAINE = 4; // un développeur, rythme réaliste
const SEMAINES_CADRAGE_TESTS = 2;

const normaliser = (t) => String(t || "").toLowerCase();

// ---------- Étape 2 : analyse de l'idée (secours) ----------

export function analyserIdeeSecours(idee) {
  const texte = normaliser(idee);
  let meilleur = trouver(TYPES, "autre");
  let score = 0;
  for (const type of TYPES) {
    const s = type.mots.reduce((acc, mot) => acc + (texte.includes(mot) ? 1 : 0), 0);
    if (s > score) { score = s; meilleur = type; }
  }

  const fonctionnalites = new Set(meilleur.fonctionnalites);
  if (/paie|payer|paiement|abonnement|acompte/.test(texte)) fonctionnalites.add("paiement");
  if (/message|discut|chat/.test(texte)) fonctionnalites.add("messagerie");
  if (/rappel|notif|sms/.test(texte)) fonctionnalites.add("notifications");
  if (/carte|géoloc|geoloc|autour de|proximité/.test(texte)) fonctionnalites.add("geolocalisation");
  if (/\bia\b|intelligen|assistant|chatbot/.test(texte)) fonctionnalites.add("ia_assistant");
  if (/document|pdf|fichier|justificatif/.test(texte)) fonctionnalites.add("documents");
  if (/mobile|téléphone|telephone|smartphone/.test(texte)) fonctionnalites.add("comptes");

  const plateforme = /app store|play store|appli mobile|application mobile|smartphone/.test(texte) ? "mobile" : "web";

  return {
    typeId: meilleur.id,
    plateforme,
    nomSuggere: "",
    reformulation: idee.trim().length > 0
      ? `Vous souhaitez créer : ${idee.trim().replace(/\s+/g, " ").slice(0, 220)}`
      : "",
    publicCible: "",
    fonctionnalites: [...fonctionnalites].filter((id) => fonctionnalite(id)),
    suggestionsPersonnalisees: [],
    questions: [
      "Qui utilisera l'application au quotidien : vous, vos clients, votre équipe ?",
      "Quelle est l'action la plus importante que l'utilisateur doit pouvoir faire ?",
      "Comment faites-vous aujourd'hui sans application ?",
    ],
    source: "regles",
  };
}

// ---------- Estimation (toujours déterministe) ----------

function joursPour(projet, ids) {
  const plateforme = trouver(PLATEFORMES, projet.plateforme) || PLATEFORMES[0];
  const style = trouver(STYLES, projet.style);
  const joursFonctions = ids.reduce((acc, id) => acc + (fonctionnalite(id)?.complexite || 2) * 2.5, 0);
  const joursPerso = (projet.personnalisees || []).filter(Boolean).length * 4;
  return Math.round(plateforme.base + joursFonctions + joursPerso + (style?.supplement || 0));
}

function fourchette(jours) {
  const cout = jours * TJM;
  return {
    jours,
    coutMin: arrondir(cout * 0.8),
    coutMax: arrondir(cout * 1.2),
    semaines: Math.ceil(jours / JOURS_PAR_SEMAINE) + SEMAINES_CADRAGE_TESTS,
  };
}

const arrondir = (n) => Math.round(n / 500) * 500;

export function estimer(projet) {
  const ids = (projet.fonctionnalites || []).filter((id) => fonctionnalite(id));
  const complet = fourchette(joursPour(projet, ids));

  // No-code / outils existants : ordre de grandeur ≈ 35 % du sur-mesure.
  const nocode = {
    coutMin: arrondir(complet.coutMin * 0.3),
    coutMax: arrondir(complet.coutMax * 0.4),
    semaines: Math.max(2, Math.ceil(complet.semaines * 0.4)),
  };

  // Proposition de V1 : on garde TOUJOURS l'action principale du type
  // (et les comptes si elle en dépend), puis les fonctions essentielles,
  // puis les plus simples, tant qu'on reste dans le budget annoncé.
  const type = trouver(TYPES, projet.typeId);
  const indispensables = ids.filter((id) => id === type?.coeur || (id === "comptes" && type?.fonctionnalites?.includes("comptes")));
  const essentielles = new Set(type?.fonctionnalites?.slice(0, 3) || []);
  const triees = ids.filter((id) => !indispensables.includes(id)).sort((a, b) => {
    const ea = essentielles.has(a) ? 0 : 1;
    const eb = essentielles.has(b) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    return (fonctionnalite(a)?.complexite || 2) - (fonctionnalite(b)?.complexite || 2);
  });

  const budget = trouver(BUDGETS, projet.budget);
  const delai = trouver(DELAIS, projet.delai);
  const plafond = budget?.max && Number.isFinite(budget.max) ? budget.max : null;

  let v1 = [...indispensables, ...triees];
  if (plafond && complet.coutMin > plafond) {
    v1 = [...indispensables];
    for (const id of triees) {
      const test = fourchette(joursPour({ ...projet, personnalisees: [] }, [...v1, id]));
      if (test.coutMin <= plafond || v1.length < 2) v1.push(id); else break;
    }
  }
  const versionV1 = fourchette(joursPour({ ...projet, personnalisees: v1.length < ids.length ? [] : projet.personnalisees }, v1));

  const alertes = [];
  if (plafond && complet.coutMin > plafond) {
    alertes.push(`Le projet complet (${euros(complet.coutMin)} – ${euros(complet.coutMax)}) dépasse le budget annoncé. Kaizen propose de commencer par une première version réduite, ou par une solution no-code.`);
  }
  if (delai?.semaines && complet.semaines > delai.semaines) {
    alertes.push(`Le délai souhaité (${delai.label.toLowerCase()}) est court pour l'ensemble des fonctionnalités (environ ${complet.semaines} semaines). Une première version permet d'être en ligne plus vite.`);
  }
  if (plafond && nocode.coutMin > plafond) {
    alertes.push("Même en no-code, le budget est serré : réduisez la première version à l'action principale de vos utilisateurs.");
  }

  return {
    tjm: TJM,
    complet,
    nocode,
    v1: { fonctionnalites: v1, ...versionV1 },
    plusTard: ids.filter((id) => !v1.includes(id)),
    alertes,
    avertissement: "Ordres de grandeur indicatifs, à confirmer par un devis. Ils supposent un développeur indépendant à environ 450 €/jour.",
  };
}

export const euros = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// ---------- Étape 3 : récapitulatif (secours) ----------

export function recapitulatifSecours(projet, estimation) {
  const type = trouver(TYPES, projet.typeId) || trouver(TYPES, "autre");
  const plateforme = trouver(PLATEFORMES, projet.plateforme) || PLATEFORMES[0];
  const libelle = (id) => fonctionnalite(id)?.label || id;
  const nom = projet.nom || "Votre application";

  const ecrans = ["Accueil"];
  for (const id of estimation.v1.fonctionnalites) {
    const e = fonctionnalite(id)?.ecran;
    if (e && !ecrans.includes(e)) ecrans.push(e);
  }

  return {
    titre: nom,
    resume: `${nom} est ${type.id === "autre" ? "une application" : `une application de type « ${type.label.toLowerCase()} »`} (${plateforme.label.toLowerCase()}) destinée à ${projet.publicCible || "vos utilisateurs"}.${projet.idee?.trim() ? ` Idée de départ : « ${projet.idee.trim().slice(0, 300)} »` : ""}`,
    probleme: "À préciser avec vous : comment cette activité est-elle gérée aujourd'hui, et qu'est-ce qui fait perdre du temps ou des clients ?",
    utilisateurs: [
      { role: "Utilisateur", besoin: projet.publicCible || "Accéder simplement au service proposé." },
      ...((projet.fonctionnalites || []).includes("tableau_admin") || (projet.fonctionnalites || []).includes("roles")
        ? [{ role: "Administrateur", besoin: "Gérer les contenus, les utilisateurs et suivre l'activité." }]
        : []),
    ],
    parcours: [
      "La personne découvre l'application depuis la page d'accueil.",
      ...((projet.fonctionnalites || []).includes("comptes") ? ["Elle crée son compte en quelques secondes."] : []),
      `Elle réalise l'action principale : ${libelle((projet.fonctionnalites || []).includes(type.coeur) ? type.coeur : estimation.v1.fonctionnalites.find((id) => id !== "comptes") || projet.fonctionnalites?.[0] || "pages_presentation").toLowerCase()}.`,
      "Elle reçoit une confirmation claire et peut revenir plus tard.",
    ],
    ecrans: ecrans.map((nomEcran) => ({ nom: nomEcran, contenu: contenuEcran(nomEcran) })),
    v1: [...estimation.v1.fonctionnalites.map(libelle), ...(estimation.plusTard.length === 0 ? projet.personnalisees || [] : [])],
    plusTard: [...estimation.plusTard.map(libelle), ...(estimation.plusTard.length > 0 ? projet.personnalisees || [] : [])],
    donnees: ["Utilisateurs (nom, e-mail)", ...(projet.fonctionnalites || []).map((id) => donneePour(id)).filter(Boolean)],
    risques: [
      "Ajouter trop de fonctionnalités avant d'avoir testé l'idée avec de vrais utilisateurs.",
      ...((projet.fonctionnalites || []).includes("paiement") ? ["Paiement en ligne : choisir un prestataire (Stripe, Mollie…) et respecter ses obligations."] : []),
      "Données personnelles : prévoir une politique de confidentialité conforme au RGPD.",
    ],
    prochainesEtapes: [
      "Valider ce récapitulatif et la maquette.",
      "Montrer la maquette à 3 à 5 futurs utilisateurs et noter leurs remarques.",
      "Commander votre application : Server, le maître du jeu, vous enverra son offre (tarif, délai) et ses conseils.",
    ],
    source: "regles",
  };
}

function contenuEcran(nom) {
  const textes = {
    Accueil: "Présentation du service, bouton d'action principal, arguments clés.",
    Connexion: "Inscription et connexion par e-mail.",
    Profil: "Informations de la personne et préférences.",
    Calendrier: "Disponibilités par jour et par semaine.",
    "Réserver": "Choix du créneau, confirmation.",
    Paiement: "Récapitulatif et paiement sécurisé.",
    Administration: "Gestion des utilisateurs, contenus et statistiques.",
    "Mon parcours": "Étapes à suivre et progression.",
    Messages: "Conversations et notifications de nouveaux messages.",
    Documents: "Liste des documents, ajout et téléchargement.",
    Catalogue: "Liste des produits ou services avec filtres.",
    Panier: "Articles choisis, quantités, total.",
    "Mes commandes": "Historique et statut des commandes.",
    "Actualités": "Publications récentes des membres.",
    "Événements": "Prochains événements et inscription.",
    "Tableau de bord": "Chiffres clés et graphiques.",
    Fiches: "Liste filtrable, fiche détaillée, ajout et modification.",
    Contact: "Formulaire de contact et coordonnées.",
    Galerie: "Photos de réalisations.",
    Avis: "Témoignages clients.",
    Assistant: "Questions-réponses avec l'assistant.",
    Carte: "Carte interactive des lieux.",
  };
  return textes[nom] || "Contenu à préciser.";
}

function donneePour(id) {
  return {
    reservation: "Réservations (date, créneau, statut)",
    calendrier: "Disponibilités",
    paiement: "Paiements (montant, statut — jamais les numéros de carte)",
    parcours: "Étapes et progression de chaque personne",
    messagerie: "Messages",
    documents: "Fichiers déposés",
    catalogue: "Produits / services (nom, prix, photo)",
    panier: "Commandes",
    suivi_commandes: "Statuts de commande",
    fil_actualite: "Publications",
    evenements: "Événements et inscriptions",
    listes_donnees: "Fiches métier (clients, stock, tâches…)",
    avis: "Avis clients",
  }[id];
}

// ---------- Étape 4 : maquette (secours, par gabarit) ----------

const echapper = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function maquetteSecours(projet, recap) {
  const style = trouver(STYLES, projet.style) || STYLES[0];
  const couleur = /^#[0-9a-f]{6}$/i.test(projet.couleur || "") ? projet.couleur : style.couleur;
  const nom = echapper(projet.nom || recap?.titre || "Mon application");
  const ecrans = (recap?.ecrans?.length ? recap.ecrans : [{ nom: "Accueil", contenu: "" }]).slice(0, 8);

  const nav = ecrans
    .map((e, i) => `<button class="tab${i === 0 ? " on" : ""}" data-i="${i}">${echapper(e.nom)}</button>`)
    .join("");

  const vues = ecrans
    .map((e, i) => `<section class="vue${i === 0 ? " on" : ""}" data-i="${i}">${vuePour(e, nom, recap)}</section>`)
    .join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nom} — maquette</title>
<style>
:root{--c:${couleur};--f:${style.fond};--t:#1d2433;--m:#6b7280;--l:#e5e7eb}
*{box-sizing:border-box}body{margin:0;font-family:${style.police};background:var(--f);color:var(--t)}
header{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#fff;border-bottom:1px solid var(--l);position:sticky;top:0}
.logo{width:34px;height:34px;border-radius:10px;background:var(--c);color:#fff;display:grid;place-items:center;font-weight:700}
nav{display:flex;gap:6px;overflow-x:auto;padding:10px 18px;background:#fff;border-bottom:1px solid var(--l)}
.tab{border:1px solid var(--l);background:#fff;border-radius:999px;padding:7px 14px;cursor:pointer;white-space:nowrap;font:inherit;font-size:14px;color:var(--t)}
.tab.on{background:var(--c);border-color:var(--c);color:#fff}
main{max-width:860px;margin:0 auto;padding:22px 18px 60px}.vue{display:none}.vue.on{display:block}
h1{font-size:28px;margin:0 0 8px}h2{font-size:20px;margin:0 0 12px}p{color:var(--m);line-height:1.6}
.carte{background:#fff;border:1px solid var(--l);border-radius:16px;padding:18px;margin-bottom:14px}
.btn{display:inline-block;background:var(--c);color:#fff;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-weight:600;cursor:pointer}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.ligne{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--l)}
.ligne:last-child{border-bottom:0}.badge{background:var(--f);color:var(--c);border-radius:999px;padding:3px 10px;font-size:13px;font-weight:600}
input,textarea{width:100%;padding:11px;border:1px solid var(--l);border-radius:10px;font:inherit;margin:6px 0 12px}
.ph{height:110px;border-radius:12px;background:linear-gradient(135deg,var(--c),#ffffff00),var(--f);opacity:.35}
.creneaux{display:flex;flex-wrap:wrap;gap:8px}.creneaux span{border:1px solid var(--c);color:var(--c);border-radius:8px;padding:8px 12px}
.bandeau{font-size:12px;text-align:center;padding:6px;background:#111;color:#fff}
</style></head><body>
<div class="bandeau">Maquette Kaizen — aperçu non fonctionnel</div>
<header><div class="logo">${nom.slice(0, 1).toUpperCase()}</div><strong>${nom}</strong></header>
<nav>${nav}</nav><main>${vues}</main>
<script>
document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){
var i=b.dataset.i;document.querySelectorAll('.tab,.vue').forEach(function(e){e.classList.toggle('on',e.dataset.i===i)});});});
document.querySelectorAll('form').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();alert('Maquette : action simulée');});});
</script></body></html>`;
}

function vuePour(ecran, nom, recap) {
  const titre = echapper(ecran.nom);
  const desc = `<p>${echapper(ecran.contenu)}</p>`;
  switch (ecran.nom) {
    case "Accueil":
      return `<div class="carte"><h1>${nom}</h1><p>${echapper((recap?.resume || "").slice(0, 240))}</p><button class="btn">Commencer</button></div>
<div class="grille">${(recap?.v1 || []).slice(0, 3).map((f) => `<div class="carte"><div class="ph"></div><h2>${echapper(f)}</h2></div>`).join("")}</div>`;
    case "Connexion":
      return `<div class="carte" style="max-width:420px"><h2>Connexion</h2><form><label>E-mail</label><input type="email" placeholder="vous@exemple.fr"><label>Mot de passe</label><input type="password" placeholder="••••••••"><button class="btn">Se connecter</button></form></div>`;
    case "Calendrier":
    case "Réserver":
      return `<div class="carte"><h2>${titre}</h2>${desc}<div class="creneaux">${["Lun 9:00", "Lun 10:30", "Mar 14:00", "Mer 9:00", "Jeu 16:00", "Ven 11:00"].map((c) => `<span>${c}</span>`).join("")}</div><br><button class="btn">Confirmer le créneau</button></div>`;
    case "Messages":
      return `<div class="carte"><h2>Messages</h2>${["Bonjour, j'ai une question…", "Merci pour votre retour !", "Le document est disponible."].map((m, i) => `<div class="ligne"><span>${m}</span><span class="badge">${i === 0 ? "Nouveau" : "Lu"}</span></div>`).join("")}</div>`;
    case "Tableau de bord":
    case "Administration":
      return `<h2>${titre}</h2><div class="grille">${["Utilisateurs", "Cette semaine", "En attente"].map((k, i) => `<div class="carte"><p>${k}</p><h1>${[128, 24, 5][i]}</h1></div>`).join("")}</div><div class="carte">${desc}</div>`;
    case "Catalogue":
    case "Galerie":
      return `<h2>${titre}</h2><div class="grille">${[1, 2, 3, 4, 5, 6].map((n) => `<div class="carte"><div class="ph"></div><strong>Élément ${n}</strong><p>${ecran.nom === "Catalogue" ? `${n * 10} €` : ""}</p></div>`).join("")}</div>`;
    case "Contact":
      return `<div class="carte"><h2>Contact</h2><form><label>Nom</label><input><label>Message</label><textarea rows="4"></textarea><button class="btn">Envoyer</button></form></div>`;
    case "Mon parcours":
      return `<div class="carte"><h2>Mon parcours</h2>${["Premier rendez-vous", "Diagnostic", "Plan d'action", "Bilan"].map((e, i) => `<div class="ligne"><span>${i + 1}. ${e}</span><span class="badge">${i < 2 ? "Fait" : "À venir"}</span></div>`).join("")}</div>`;
    default:
      return `<div class="carte"><h2>${titre}</h2>${desc}${[1, 2, 3].map((n) => `<div class="ligne"><span>Élément ${n}</span><span class="badge">Voir</span></div>`).join("")}</div>`;
  }
}

// ---------- Validation des entrées ----------

const court = (t, n) => String(t ?? "").slice(0, n);

export function nettoyerProjet(p = {}) {
  const ids = new Set(FONCTIONNALITES.map((f) => f.id));
  return {
    idee: court(p.idee, 2000),
    nom: court(p.nom, 80),
    typeId: trouver(TYPES, p.typeId) ? p.typeId : "autre",
    plateforme: trouver(PLATEFORMES, p.plateforme) ? p.plateforme : "web",
    fonctionnalites: Array.isArray(p.fonctionnalites) ? p.fonctionnalites.filter((id) => ids.has(id)).slice(0, 20) : [],
    personnalisees: Array.isArray(p.personnalisees) ? p.personnalisees.map((t) => court(t, 120)).filter(Boolean).slice(0, 10) : [],
    publicCible: court(p.publicCible, 300),
    style: trouver(STYLES, p.style) ? p.style : "sobre",
    couleur: /^#[0-9a-f]{6}$/i.test(p.couleur || "") ? p.couleur : "",
    budget: trouver(BUDGETS, p.budget) ? p.budget : "inconnu",
    delai: trouver(DELAIS, p.delai) ? p.delai : "libre",
    precisions: court(p.precisions, 1500),
    priorite: trouver(PRIORITES, p.priorite) ? p.priorite : "moyenne",
    inspirations: court(p.inspirations, 600),
  };
}
