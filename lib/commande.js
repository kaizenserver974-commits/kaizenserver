// Validation et mise en forme d'une commande KaizenServer (sans dépendance,
// testable avec node --test).

import { TYPES, PLATEFORMES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "./catalogue.js";
import { nettoyerProjet, estimer, euros } from "./moteur.js";

export const FORMULES = [
  { id: "v1", label: "Première version (conseillée)" },
  { id: "complet", label: "Projet complet" },
  { id: "nocode", label: "Solution no-code" },
  { id: "conseil", label: "Je veux d'abord en parler" },
];

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
  const formule = FORMULES.some((f) => f.id === corps.formule) ? corps.formule : "v1";
  const erreurs = [];
  if (contact.nom.length < 2) erreurs.push("Indiquez votre prénom et votre nom.");
  if (!EMAIL.test(contact.email)) erreurs.push("Indiquez une adresse e-mail valide.");
  if (contact.telephone && !/^[+0-9 ().-]{6,30}$/.test(contact.telephone)) erreurs.push("Le numéro de téléphone n'est pas valide.");
  if (corps.consentement !== true) erreurs.push("Merci d'accepter d'être recontacté au sujet de votre projet.");
  const projet = nettoyerProjet(corps.projet);
  if (projet.idee.trim().length < 10) erreurs.push("Le projet est incomplet : décrivez d'abord votre idée.");
  const recap = corps.recap && typeof corps.recap === "object" ? corps.recap : {};
  return { erreurs, contact, formule, projet, recap: { titre: court(recap.titre, 120), resume: court(recap.resume, 1200), v1: liste(recap.v1), plusTard: liste(recap.plusTard) } };
}

const liste = (l) => (Array.isArray(l) ? l.slice(0, 20).map((x) => court(x, 200)).filter(Boolean) : []);

export function numeroCommande(date = new Date()) {
  const j = date.toISOString().slice(0, 10).replaceAll("-", "");
  const alea = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X");
  return `KZ-${j}-${alea}`;
}

const echapper = (t) => String(t ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

export function resumeCommande({ contact, formule, projet, recap }, numero) {
  const e = estimer(projet);
  const fourchette = {
    v1: `${euros(e.v1.coutMin)} – ${euros(e.v1.coutMax)} · ~${e.v1.semaines} semaines`,
    complet: `${euros(e.complet.coutMin)} – ${euros(e.complet.coutMax)} · ~${e.complet.semaines} semaines`,
    nocode: `${euros(e.nocode.coutMin)} – ${euros(e.nocode.coutMax)} · ~${e.nocode.semaines} semaines`,
    conseil: "À définir ensemble",
  }[formule];
  const lignes = [
    ["Numéro", numero],
    ["Client", contact.nom],
    ["E-mail", contact.email],
    ["Téléphone", contact.telephone || "—"],
    ["Entreprise", contact.entreprise || "—"],
    ["Formule", FORMULES.find((f) => f.id === formule).label],
    ["Estimation indicative", fourchette],
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
    ["Message du client", contact.message || "—"],
  ];
  const texte = lignes.map(([k, v]) => `${k} : ${v}`).join("\n") + (recap.resume ? `\n\nRésumé : ${recap.resume}` : "");
  const html = `<div style="font-family:Arial,sans-serif;color:#14213d;max-width:640px">
<h2 style="margin:0 0 12px">Nouvelle commande KaizenServer ${echapper(numero)}</h2>
<table style="border-collapse:collapse;width:100%">${lignes.map(([k, v]) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:bold;vertical-align:top;width:170px">${echapper(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${echapper(v)}</td></tr>`).join("")}</table>
${recap.resume ? `<p style="margin-top:16px"><b>Résumé :</b> ${echapper(recap.resume)}</p>` : ""}
${recap.v1.length ? `<p><b>Première version :</b></p><ul>${recap.v1.map((x) => `<li>${echapper(x)}</li>`).join("")}</ul>` : ""}
</div>`;
  return { texte, html, fourchette };
}

export function confirmationClient({ contact, formule }, numero) {
  const formuleLabel = FORMULES.find((f) => f.id === formule).label;
  const texte = `Bonjour ${contact.nom},\n\nNous avons bien reçu la commande de votre application (n° ${numero}, formule : ${formuleLabel}).\nNous étudions votre projet et revenons vers vous pour en parler et vous proposer un devis précis.\n\nL'équipe KaizenServer`;
  const html = `<div style="font-family:Arial,sans-serif;color:#14213d;max-width:560px"><h2>Merci ${echapper(contact.nom)} !</h2><p>Nous avons bien reçu la commande de votre application.</p><p><b>Numéro :</b> ${echapper(numero)}<br><b>Formule :</b> ${echapper(formuleLabel)}</p><p>Nous étudions votre projet et revenons vers vous pour en parler et vous proposer un devis précis.</p><p>L'équipe KaizenServer</p></div>`;
  return { texte, html };
}
