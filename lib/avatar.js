// Avatar illustré en SVG, entièrement personnalisable (aucune image externe).
// La configuration est un petit objet enregistré avec le projet.

// Personnages illustrés de KaizenServer (images dans public/personnages).
export const PERSONNAGES = [
  { id: "kai", nom: "Kai", genre: "Garçon", couleur: "#2ad4ff", portrait: "/personnages/kai.webp", buste: "/personnages/kai-buste.webp" },
  { id: "mia", nom: "Mia", genre: "Fille", couleur: "#d946ef", portrait: "/personnages/mia.webp", buste: "/personnages/mia-buste.webp" },
  { id: "bip", nom: "Bip", genre: "Robot", couleur: "#7b5cff", portrait: "/personnages/bip.webp", buste: "/personnages/bip-buste.webp" },
];

export const trouverPersonnage = (id) => PERSONNAGES.find((p) => p.id === id) || PERSONNAGES[0];

export const OPTIONS_AVATAR = {
  forme: [
    { id: "humain", label: "Personnage" },
    { id: "robot", label: "Robot" },
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
  { nom: "Bip", config: { forme: "robot", peau: "#f1c27d", coiffure: "rase", cheveux: "#2ad4ff", tenue: "#2ad4ff", yeux: "#2ad4ff", accessoire: "aucun" } },
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

