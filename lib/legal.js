// Informations légales de KaizenServer.
// ⚠️ À COMPLÉTER par Server : chaque valeur vide s'affiche « [à compléter] »
// sur le site. Mollie vérifie ces pages avant d'activer les paiements réels.
export const LEGAL = {
  nomCommercial: "KaizenServer",
  structure: "",          // ex. « Association L'Union, le renouveau… » ou « Nelsy Kondoki, entrepreneur individuel »
  formeJuridique: "",     // ex. « Association loi 1901 », « Micro-entreprise »
  siret: "",              // n° SIRET (ou RNA pour une association)
  adresse: "",            // adresse postale complète
  email: "contact@kaizenserver.fr",
  telephone: "",
  responsablePublication: "",
  tva: "",                // ex. « TVA non applicable, art. 293 B du CGI » (micro-entreprise / association)
  mediateur: "",          // médiateur de la consommation (obligatoire si vous vendez à des particuliers)
  hebergeur: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
  majLe: "7 novembre 2026",
};

export const v = (valeur) => valeur || "[à compléter]";
