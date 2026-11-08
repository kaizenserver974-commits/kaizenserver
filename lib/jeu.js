// Ludification du parcours Kaizen : univers de jeu, avatars, points et badges.
// Chaque étape du parcours devient un niveau de l'univers choisi.

import { nettoyerAvatar } from "./avatar.js";
import { MONDES } from "./mondes.js";

// Univers historiques (anciens projets) ; les nouveaux projets utilisent le monde du personnage (MONDES).
const UNIVERS_HISTORIQUES = [
  {
    id: "aventure",
    nom: "Quête du royaume",
    icone: "🏰",
    couleur: "#f5a524",
    clair: "rgba(245, 165, 36, 0.16)",
    monnaie: "pièces d'or",
    accroche: "Partez en quête pour bâtir le château de votre application.",
    niveaux: ["Le village", "La croisée des chemins", "L'armurerie", "L'atelier du blason", "Le trésor du roi", "La grande bibliothèque", "La forge", "La salle du trône", "Le château"],
    recits: [
      "Bienvenue au village, {pseudo} ! Chaque grande quête commence par une idée. Raconte-moi la tienne.",
      "Te voilà à la croisée des chemins. Quel sentier ton application va-t-elle suivre ?",
      "Bienvenue à l'armurerie ! Choisis les équipements dont ton application aura besoin. Voyage léger : tu pourras revenir.",
      "L'atelier du blason t'attend. Donne un nom et des couleurs à ton royaume.",
      "Le trésor du roi : combien d'or et de temps es-tu prêt à confier à cette quête ?",
      "Les sages de la bibliothèque ont rédigé le grimoire de ton projet. Lis-le bien.",
      "Le forgeron a façonné un premier modèle de ton application. Essaie-le !",
      "Te voilà dans la salle du trône, {pseudo}. Passe commande auprès de Server, le maître du jeu : c'est lui qui fixera le prix de la quête, les délais, et te conseillera !",
      "Ton château se construit, {pseudo}. Server, le maître du jeu, t'envoie ses offres et conseils dans ton espace.",
    ],
  },
  {
    id: "espace",
    nom: "Mission galactique",
    icone: "🚀",
    couleur: "#8b6dff",
    clair: "rgba(139, 109, 255, 0.18)",
    monnaie: "étoiles",
    accroche: "Préparez le décollage de votre application vers les étoiles.",
    niveaux: ["Base de lancement", "Choix de la trajectoire", "Équipement du vaisseau", "Peinture de la coque", "Réserves de carburant", "Journal de bord", "Prototype", "Centre de commandement", "Station orbitale"],
    recits: [
      "Commandant {pseudo}, ici la base de lancement. Décrivez la mission de votre application.",
      "Calcul de trajectoire en cours… Quelle destination choisissez-vous ?",
      "Embarquez seulement les modules indispensables : un vaisseau léger décolle plus vite !",
      "Le vaisseau a besoin d'un nom et de couleurs. À vous de choisir.",
      "Vérifions les réserves : combien de carburant (budget) et de temps pour la mission ?",
      "Le journal de bord de la mission est prêt. Relisez le plan de vol.",
      "Le prototype sort de l'atelier. Faites un premier vol d'essai !",
      "Centre de commandement : confirmez la mission, commandant {pseudo}. Server, le maître du jeu, vous transmettra tarif, délai et conseils de vol !",
      "Bienvenue à la station orbitale, {pseudo}. Server, le maître du jeu, vous guide jusqu'à l'atterrissage depuis votre espace.",
    ],
  },
  {
    id: "enquete",
    nom: "Enquête mystère",
    icone: "🔎",
    couleur: "#34d399",
    clair: "rgba(52, 211, 153, 0.15)",
    monnaie: "indices",
    accroche: "Menez l'enquête pour révéler l'application cachée derrière votre idée.",
    niveaux: ["Le bureau", "La piste", "Les indices", "Le portrait-robot", "Le coffre-fort", "Le dossier", "La reconstitution", "Le commissariat", "L'affaire résolue"],
    recits: [
      "Inspecteur {pseudo}, une nouvelle affaire arrive sur votre bureau. Quelle est l'idée à élucider ?",
      "Une piste se dessine… De quel type d'application s'agit-il vraiment ?",
      "Rassemblez les indices : quelles fonctionnalités sont essentielles à l'affaire ?",
      "Dressez le portrait-robot : nom, ambiance, couleurs.",
      "Ouvrons le coffre-fort : quel budget et quel délai pour boucler l'enquête ?",
      "Le dossier complet est sur la table. Tout concorde ?",
      "Place à la reconstitution : voici à quoi ressemblera l'application.",
      "Direction le commissariat : signez le dossier, inspecteur {pseudo}. Server, le maître du jeu, vous donnera son verdict : tarif, délai et conseils.",
      "Vous tenez l'affaire, {pseudo}. Server, le maître du jeu, vous tient informé dans votre espace jusqu'au dénouement.",
    ],
  },
  {
    id: "ocean",
    nom: "Expédition océan",
    icone: "🌊",
    couleur: "#2ad4ff",
    clair: "rgba(42, 212, 255, 0.15)",
    monnaie: "perles",
    accroche: "Hissez les voiles et naviguez jusqu'à l'île de votre application.",
    niveaux: ["Le port", "La carte marine", "La cargaison", "Les voiles", "La réserve de bord", "Le carnet de bord", "La maquette du navire", "La capitainerie", "L'île au trésor"],
    recits: [
      "Ohé {pseudo} ! Avant de lever l'ancre, raconte-moi l'idée de ton application.",
      "Déplions la carte marine : vers quel type d'application mettons-nous le cap ?",
      "Chargeons la cale avec les fonctionnalités utiles. Un navire trop lourd avance lentement !",
      "Choisissons les voiles : nom, ambiance et couleurs de ton navire.",
      "Faisons le point sur la réserve : budget et durée de la traversée.",
      "Le carnet de bord est rempli. Vérifions la route.",
      "Voici la maquette de ton navire. Monte à bord pour la visiter !",
      "Passons à la capitainerie : commande ton navire, {pseudo}. Server, le maître du jeu, te dira le prix, le délai, et te guidera !",
      "Terre en vue, {pseudo} ! Server, le maître du jeu, te guide jusqu'à l'île au trésor depuis ton espace.",
    ],
  },
];

