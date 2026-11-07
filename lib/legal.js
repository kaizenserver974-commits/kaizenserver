// Informations légales de KaizenServer.
// ⚠️ À COMPLÉTER par Server : chaque valeur vide s'affiche « [à compléter] »
// sur le site. Mollie vérifie ces pages avant d'activer les paiements réels.
export const LEGAL = {
  nomCommercial: "KaizenServer",
  structure: "La Yonne Finance",
  formeJuridique: "SAS",
  capital: "1 000 €",
  siren: "939 030 060",
  siret: "",              // facultatif : n° SIRET du siège (14 chiffres)
  rcs: "RCS Saint-Denis",
  adresse: "",            // adresse du siège social
  email: "contact@kaizenserver.fr",
  telephone: "",
  responsablePublication: "", // en général le/la Président(e) de la SAS
  tva: "",                // n° de TVA intracommunautaire (FR…) ou « TVA non applicable, art. 293 B du CGI » si franchise
  mediateur: "",          // médiateur de la consommation (obligatoire si vous vendez à des particuliers)
  hebergeur: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
  majLe: "7 novembre 2026",
};

export const v = (valeur) => valeur || "[à compléter]";
