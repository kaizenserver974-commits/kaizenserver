// Avatar illustré en SVG, entièrement personnalisable (aucune image externe).
// La configuration est un petit objet enregistré avec le projet.

// Personnages illustrés de KaizenServer (images dans public/personnages).
// Champs facultatifs pour la vitrine (personnage affiché en grand) :
// - « pied » : image détourée (fond transparent), idéalement en entier de la tête aux pieds ;
// - « monde » : image complète avec son décor (affichée si pas de vidéo) ;
// - « video » : animation en boucle (ex. "/personnages/nala.mp4" + V), prioritaire sur l'image.
// À augmenter quand une image ou vidéo de personnage est remplacée (vide le cache du navigateur).
const V = "?v=20";

// paroles : vidéos où le personnage dit la phrase d'une étape (clé = numéro d'étape, de 1 à 9).
export const PERSONNAGES = [
  { id: "kai", nom: "Kai", genre: "Garçon", couleur: "#2ad4ff", portrait: "/personnages/kai.webp" + V, buste: "/personnages/kai-buste.webp" + V, monde: "/personnages/kai-monde.webp" + V, fond: "/personnages/kai-decor.webp" + V, fondVide: "/personnages/kai-monde-vide.webp" + V, video: "/personnages/kai.mp4" + V, affiche: "/personnages/kai-poster.webp" + V, decor: true, son: "/sons/kai.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/kai-${n}.mp4${V}`])) },
  { id: "mia", nom: "Mia", genre: "Fille", couleur: "#d946ef", portrait: "/personnages/mia.webp" + V, buste: "/personnages/mia-buste.webp" + V, monde: "/personnages/mia-monde.webp" + V, fond: "/personnages/mia-decor.webp" + V, video: "/personnages/mia.mp4" + V, affiche: "/personnages/mia-poster.webp" + V, decor: true, son: "/sons/mia.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/mia-${n}.mp4${V}`])) },
  { id: "leo", nom: "Léo", genre: "Garçon", couleur: "#2ad4ff", portrait: "/personnages/leo.webp" + V, buste: "/personnages/leo-buste.webp" + V, monde: "/personnages/leo-monde.webp" + V, fond: "/personnages/leo-decor.webp" + V, video: "/personnages/leo.mp4" + V, affiche: "/personnages/leo-poster.webp" + V, decor: true, son: "/sons/leo.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/leo-${n}.mp4${V}`])) },
  { id: "malik", nom: "Malik", genre: "Garçon", couleur: "#3b82f6", portrait: "/personnages/malik.webp" + V, buste: "/personnages/malik-buste.webp" + V, monde: "/personnages/malik-monde.webp" + V, fond: "/personnages/malik-decor.webp" + V, video: "/personnages/malik.mp4" + V, affiche: "/personnages/malik-poster.webp" + V, decor: true, son: "/sons/malik.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/malik-${n}.mp4${V}`])) },
  { id: "teo", nom: "Téo", genre: "Garçon", couleur: "#8b5cf6", portrait: "/personnages/teo.webp" + V, buste: "/personnages/teo-buste.webp" + V, monde: "/personnages/teo-monde.webp" + V, fond: "/personnages/teo-decor.webp" + V, video: "/personnages/teo.mp4" + V, affiche: "/personnages/teo-poster.webp" + V, decor: true, son: "/sons/teo.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/teo-${n}.mp4${V}`])) },
  { id: "axel", nom: "Axel", genre: "Garçon", couleur: "#60a5fa", portrait: "/personnages/axel.webp" + V, buste: "/personnages/axel-buste.webp" + V, monde: "/personnages/axel-monde.webp" + V, fond: "/personnages/axel-decor.webp" + V, video: "/personnages/axel.mp4" + V, affiche: "/personnages/axel-poster.webp" + V, decor: true, son: "/sons/axel.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/axel-${n}.mp4${V}`])) },
  { id: "jade", nom: "Jade", genre: "Fille", couleur: "#3b82f6", portrait: "/personnages/jade.webp" + V, buste: "/personnages/jade-buste.webp" + V, monde: "/personnages/jade-monde.webp" + V, fond: "/personnages/jade-decor.webp" + V, video: "/personnages/jade.mp4" + V, affiche: "/personnages/jade-poster.webp" + V, decor: true, son: "/sons/jade.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/jade-${n}.mp4${V}`])) },
  { id: "nala", nom: "Nala", genre: "Fille", couleur: "#a855f7", portrait: "/personnages/nala.webp" + V, buste: "/personnages/nala-buste.webp" + V, monde: "/personnages/nala-monde.webp" + V, fond: "/personnages/nala-decor.webp" + V, video: "/personnages/nala.mp4" + V, affiche: "/personnages/nala-poster.webp" + V, decor: true, son: "/sons/nala.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/nala-${n}.mp4${V}`])) },
  { id: "lou", nom: "Lou", genre: "Fille", couleur: "#60a5fa", portrait: "/personnages/lou.webp" + V, buste: "/personnages/lou-buste.webp" + V, monde: "/personnages/lou-monde.webp" + V, fond: "/personnages/lou-decor.webp" + V, video: "/personnages/lou.mp4" + V, affiche: "/personnages/lou-poster.webp" + V, decor: true, son: "/sons/lou.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, `/personnages/paroles/lou-${n}.mp4${V}`])) },
  { id: "yuna", nom: "Yuna", genre: "Fille", couleur: "#d946ef", portrait: "/personnages/yuna.webp" + V, buste: "/personnages/yuna-buste.webp" + V, monde: "/personnages/yuna-monde.webp" + V, fond: "/personnages/yuna-decor.webp" + V, video: "/personnages/yuna.mp4" + V, affiche: "/personnages/yuna-poster.webp" + V, decor: true, son: "/sons/yuna.mp3" + V, paroles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [n, `/personnages/paroles/yuna-${n}.mp4${V}`])) },
];

export const trouverPersonnage = (id) => PERSONNAGES.find((p) => p.id === id) || PERSONNAGES[0];

export const OPTIONS_AVATAR = {
  forme: [
    { id: "humain", label: "Personnage" },
  ],
  peau: ["#ffdbc4", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"],
  coiffure: [
    { id: "pics", label: "Pics" },
    { id: "court", label: "Court" },
    { id: "long", label: "Long" },
    { id: "queue", label: "Queue" },
    { id: "boucles", label: "Boucles" },
    { id: "chignon", label: "Chignon" },
    { id: "rase", label: "Rasé" },
  ],
  cheveux: ["#1b1b2f", "#4a2c1a", "#a0522d", "#e8c26a", "#e94e77", "#7b5cff", "#2ad4ff", "#f2f2f2"],
  tenue: ["#7b5cff", "#2ad4ff", "#ff4fd8", "#22c55e", "#f59e0b", "#1e293b"],
  yeux: ["#3b82f6", "#22c55e", "#8b5a2b", "#a855f7", "#111827"],
  accessoire: [
    { id: "aucun", label: "Aucun" },
    { id: "lunettes", label: "Lunettes" },
    { id: "casque", label: "Casque audio" },
    { id: "visiere", label: "Visière néon" },
  ],
};

export const AVATAR_DEFAUT = {
  forme: "humain", peau: "#f1c27d", coiffure: "pics", cheveux: "#1b1b2f",
  tenue: "#7b5cff", yeux: "#3b82f6", accessoire: "aucun",
};

export const PRESETS_AVATAR = [
  { nom: "Kai", config: { ...AVATAR_DEFAUT } },
  { nom: "Mia", config: { forme: "humain", peau: "#e0ac69", coiffure: "queue", cheveux: "#7b5cff", tenue: "#ff4fd8", yeux: "#a855f7", accessoire: "casque" } },
  { nom: "Noa", config: { forme: "humain", peau: "#8d5524", coiffure: "boucles", cheveux: "#1b1b2f", tenue: "#2ad4ff", yeux: "#8b5a2b", accessoire: "lunettes" } },
  { nom: "Léa", config: { forme: "humain", peau: "#ffdbc4", coiffure: "long", cheveux: "#e8c26a", tenue: "#22c55e", yeux: "#22c55e", accessoire: "aucun" } },
];

const valide = (liste, v, defaut) => (liste.some((x) => (x.id ?? x) === v) ? v : defaut);

export function nettoyerAvatar(c) {
  if (!c || typeof c !== "object") return { ...AVATAR_DEFAUT };
  if (c.forme === "illustre") return { forme: "illustre", perso: trouverPersonnage(c.perso).id };
  const o = OPTIONS_AVATAR;
  return {
    forme: valide(o.forme, c.forme, AVATAR_DEFAUT.forme),
    peau: valide(o.peau, c.peau, AVATAR_DEFAUT.peau),
    coiffure: valide(o.coiffure, c.coiffure, AVATAR_DEFAUT.coiffure),
    cheveux: valide(o.cheveux, c.cheveux, AVATAR_DEFAUT.cheveux),
    tenue: valide(o.tenue, c.tenue, AVATAR_DEFAUT.tenue),
    yeux: valide(o.yeux, c.yeux, AVATAR_DEFAUT.yeux),
    accessoire: valide(o.accessoire, c.accessoire, AVATAR_DEFAUT.accessoire),
  };
}