export const AVATARS = [
  { id: "mage", emoji: "🧙", nom: "Mage" },
  { id: "chevalier", emoji: "🛡️", nom: "Chevalier" },
  { id: "astronaute", emoji: "👩‍🚀", nom: "Astronaute" },
  { id: "robot", emoji: "🤖", nom: "Robot" },
  { id: "detective", emoji: "🕵️", nom: "Détective" },
  { id: "renard", emoji: "🦊", nom: "Renard rusé" },
  { id: "dragon", emoji: "🐉", nom: "Dragon" },
  { id: "sirene", emoji: "🧜", nom: "Sirène" },
  { id: "pirate", emoji: "🏴‍☠️", nom: "Pirate" },
  { id: "heros", emoji: "🦸", nom: "Héros" },
  { id: "chouette", emoji: "🦉", nom: "Chouette sage" },
  { id: "licorne", emoji: "🦄", nom: "Licorne" },
];

export const BADGES = {
  visionnaire: { icone: "💡", nom: "Visionnaire", detail: "Idée analysée" },
  architecte: { icone: "🧱", nom: "Architecte", detail: "Fonctionnalités choisies" },
  original: { icone: "✨", nom: "Esprit original", detail: "Fonctionnalité sur mesure ajoutée" },
  artiste: { icone: "🎨", nom: "Artiste", detail: "Style choisi" },
  stratege: { icone: "♟️", nom: "Stratège", detail: "Budget et délai définis" },
  scribe: { icone: "📜", nom: "Scribe", detail: "Récapitulatif obtenu" },
  createur: { icone: "🖼️", nom: "Créateur", detail: "Maquette générée" },
  batisseur: { icone: "🏗️", nom: "Bâtisseur", detail: "Développement lancé" },
  commande: { icone: "🛒", nom: "Commanditaire", detail: "Application commandée" },
  legende: { icone: "🏆", nom: "Légende", detail: "Application en ligne" },
  kaizen: { icone: "🌱", nom: "Maître Kaizen", detail: "Application en évolution continue" },
};

