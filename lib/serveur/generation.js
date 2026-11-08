// Génération du récapitulatif et de la maquette (IA si OPENAI_API_KEY, sinon moteur de règles).
// Utilisé par le parcours client et par l'Espace Server.
import { TYPES, PLATEFORMES, STYLES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "../catalogue.js";
import { estimer, recapitulatifSecours, maquetteSecours } from "../moteur.js";
import { iaDisponible, demanderJSON, demanderTexte, s } from "../ia.js";

const schema = s.obj({
  titre: s.str(),
  resume: s.str(),
  probleme: s.str(),
  utilisateurs: s.arr(s.obj({ role: s.str(), besoin: s.str() })),
  parcours: s.arr(s.str()),
  ecrans: s.arr(s.obj({ nom: s.str(), contenu: s.str() })),
  v1: s.arr(s.str()),
  plusTard: s.arr(s.str()),
  donnees: s.arr(s.str()),
  risques: s.arr(s.str()),
  prochainesEtapes: s.arr(s.str()),
});


export async function genererRecap(projet) {
  const estimation = estimer(projet);
  if (iaDisponible()) {
    try {
      const libelle = (id) => fonctionnalite(id)?.label || id;
      const description = {
        idee: projet.idee,
        nom: projet.nom,
        type: trouver(TYPES, projet.typeId)?.label,
        plateforme: trouver(PLATEFORMES, projet.plateforme)?.label,
        publicCible: projet.publicCible,
        style: trouver(STYLES, projet.style)?.label,
        budget: trouver(BUDGETS, projet.budget)?.label,
        delai: trouver(DELAIS, projet.delai)?.label,
        precisions: projet.precisions,
        priorite: trouver(PRIORITES, projet.priorite)?.label,
        inspirations: projet.inspirations,
        premiereVersionRecommandee: estimation.v1.fonctionnalites.map(libelle),
        plusTardRecommande: estimation.plusTard.map(libelle),
        fonctionnalitesSpecifiques: projet.personnalisees,
      };
      const recap = await demanderJSON({
        nom: "recapitulatif_projet",
        schema,
        effort: "medium",
        consignes: `
Rédige le récapitulatif (cahier des charges simplifié) du projet décrit en JSON.
- titre : le nom de l'application.
- resume : 2 à 3 phrases qui expliquent l'application à quelqu'un qui ne la connaît pas.
- probleme : le problème concret que l'application résout.
- utilisateurs : chaque type d'utilisateur et son besoin principal (2 à 4).
- parcours : le parcours de l'utilisateur principal en 4 à 6 étapes simples.
- ecrans : 4 à 8 écrans de la première version, chacun avec son contenu en une phrase. Le premier écran est "Accueil".
- v1 : reprends "premiereVersionRecommandee" (reformulé simplement) et ajoute les fonctionnalités spécifiques si elles sont indispensables.
- plusTard : reprends "plusTardRecommande" et les fonctionnalités spécifiques non indispensables.
- donnees : les informations que l'application devra enregistrer.
- risques : 2 à 4 points d'attention honnêtes (RGPD, paiement, adoption, etc.).
- prochainesEtapes : 3 à 5 actions concrètes pour la personne.
Ne mentionne aucun prix ni délai.`,
        contenu: JSON.stringify(description, null, 2),
      });
      return { ...recap, source: "ia" };
    } catch (e) {
      console.error("Kaizen /recapitulatif IA :", e?.message);
    }
  }
  return recapitulatifSecours(projet, estimation);
}

// Retire tout ce qui pourrait charger une ressource externe : la maquette
// est affichée dans une iframe isolée (sandbox="allow-scripts", sans
// allow-same-origin), mais on reste prudent.
export function assainir(html) {
  let h = String(html || "");
  h = h.replace(/```(html)?/gi, "");
  const debut = h.toLowerCase().indexOf("<!doctype");
  if (debut > 0) h = h.slice(debut);
  h = h.replace(/<script[^>]+src=[^>]*>\s*<\/script>/gi, "");
  h = h.replace(/<link[^>]*>/gi, "");
  h = h.replace(/<(iframe|object|embed|base|meta\s+http-equiv)[^>]*>/gi, "");
  h = h.replace(/\b(fetch|XMLHttpRequest|WebSocket|navigator\.sendBeacon)\b/g, "void");
  return h.trim();
}


// Tout ce que le client a renseigné dans le parcours, lisible par l'IA.
export function dossierClient(projet, recap) {
  const style = trouver(STYLES, projet.style);
  return {
    nomApplication: projet.nom || recap?.titre || "",
    ideeDuClient: projet.idee,
    typeApplication: trouver(TYPES, projet.typeId)?.label || "",
    plateforme: trouver(PLATEFORMES, projet.plateforme)?.label || "",
    publicVise: projet.publicCible || "",
    fonctionnalitesChoisies: projet.fonctionnalites.map((id) => fonctionnalite(id)?.label || id),
    fonctionnalitesAjouteesParLeClient: projet.personnalisees,
    styleChoisi: style ? `${style.label}${projet.couleur ? ` · couleur ${projet.couleur}` : ""}` : "",
    precisions: projet.precisions || "",
    inspirations: projet.inspirations || "",
    priorite: trouver(PRIORITES, projet.priorite)?.label || "",
    demandesDeModificationPrecedentes: projet.retours,
    recapitulatif: recap,
  };
}

// auteur : "client" (maquette instantanée) ou "server" (Server ajoute son côté visuel, prioritaire).
export async function genererMaquette(projet, recap, { consignes = "", images = [], delai = 270_000, auteur = "client", base = "" } = {}) {
  let raison = iaDisponible() ? "" : "IA non configurée";
  if (iaDisponible() && recap) {
    try {
      const style = trouver(STYLES, projet.style) || STYLES[0];
      const html = await demanderTexte({
        effort: "minimal", // le plus rapide : la génération doit tenir sous la limite de temps de Vercel
        consignes: `
Tu produis la MAQUETTE CLIQUABLE d'une application, sous forme d'UN SEUL fichier HTML complet.
Contraintes absolues :
- Réponds UNIQUEMENT avec le code HTML, commençant par <!doctype html>, sans explication ni balise markdown.
- Aucune ressource externe : pas de <link>, pas de <script src>, pas d'images distantes, pas de polices web, pas de fetch.
- CSS et JavaScript en ligne. Les images sont des blocs colorés ou des SVG en ligne.
- Navigation entre les écrans par onglets (JavaScript minimal). Les formulaires n'envoient rien : afficher un message "Action simulée".
- Responsive (lisible sur téléphone). Texte en français, contenu d'exemple réaliste (pas de "lorem ipsum").
- Ajoute en haut un bandeau discret : "Maquette Kaizen — aperçu non fonctionnel".
${images.length
  ? `- IMAGES DE RÉFÉRENCE FOURNIES = LE MODÈLE PRINCIPAL. Reproduis fidèlement leur style ET leur organisation : thème clair ou sombre, palette, forme et arrondi des cartes, jauges et barres de progression, icônes, barre de navigation (en bas si l'image en a une), typographie, densité, disposition des blocs. Si l'image montre des écrans, reprends des écrans du même genre. Le cahier du client (récapitulatif) sert seulement à remplir le contenu (nom, textes, fonctionnalités). N'utilise aucun autre style.`
  : `- Pas d'image de référence : construis la maquette à partir du CAHIER du client (récapitulatif) : ses écrans, son parcours utilisateur, ses fonctionnalités de première version. Style : ${style.label}. Couleur principale : ${projet.couleur || style.couleur}. Police : ${style.police}.`}
- Utilise TOUT le dossier du client : son idée, chaque fonctionnalité choisie ou ajoutée (chacune doit apparaître dans un écran), le public visé, les précisions et le récapitulatif. Les écrans et les textes d'exemple doivent parler de SON projet.
- Maximum 15 000 caractères : 4 à 6 écrans, code compact.`,
        images,
        delai,
        contenu: `DOSSIER DU CLIENT (tout ce qu'il a renseigné) :\n${JSON.stringify(dossierClient(projet, recap), null, 2)}`
          + (consignes ? (auteur === "server"
            ? `\n\nAMÉLIORATIONS VISUELLES DE SERVER (le maître du jeu) — PRIORITAIRES sur le style et sur tout le reste, en gardant le contenu du dossier client :\n${consignes}`
            : `\n\nConsignes du client pour sa maquette :\n${consignes}`) : "")
          + (base ? `\n\nMAQUETTE ACTUELLE DU CLIENT — pars de celle-ci : garde ses écrans et son contenu, et applique les améliorations demandées :\n${base.slice(0, 16000)}` : "")
          + (images.length ? `\n\n${images.length} image(s) de référence jointe(s) : la maquette doit reprendre leur style (thème, couleurs, cartes, navigation, ambiance), sans copier de logo ni de marque.` : ""),
      });
      const propre = assainir(html);
      if (propre.toLowerCase().startsWith("<!doctype html") && propre.length > 500) {
        return { html: propre, source: "ia" };
      }
      raison = "réponse de l'IA incomplète";
    } catch (e) {
      console.error("Kaizen /maquette IA :", e?.message);
      raison = /timed? ?out|timeout|aborted/i.test(String(e?.message)) ? "l'IA a mis trop de temps à répondre" : "l'IA n'a pas pu répondre";
    }
  }
  return { html: maquetteSecours(projet, recap), source: "gabarit", raison };
}

// Images de référence envoyées par Server (redimensionnées dans le navigateur).
export function validerImagesReference(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((u) => typeof u === "string" && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length <= 1_400_000)
    .slice(0, 3);
}
