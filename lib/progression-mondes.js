// Mondes débloqués sur cet appareil.
// Le premier monde est celui du premier personnage choisi. Chaque projet mené
// jusqu'à la commande (lieu « Suivi » atteint) débloque le monde d'un autre personnage.
import { listerProjets } from "./stockage.js";
import { universPourPerso, MONDES } from "./mondes.js";

const CLE = "kaizen.mondes.v1";

function lire() {
  let etat = { debloques: [], credits: 0, termines: [] };
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE) || "null");
    if (brut && typeof brut === "object") {
      etat = {
        debloques: Array.isArray(brut.debloques) ? brut.debloques : [],
        credits: Number.isInteger(brut.credits) && brut.credits > 0 ? brut.credits : 0,
        termines: Array.isArray(brut.termines) ? brut.termines : [],
      };
    }
  } catch { /* stockage indisponible */ }
  // Les mondes déjà utilisés par des projets existants restent ouverts.
  for (const p of listerProjets()) {
    const u = p.jeu?.actif && p.jeu.univers;
    if (u && MONDES.some((m) => m.id === u) && !etat.debloques.includes(u)) etat.debloques.push(u);
  }
  return etat;
}

function ecrire(etat) {
  try { window.localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage indisponible */ }
}

export function etatMondes() {
  return lire();
}

// Peut-on jouer avec ce personnage ? Oui si son monde est ouvert, si c'est le
// tout premier choix, ou s'il reste un nouveau monde à débloquer.
export function peutChoisir(etat, perso) {
  const id = universPourPerso(perso).id;
  return etat.debloques.includes(id) || etat.debloques.length === 0 || etat.credits > 0;
}

export const estOuvert = (etat, perso) => etat.debloques.includes(universPourPerso(perso).id);

// Appelé quand le joueur commence l'aventure avec ce personnage.
export function ouvrirMonde(perso) {
  const etat = lire();
  const id = universPourPerso(perso).id;
  if (etat.debloques.includes(id)) return etat;
  if (etat.debloques.length > 0) {
    if (etat.credits <= 0) return etat;
    etat.credits -= 1;
  }
  etat.debloques.push(id);
  ecrire(etat);
  return etat;
}

// Appelé quand un projet atteint le suivi : un nouveau monde à débloquer (une fois par projet).
export function recompenserProjetTermine(projetId) {
  const etat = lire();
  if (etat.termines.includes(projetId)) return false;
  etat.termines.push(projetId);
  if (etat.debloques.length < MONDES.length) etat.credits += 1;
  ecrire(etat);
  return etat.debloques.length + etat.credits <= MONDES.length;
}
