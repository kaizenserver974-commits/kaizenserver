// Validation et mise en forme d'une commande KaizenServer (sans dépendance,
// testable avec node --test).

import { TYPES, PLATEFORMES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "./catalogue.js";
import { nettoyerProjet } from "./moteur.js";

export const FORMULES = [
  { id: "v1", label: "Première version (conseillée)" },
  { id: "complet", label: "Projet complet" },
  { id: "nocode", label: "Solution no-code" },
  { id: "conseil", label: "Laisse Server conseiller" },
];

// Demande d'une maquette sur mesure au génie Server (payée en pièces d'or dans le jeu).
export const FORMULE_GENIE = { id: "genie", label: "🧞 Maquette sur mesure demandée au génie" };
export const FORMULE_PRE = { id: "preinscription", label: "📣 Pré-inscription (réseaux sociaux)" };
export const labelFormule = (id) => [...FORMULES, FORMULE_GENIE, FORMULE_PRE].find((f) => f.id === id)?.label || id;

// Pré-inscription depuis les réseaux sociaux (page /bientot) : un projet à étudier par Server.
export const CADRES = [{ id: "entreprise", label: "Pour mon entreprise" }, { id: "personnel", label: "Pour moi, personnellement" }, { id: "association", label: "Pour mon association" }];
export function validerPreinscription(c = {}) {
  const t = (v, n) => String(v ?? "").trim().slice(0, n);
  const p = {
    nom: t(c.nom, 100), email: t(c.email, 160).toLowerCase(), telephone: t(c.telephone, 30), entreprise: t(c.entreprise, 120),
    cadre: CADRES.some((x) => x.id === c.cadre) ? c.cadre : "personnel",
    titre: t(c.titre, 120), idee: t(c.idee, 2000), budget: t(c.budget, 40), delai: t(c.delai, 40), source: t(c.source, 40) || "site",
  };
  const erreurs = [];
  if (p.nom.length < 2) erreurs.push("Indiquez votre prénom et votre nom.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) erreurs.push("Indiquez une adresse e-mail valide.");
  if (p.telephone && !/^[+0-9 ().-]{6,30}$/.test(p.telephone)) erreurs.push("Le numéro de téléphone n'est pas valide.");
  if (p.idee.length < 15) erreurs.push("Décrivez votre projet en une ou deux phrases.");
  if (c.consentement !== true) erreurs.push("Merci d'accepter d'être recontacté au sujet de votre projet.");
  return { erreurs, p };
}

const court = (t, n) => String(t ?? "").trim().slice(0, n);
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;

export function validerCommande(corps = {}) {
  const c = corps.contact || {};
  const contact = {
    nom: court(c.nom, 100),
    email: court(c.email, 160).toLowerCase(),
    telephone: court(c.telephone, 30),
    entreprise: court(c.entreprise, 120),
    message: court(c.message, 1500),
  };
  const formule = corps.demande === "genie" ? "genie" : FORMULES.some((f) => f.id === corps.formule) ? corps.formule : "v1";
  const erreurs = [];
  if (contact.nom.length < 2) erreurs.push("Indiquez votre prénom et votre nom.");
  if (!EMAIL.test(contact.email)) erreurs.push("Indiquez une adresse e-mail valide.");
  if (contact.telephone && !/^[+0-9 ().-]{6,30}$/.test(contact.telephone)) erreurs.push("Le numéro de téléphone n'est pas valide.");
  if (corps.consentement !== true) erreurs.push("Merci d'accepter d'être recontacté au sujet de votre projet.");
  const projet = nettoyerProjet(corps.projet);
  if (projet.idee.trim().length < 10) erreurs.push("Le projet est incomplet : décrivez d'abord votre idée.");
  const recap = corps.recap && typeof corps.recap === "object" ? corps.recap : {};
  const { pieces, erreur: erreurPieces } = validerPieces(corps.pieces);
  if (erreurPieces) erreurs.push(erreurPieces);
  return { erreurs, contact, formule, projet, pieces, recap: { titre: court(recap.titre, 120), resume: court(recap.resume, 1200), v1: liste(recap.v1), plusTard: liste(recap.plusTard) } };
}

const TYPES_PIECES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

// Pièces jointes : 3 maximum, 2,5 Mo au total, images ou PDF.
export function validerPieces(brutes) {
  if (!Array.isArray(brutes) || brutes.length === 0) return { pieces: [] };
  if (brutes.length > 3) return { pieces: [], erreur: "3 pièces jointes maximum." };
  const pieces = [];
  let total = 0;
  for (const b of brutes) {
    const contenu = String(b?.contenu || "");
    if (!TYPES_PIECES.includes(b?.type) || !/^[A-Za-z0-9+/=]+$/.test(contenu)) return { pieces: [], erreur: "Une pièce jointe n'est pas valide (images ou PDF uniquement)." };
    const taille = Math.floor((contenu.length * 3) / 4);
    total += taille;
    if (total > 2.5 * 1024 * 1024) return { pieces: [], erreur: "Les pièces jointes dépassent 2,5 Mo au total." };
    const nom = String(b.nom || "piece-jointe").replace(/[^\w.\- ()àâäéèêëîïôöùûüç]/gi, "_").slice(0, 120) || "piece-jointe";
    pieces.push({ nom, type: b.type, contenu });
  }
  return { pieces };
}

const liste = (l) => (Array.isArray(l) ? l.slice(0, 20).map((x) => court(x, 200)).filter(Boolean) : []);

export function numeroCommande(date = new Date()) {
  const j = date.toISOString().slice(0, 10).replaceAll("-", "");
  const alea = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X");
  return `KZ-${j}-${alea}`;
}

const echapper = (t) => String(t ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

export function resumeCommande({ contact, formule, projet, recap, pieces = [] }, numero) {
  const lignes = [
    ["Numéro", numero],
    ["Client", contact.nom],
    ["E-mail", contact.email],
    ["Téléphone", contact.telephone || "—"],
    ["Entreprise", contact.entreprise || "—"],
    ["Formule", labelFormule(formule)],
    ["Application", recap.titre || projet.nom || "Sans nom"],
    ["Type", `${trouver(TYPES, projet.typeId)?.label || "—"} · ${trouver(PLATEFORMES, projet.plateforme)?.label || ""}`],
    ["Budget annoncé", trouver(BUDGETS, projet.budget)?.label || "—"],
    ["Délai souhaité", trouver(DELAIS, projet.delai)?.label || "—"],
    ["Priorité", trouver(PRIORITES, projet.priorite)?.label || "—"],
    ["Idée", projet.idee],
    ["Fonctionnalités", [...projet.fonctionnalites.map((id) => fonctionnalite(id)?.label || id), ...projet.personnalisees].join(", ") || "—"],
    ["Public", projet.publicCible || "—"],
    ["Inspirations", projet.inspirations || "—"],
    ["Précisions", projet.precisions || "—"],
    ["Maquette", projet.maquetteValidee ? "acceptée par le client" : "pas encore acceptée"],
    ["Demandes de modification", (projet.retours || []).join(" | ") || "—"],
    ["Message du client", contact.message || "—"],
    ["Pièces jointes", pieces.map((p) => p.nom).join(", ") || "—"],
  ];
  const texte = lignes.map(([k, v]) => `${k} : ${v}`).join("\n") + (recap.resume ? `\n\nRésumé : ${recap.resume}` : "");
  const html = `<div style="font-family:Arial,sans-serif;color:#14213d;max-width:640px">
<h2 style="margin:0 0 12px">Nouvelle commande KaizenServer ${echapper(numero)}</h2>
<table style="border-collapse:collapse;width:100%">${lignes.map(([k, v]) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:bold;vertical-align:top;width:170px">${echapper(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${echapper(v)}</td></tr>`).join("")}</table>
${recap.resume ? `<p style="margin-top:16px"><b>Résumé :</b> ${echapper(recap.resume)}</p>` : ""}
${recap.v1.length ? `<p><b>Première version :</b></p><ul>${recap.v1.map((x) => `<li>${echapper(x)}</li>`).join("")}</ul>` : ""}
</div>`;
  return { texte, html };
}

export function confirmationClient({ contact, formule }, numero) {
  if (formule === "genie") {
    const texte = `Bonjour ${contact.nom},\n\nLe génie Server a bien reçu votre demande de maquette sur mesure (n° ${numero}).\nIl prépare une proposition de maquette pour votre application : vous la retrouverez dans votre espace client, avec ses conseils.\n\nServer — KaizenServer`;
    const html = `<div style="font-family:Arial,sans-serif;color:#14213d;max-width:560px"><h2>🧞 Votre vœu est entendu, ${echapper(contact.nom)} !</h2><p>Le génie Server a bien reçu votre demande de maquette sur mesure.</p><p><b>Numéro :</b> ${echapper(numero)}</p><p>Il prépare une proposition de maquette pour votre application : vous la retrouverez dans votre espace client, avec ses conseils.</p><p>Server — KaizenServer</p></div>`;
    return { texte, html };
  }
  const formuleLabel = labelFormule(formule);
  const texte = `Bonjour ${contact.nom},\n\nNous avons bien reçu la commande de votre application (n° ${numero}, formule : ${formuleLabel}).\nServer, votre maître du jeu, étudie votre projet et vous enverra son offre (tarif, délai) et ses conseils.\n\nServer — KaizenServer`;
  const html = `<div style="font-family:Arial,sans-serif;color:#14213d;max-width:560px"><h2>Merci ${echapper(contact.nom)} !</h2><p>Nous avons bien reçu la commande de votre application.</p><p><b>Numéro :</b> ${echapper(numero)}<br><b>Formule :</b> ${echapper(formuleLabel)}</p><p>Server, votre maître du jeu, étudie votre projet et vous enverra son offre (tarif, délai) et ses conseils.</p><p>Server — KaizenServer</p></div>`;
  return { texte, html };
}
