// Pièces d'or : gagnées dans le jeu, dépensées pour demander une modification
// de maquette, rechargeables par paiement (Mollie).

export const COUT_MODIFICATION = 60;
export const COUT_COMMANDE = 140; // envoyer la commande
export const COUT_MAQUETTE = 140; // maquette instantanée créée par Kaizen (IA)
export const COUT_GENIE = 250; // maquette sur mesure demandée au génie Server
export const BONUS_CLASSIQUE = 60; // en mode classique (sans jeu), solde de départ

// Packs de recharge (modifiables ici).
export const PACKS = [
  { id: "p30", pieces: 30, prix: 2.99 },
  { id: "p60", pieces: 60, prix: 3.99 },
  { id: "p80", pieces: 80, prix: 4.99 },
];

export const trouverPack = (id) => PACKS.find((p) => p.id === id) || null;

const compte = (projet) => ({ achete: 0, depense: 0, ...(projet?.pieces || {}) });

// Solde = pièces gagnées dans le jeu (ou bonus en mode classique) + achetées − dépensées.
export function solde(projet) {
  const c = compte(projet);
  const gagnees = projet?.jeu?.actif ? Number(projet.jeu.points || 0) : BONUS_CLASSIQUE;
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
