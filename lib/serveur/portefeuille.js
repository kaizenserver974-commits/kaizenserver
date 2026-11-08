// Portefeuille de pièces d'or tenu par le serveur (Supabase), un par compte.
// Toutes les opérations passent par les fonctions SQL kaizen_crediter / kaizen_debiter
// (voir supabase/schema.sql) : débit atomique, solde jamais négatif, crédits uniques par clé.
import { RECOMPENSES } from "../jeu.js";
import { BONUS_BIENVENUE, PLAFOND_GRATUIT_JOUR } from "../pieces.js";

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

// Récompenses du jeu : pièces gratuites à chaque étape validée, une fois par projet.
// Une limite quotidienne empêche de créer des projets à l'infini pour gagner des pièces.
export async function crediterRecompenses(sb, email, cles, projetId) {
  let solde = await lireSolde(sb, email);
  const projet = /^[\w-]{6,80}$/.test(String(projetId || "")) ? String(projetId) : "sans-projet";
  const debutJour = new Date(); debutJour.setUTCHours(0, 0, 0, 0);
  const { data: duJour } = await sb.from("kaizen_mouvements_pieces").select("montant")
    .eq("email", email).like("cle", "recompense:%").gte("created_at", debutJour.toISOString());
  let reste = PLAFOND_GRATUIT_JOUR - (duJour || []).reduce((t, m) => t + Math.max(0, m.montant), 0);
  for (const cle of [...new Set(cles)].slice(0, 20)) {
    const r = RECOMPENSES[cle];
    const pieces = Math.min(r ? (r.pieces ?? r.points) : 0, Math.max(0, reste));
    if (pieces <= 0) continue;
    const avant = solde;
    solde = await crediter(sb, email, pieces, `Récompense du jeu : ${cle}`, `recompense:${projet}:${cle}`);
    reste -= solde - avant;
  }
  return solde;
}
