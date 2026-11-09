// Génération du récapitulatif et de la maquette (IA si OPENAI_API_KEY, sinon moteur de règles).
// Utilisé par le parcours client et par l'Espace Server.
import { TYPES, PLATEFORMES, STYLES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "../catalogue.js";
import { estimer, recapitulatifSecours, maquetteSecours } from "../moteur.js";
import { iaDisponible, demanderJSON, demanderTexte, s, MODELE, MODELE_MAQUETTE } from "../ia.js";

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
export async function genererMaquette(projet, recap, { consignes = "", images = [], delai = 270_000, auteur = "client", base = "", photos = [], demandes = [] } = {}) {
  let raison = iaDisponible() ? "" : "IA non configurée";
  const debut = Date.now();
  // Demandes explicites du client, numérotées : placées EN TÊTE et vérifiées après coup.
  const liste = demandes.map((d) => String(d).trim()).filter((d) => d.length > 2).slice(0, 12);
  const blocDemandes = liste.length
    ? `CE QUE LE CLIENT DEMANDE — OBLIGATOIRE, chaque point doit être VISIBLE dans la maquette :\n${liste.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\n`
    : "";
  if (iaDisponible() && recap) {
    try {
      const style = trouver(STYLES, projet.style) || STYLES[0];
      const pourServer = auteur === "server";
      // Server : modèle plus puissant (fidélité aux images, finition). Client : modèle rapide.
      const modele = pourServer ? MODELE_MAQUETTE() : MODELE();
      // 1) Les images sont d'abord ANALYSÉES en une charte précise (couleurs exactes, cartes, navigation…).
      //    Sans cette étape, l'IA « oublie » les images en écrivant un long code.
      const charte = images.length ? await analyserImages(images, modele).catch((e) => { console.error("Kaizen charte images :", e?.message); return null; }) : null;
      const reste = () => Math.max(40_000, delai - (Date.now() - debut) - 5_000);
      const appel = (m) => demanderTexte({
        modele: m,
        effort: "low", // plus attentif aux demandes (la fonction dispose de 300 s)
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
${photos.length ? `- PHOTOS DU CLIENT À PLACER DANS LA MAQUETTE (obligatoire) : ${photos.length} photo(s), nommées ${photos.map((_, i) => `IMAGE_${i + 1}`).join(", ")}. Utilise ces noms EXACTEMENT comme adresse d'image, par exemple <img src="IMAGE_1" alt="..."> ou style="background-image:url(IMAGE_1);background-size:cover" (pour une image en arrière-plan). Place-les là où le client le demande ; sinon en image principale de l'accueil et en fond de cartes. Ce sont les SEULES images autorisées en plus des SVG.` : ""}
${base && images.length
  ? "- REFONTE VISUELLE : tu reçois la maquette actuelle UNIQUEMENT pour son contenu (écrans, textes, données d'exemple). Son apparence doit être ENTIÈREMENT refaite d'après les images de référence et la charte visuelle : nouvelle palette, nouveau fond, nouvelles cartes, nouvelle navigation, nouvelle typographie. Si le résultat ressemble encore à l'ancienne maquette, c'est un échec."
  : base ? "- MODIFICATION : tu reçois la maquette actuelle. Garde TOUT ce qui n'est pas concerné par la demande (écrans, textes, couleurs, navigation) et applique précisément chaque point demandé. Ne refais pas une maquette différente." : ""}
${pourServer ? "- QUALITÉ ATTENDUE PAR SERVER : une version NETTEMENT plus aboutie, du niveau d'une vraie application publiée sur l'App Store : hiérarchie claire, espacements généreux, cartes soignées (ombres, dégradés, arrondis), icônes SVG cohérentes, jauges et graphiques en SVG, données d'exemple réalistes, petits détails (badges, avatars, états actifs). Pas d'écran vide ni de bloc gris générique." : ""}
${liste.length ? "- PRIORITÉ N°1 : la liste « CE QUE LE CLIENT DEMANDE ». Chaque point doit être réalisé de façon visible (dans l'écran concerné, ou sur l'accueil s'il ne précise pas). Ces demandes passent avant le style et avant le récapitulatif. Avant de répondre, vérifie mentalement chaque point." : ""}
- Maximum ${pourServer ? "24 000" : "18 000"} caractères (hors photos) : 4 à 6 écrans, code compact.`,
        images,
        delai: reste(),
        contenu: blocDemandes
          + (charte ? `CHARTE VISUELLE EXTRAITE DES IMAGES DE RÉFÉRENCE — À APPLIQUER EXACTEMENT (mêmes couleurs hexadécimales, même fond, mêmes cartes, même navigation, même ambiance) :\n${JSON.stringify(charte, null, 2)}\n\n` : "")
          + `DOSSIER DU CLIENT (tout ce qu'il a renseigné) :\n${JSON.stringify(dossierClient(projet, recap), null, 2)}`
          + (consignes ? (auteur === "server"
            ? `\n\nAMÉLIORATIONS VISUELLES DE SERVER (le maître du jeu) — PRIORITAIRES sur le style et sur tout le reste, en gardant le contenu du dossier client :\n${consignes}`
            : `\n\nConsignes du client pour sa maquette :\n${consignes}`) : "")
          + (base ? (images.length
            ? `\n\nMAQUETTE ACTUELLE (pour le CONTENU seulement — son apparence doit disparaître au profit du style des images) :\n${preparerBase(base, photos)}`
            : `\n\nMAQUETTE ACTUELLE DU CLIENT — pars de celle-ci : garde ses écrans et son contenu, et applique les améliorations demandées :\n${preparerBase(base, photos)}`) : "")
          + (images.length ? `\n\n${images.length} image(s) de référence jointe(s) : la maquette doit leur RESSEMBLER au premier coup d'œil (thème, couleurs, cartes, navigation, ambiance), sans copier de logo ni de marque.` : "")
          + (liste.length ? `\n\nRAPPEL — à réaliser obligatoirement :\n${liste.map((d, i) => `${i + 1}. ${d}`).join("\n")}` : ""),
      });
      let html;
      try {
        html = await appel(modele);
      } catch (e) {
        // Modèle puissant indisponible sur le compte OpenAI : on reprend avec le modèle habituel.
        if (modele === MODELE() || /timed? ?out|timeout|aborted/i.test(String(e?.message))) throw e;
        console.error(`Kaizen maquette : modèle ${modele} indisponible (${e?.message}), repli sur ${MODELE()}`);
        html = await appel(MODELE());
      }
      let propre = assainir(html);
      // Vérification : chaque demande est-elle bien visible ? Sinon, une passe de correction.
      if (liste.length && propre.toLowerCase().startsWith("<!doctype html") && Date.now() - debut < 130_000) {
        const manquants = await demandesManquantes(propre, liste).catch(() => []);
        if (manquants.length && Date.now() - debut < 140_000) {
          const corrige = await demanderTexte({
            modele,
            effort: "low",
            delai: Math.max(30_000, delai - (Date.now() - debut) - 5_000),
            consignes: `Tu corriges une MAQUETTE HTML. Réponds UNIQUEMENT avec le fichier HTML complet corrigé, commençant par <!doctype html>. Garde tout le reste à l'identique (écrans, styles, navigation) et réalise de façon VISIBLE chacun des points manquants. Aucune ressource externe.${photos.length ? ` Les photos s'appellent ${photos.map((_, i) => `IMAGE_${i + 1}`).join(", ")} (à utiliser comme adresse d'image).` : ""}`,
            contenu: `POINTS MANQUANTS À RÉALISER :\n${manquants.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nMAQUETTE À CORRIGER :\n${preparerBase(propre, photos)}`,
          }).catch(() => "");
          const propre2 = assainir(corrige);
          if (propre2.toLowerCase().startsWith("<!doctype html") && propre2.length > 500) propre = propre2;
        }
      }
      // Les photos du client sont insérées ici (l'IA n'écrit que leurs noms IMAGE_1, IMAGE_2…).
      photos.forEach((url, i) => { propre = propre.replace(new RegExp(`IMAGE_${i + 1}(?![0-9])`, "g"), url); });
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

// Photos du client à insérer dans la maquette (data URL d'image, déjà réduites par le navigateur).
export function validerPhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((u) => typeof u === "string" && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length <= 400_000)
    .slice(0, 4);
}

// Maquette actuelle envoyée comme base d'une modification : les photos déjà insérées
// redeviennent leurs noms (IMAGE_1…) pour ne pas alourdir la demande.
export function preparerBase(html, photos) {
  let h = String(html || "");
  photos.forEach((url, i) => { h = h.split(url).join(`IMAGE_${i + 1}`); });
  h = h.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]{200,}/g, "IMAGE_X");
  return h.slice(0, 30000);
}

// Lit les images de référence et en tire une charte visuelle précise, que la génération applique ensuite.
async function analyserImages(images, modele) {
  try {
    return await chartePar(images, modele);
  } catch (e) {
    if (modele === MODELE() || /timed? ?out|timeout|aborted/i.test(String(e?.message))) throw e;
    return chartePar(images, MODELE()); // modèle puissant indisponible : modèle habituel
  }
}
function chartePar(images, modele) {
  return demanderJSON({
    modele,
    effort: "low",
    delai: 70_000,
    nom: "charte_visuelle",
    consignes: "Tu es directeur artistique. Observe attentivement les images de référence (captures d'applications) et décris leur design avec précision, pour qu'un intégrateur le reproduise fidèlement en HTML/CSS. Donne les couleurs en hexadécimal, au plus près de ce que tu vois. Décris ce qui est visible, n'invente pas.",
    contenu: "Décris le design de ces images de référence.",
    images,
    schema: s.obj({
      theme: s.str(),
      fond: s.str(),
      palette: s.arr(s.obj({ role: s.str(), hex: s.str() })),
      typographie: s.str(),
      cartes: s.str(),
      navigation: s.str(),
      composants: s.arr(s.str()),
      disposition: s.arr(s.obj({ ecran: s.str(), organisation: s.str() })),
      iconesEtImages: s.str(),
      ambiance: s.str(),
      detailsMarquants: s.arr(s.str()),
    }),
  });
}

// Demande à l'IA quelles demandes du client ne sont PAS visibles dans la maquette.
async function demandesManquantes(html, liste) {
  const r = await demanderJSON({
    effort: "minimal",
    nom: "verification_maquette",
    consignes: "Tu vérifies une maquette HTML. Pour chaque demande numérotée du client, dis si elle est réellement visible dans la maquette (texte, élément, image, couleur…). Sois strict.",
    contenu: `DEMANDES :\n${liste.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nMAQUETTE :\n${html.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, "IMAGE").slice(0, 30000)}`,
    schema: s.obj({ manquantes: s.arr(s.str()) }),
  });
  return Array.isArray(r?.manquantes) ? r.manquantes.slice(0, 8) : [];
}