// Chaque récompense n'est gagnée qu'une seule fois par projet.
// « points » fait monter de niveau ; « pieces » (par défaut = points) remplit la bourse.
// Les actions payées en pièces (maquette, commande) ne rendent pas de pièces : sinon
// le paiement serait annulé par la récompense.
export const RECOMPENSES = {
  idee: { points: 50, badge: "visionnaire" },
  type: { points: 30 },
  fonctionnalites: { points: 40, badge: "architecte" },
  perso: { points: 20, badge: "original" },
  style: { points: 30, badge: "artiste" },
  budget: { points: 40, badge: "stratege" },
  precisions: { points: 20 },
  recap: { points: 60 },
  scribe: { points: 0, badge: "scribe" },
  maquette: { points: 80, pieces: 0, badge: "createur" },
  commande: { points: 120, pieces: 0, badge: "commande" },
  journal: { points: 10 },
  evolution_ajoutee: { points: 20 },
  developpement: { points: 100, badge: "batisseur" },
  mise_en_ligne: { points: 150, badge: "legende" },
  evolution: { points: 50, badge: "kaizen" },
};

export const POINTS_PAR_NIVEAU = 100;

// Pièces d'or gagnées en jouant : somme des récompenses obtenues (calcul aussi valable pour les anciens projets).
export function piecesGagnees(jeu) {
  if (!jeu?.actif) return 0;
  return (jeu.recompenses || []).reduce((total, cle) => {
    const r = RECOMPENSES[cle];
    return total + (r ? (r.pieces ?? r.points) : 0);
  }, 0);
}

export const UNIVERS = [...MONDES, ...UNIVERS_HISTORIQUES];
export { MONDES, universPourPerso } from "./mondes.js";
export const trouverUnivers = (id) => UNIVERS.find((u) => u.id === id) || UNIVERS[0];
export const trouverAvatar = (id) => AVATARS.find((a) => a.id === id) || AVATARS[0];

export function niveau(points = 0) {
  return {
    numero: Math.floor(points / POINTS_PAR_NIVEAU) + 1,
    progression: (points % POINTS_PAR_NIVEAU) / POINTS_PAR_NIVEAU,
    restant: POINTS_PAR_NIVEAU - (points % POINTS_PAR_NIVEAU),
  };
}

// L'avatar est une configuration illustrée (voir lib/avatar.js).
// Les anciens projets gardent leur avatar emoji (identifiant texte).
export function nouveauJeu({ univers, avatar, pseudo }) {
  return {
    actif: true,
    univers: trouverUnivers(univers).id,
    avatar: typeof avatar === "string" ? trouverAvatar(avatar).id : nettoyerAvatar(avatar),
    pseudo: String(pseudo || "").trim().slice(0, 30) || "Joueur",
    points: 0,
    badges: [],
    recompenses: [],
  };
}

// Applique des récompenses au jeu. Retourne le nouvel état et ce qui vient
// d'être gagné (pour l'animation). Sans jeu actif, ne change rien.
export function recompenser(jeu, cles) {
  if (!jeu?.actif) return { jeu, gains: null };
  const deja = new Set(jeu.recompenses || []);
  let points = 0;
  let pieces = 0;
  const badges = [];
  for (const cle of cles) {
    const r = RECOMPENSES[cle];
    if (!r || deja.has(cle)) continue;
    deja.add(cle);
    points += r.points;
    pieces += r.pieces ?? r.points;
    if (r.badge && !(jeu.badges || []).includes(r.badge)) badges.push(r.badge);
  }
  if (points === 0 && badges.length === 0) return { jeu, gains: null };
  const avant = niveau(jeu.points).numero;
  const suivant = {
    ...jeu,
    points: (jeu.points || 0) + points,
    badges: [...(jeu.badges || []), ...badges],
    recompenses: [...deja],
  };
  return { jeu: suivant, gains: { points, pieces, badges, niveauAtteint: niveau(suivant.points).numero > avant ? niveau(suivant.points).numero : null } };
}

export function recit(jeu, etape) {
  const u = trouverUnivers(jeu?.univers);
  return (u.recits[etape] || "").replaceAll("{pseudo}", jeu?.pseudo || "aventurier");
}
