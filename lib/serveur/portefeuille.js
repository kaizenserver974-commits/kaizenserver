// Portefeuille de pièces d'or tenu par le serveur (Supabase) : une bourse par projet
// et par compte (clé « email#projet »). Chaque nouveau projet démarre à 0 pièce.
// Toutes les opérations passent par les fonctions SQL kaizen_crediter / kaizen_debiter
// (voir supabase/schema.sql) : débit atomique, solde jamais négatif, crédits uniques par clé.
import { RECOMPENSES } from "../jeu.js";
import { BONUS_BIENVENUE, PLAFOND_GRATUIT_JOUR } from "../pieces.js";

// Identifiant de la bourse d'un projet. null si le projet n'est pas valide.
export function bourse(email, projet) {
  const id = String(projet || "");
  return email && /^[\w-]{6,80}$/.test(id) ? `${email}#${id}` : null;
}
const echapperLike = (t) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

export class SoldeInsuffisant extends Error {
  constructor(solde, cout) {
    super(`Il vous faut ${cout} pièces d'or (vous en avez ${solde}). Rechargez vos pièces pour continuer.`);
    this.status = 402;
    this.solde = solde;
  }
}

async function rpc(sb, nom, args) {
  const { data, error } = await sb.rpc(nom, args);
  if (error) throw new Error(`${nom} : ${error.message} — relancez supabase/schema.sql`);
  return data;
}

// Solde du compte (crée le portefeuille avec le bonus de bienvenue la première fois).
export async function lireSolde(sb, email) {
  return rpc(sb, "kaizen_crediter", { p_email: email, p_montant: BONUS_BIENVENUE, p_motif: "Bonus de bienvenue", p_cle: "bienvenue" });
}

export async function crediter(sb, email, montant, motif, cle = null) {
  return rpc(sb, "kaizen_crediter", { p_email: email, p_montant: Math.round(montant), p_motif: motif, p_cle: cle });
}

// Débite ou lève SoldeInsuffisant.
export async function debiter(sb, email, cout, motif) {
  await lireSolde(sb, email);
  const solde = await rpc(sb, "kaizen_debiter", { p_email: email, p_montant: cout, p_motif: motif });
  if (solde === null || solde === undefined) throw new SoldeInsuffisant(await lireSolde(sb, email), cout);
  return solde;
}

// Rembourse une dépense quand le service n'a pas pu être rendu.
export async function rembourser(sb, email, montant, motif) {
  return crediter(sb, email, montant, `Remboursement : ${motif}`);
}

// Récompenses du jeu : chaque étape validée remplit la bourse du projet, une seule fois.
// Une limite quotidienne (tous projets du compte) empêche de créer des projets à l'infini.
// Retourne { solde, gagne, plafond } : gagne = pièces réellement versées ; plafond = limite du jour atteinte.
export async function crediterRecompenses(sb, email, projet, cles, { sansPlafond = false } = {}) {
  const cleBourse = bourse(email, projet);
  if (!cleBourse) throw new Error("Projet invalide");
  let solde = await lireSolde(sb, cleBourse);
  const depart = solde;
  let plafond = false;
  const debutJour = new Date(); debutJour.setUTCHours(0, 0, 0, 0);
  const { data: duJour } = await sb.from("kaizen_mouvements_pieces").select("montant")
    .like("email", `${echapperLike(email)}#%`).like("cle", "recompense:%").gte("created_at", debutJour.toISOString());
  let reste = sansPlafond ? Infinity : PLAFOND_GRATUIT_JOUR - (duJour || []).reduce((t, m) => t + Math.max(0, m.montant), 0);
  // Déjà versé dans ce projet (si le barème change, on complète la différence).
  const { data: dejaVerse } = await sb.from("kaizen_mouvements_pieces").select("cle, montant")
    .eq("email", cleBourse).like("cle", "recompense:%");
  const verse = {};
  for (const m of dejaVerse || []) {
    const c = String(m.cle).slice("recompense:".length).replace(/:complement\d*$/, "");
    verse[c] = (verse[c] || 0) + Math.max(0, m.montant);
  }
  for (const cle of [...new Set(cles)].slice(0, 20)) {
    const r = RECOMPENSES[cle];
    const du = r ? (r.pieces ?? r.points) : 0;
    const manquant = du - (verse[cle] || 0);
    const pieces = Math.min(manquant, Math.max(0, reste));
    if (manquant > 0 && pieces < manquant) plafond = true;
    if (pieces <= 0) continue;
    const avant = solde;
    solde = await crediter(sb, cleBourse, pieces, `Récompense du jeu : ${cle}`, verse[cle] ? `recompense:${cle}:complement${du}` : `recompense:${cle}`);
    reste -= solde - avant;
  }
  return { solde, gagne: solde - depart, plafond };
}

// Derniers mouvements du compte (gains, dépenses, remboursements, achats).
export async function historique(sb, email, limite = 20) {
  const { data, error } = await sb.from("kaizen_mouvements_pieces").select("montant, motif, created_at")
    .eq("email", email).order("created_at", { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return data || [];
}
