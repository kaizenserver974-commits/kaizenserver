// Pièces d'or : gagnées dans le jeu, dépensées pour demander une modification
// de maquette, rechargeables par paiement (Mollie).
import { piecesGagnees } from "./jeu.js";

export const COUT_MODIFICATION = 60;
export const COUT_COMMANDE = 140; // envoyer la commande
export const COUT_MAQUETTE = 140; // maquette instantanée créée par Kaizen (IA)
// Maquette par l'IA lancée par le client : désactivée, seul Server crée les maquettes (true pour réactiver).
export const MAQUETTE_IA_CLIENT = false;
export const COUT_MODIF_SERVER = 30;
export const COUT_ANNULATION = 10; // annuler sa demande coûte 10 pièces d'or // demande de modification de la maquette envoyée à Server
export const COUT_GENIE = 250; // maquette sur mesure demandée au génie Server
export const BONUS_CLASSIQUE = 60; // ancien solde de départ du mode classique (projets locaux)
export const BONUS_BIENVENUE = 0; // pas de bonus séparé : les étapes du jeu donnent 330 pièces par projet
export const PLAFOND_GRATUIT_JOUR = 1000; // pièces offertes (étapes du jeu) par compte, une seule fois : 3 projets × 330 ; ensuite on achète
// Comptes de test sans limite de pièces offertes (en plus de Server / KAIZEN_ADMIN_EMAILS). Autres adresses possibles
// dans Vercel : KAIZEN_SANS_PLAFOND (adresses séparées par des virgules).
export const COMPTES_SANS_PLAFOND = ["portail.mcssud@gmail.com"];
export function sansPlafond(email, admin = false, liste = "") {
  const e = String(email || "").trim().toLowerCase();
  return Boolean(admin) || COMPTES_SANS_PLAFOND.includes(e) || String(liste || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(e);
}

// Packs de pièces d'or (modifiables ici : nombre de pièces et prix TTC en euros).
// Le bonus affiché (« +X % ») est calculé par rapport au premier pack.
export const PACKS = [
  { id: "o100", pieces: 100, prix: 2.49 },
  { id: "o265", pieces: 265, prix: 5.99 },
  { id: "o580", pieces: 580, prix: 11.99 },
  { id: "o1260", pieces: 1260, prix: 23.99 },
  { id: "o3350", pieces: 3350, prix: 47.99 },
  { id: "o7450", pieces: 7450, prix: 119.99 },
];

// Bonus de chaque pack par rapport au prix de base (pièces par euro du premier pack).
export function bonusPack(pack) {
  const base = PACKS[0].pieces / PACKS[0].prix;
  return Math.round(((pack.pieces / pack.prix) / base - 1) * 100);
}
export const meilleurPack = () => PACKS.reduce((a, b) => (b.pieces / b.prix > a.pieces / a.prix ? b : a));

export const trouverPack = (id) => PACKS.find((p) => p.id === id) || null;

const compte = (projet) => ({ achete: 0, depense: 0, ...(projet?.pieces || {}) });

// Solde = pièces gagnées dans le jeu (ou bonus en mode classique) + achetées − dépensées.
export function solde(projet) {
  const c = compte(projet);
  const gagnees = projet?.jeu?.actif ? piecesGagnees(projet.jeu) : BONUS_CLASSIQUE;
  return Math.max(0, gagnees + c.achete - c.depense);
}

export function debiter(projet, n = COUT_MODIFICATION) {
  if (solde(projet) < n) return null;
  const c = compte(projet);
  return { ...c, depense: c.depense + n };
}

export function crediter(projet, n) {
  const c = compte(projet);
  return { ...c, achete: c.achete + Math.max(0, Math.round(n)) };
}

export const prixTexte = (p) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(p);
