// Stockage des projets dans le navigateur (V1, sans compte).
// Prochaine étape prévue : synchronisation Supabase pour retrouver ses
// projets sur tous ses appareils et permettre le suivi par l'équipe Kaizen.

const CLE = "kaizen.projets.v1";

function lire() {
  try {
    const brut = window.localStorage.getItem(CLE);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

function ecrire(liste) {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(liste));
    return true;
  } catch {
    return false; // stockage plein ou bloqué : l'app continue en mémoire
  }
}

export function listerProjets() {
  return lire().sort((a, b) => String(b.majLe).localeCompare(String(a.majLe)));
}

export function chargerProjet(id) {
  return lire().find((p) => p.id === id) || null;
}

export function enregistrerProjet(projet) {
  const liste = lire();
  const maj = { ...projet, majLe: new Date().toISOString() };
  const i = liste.findIndex((p) => p.id === projet.id);
  if (i >= 0) liste[i] = maj; else liste.push(maj);
  ecrire(liste);
  return maj;
}

export function supprimerProjet(id) {
  ecrire(lire().filter((p) => p.id !== id));
}

export function nouveauProjet() {
  const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const maintenant = new Date().toISOString();
  return {
    id,
    creeLe: maintenant,
    majLe: maintenant,
    etape: 0,
    statut: "idee",
    idee: "",
    nom: "",
    typeId: "",
    plateforme: "web",
    fonctionnalites: [],
    personnalisees: [],
    publicCible: "",
    style: "sobre",
    couleur: "",
    budget: "",
    delai: "",
    precisions: "",
    priorite: "moyenne",
    inspirations: "",
    analyse: null,
    recap: null,
    estimation: null,
    maquette: null,
    jeu: null, // choisi au premier écran : { actif, univers, avatar, pseudo, points, badges, recompenses }
    journal: [{ date: maintenant, texte: "Projet créé" }],
  };
}
