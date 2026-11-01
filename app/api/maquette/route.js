import { NextResponse } from "next/server";
import { STYLES, trouver } from "../../../lib/catalogue.js";
import { nettoyerProjet, maquetteSecours } from "../../../lib/moteur.js";
import { iaDisponible, demanderTexte } from "../../../lib/ia.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Retire tout ce qui pourrait charger une ressource externe : la maquette
// est affichée dans une iframe isolée (sandbox="allow-scripts", sans
// allow-same-origin), mais on reste prudent.
function assainir(html) {
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

export async function POST(request) {
  let projet, recap;
  try {
    const corps = await request.json();
    projet = nettoyerProjet(corps?.projet);
    recap = corps?.recap && typeof corps.recap === "object" ? corps.recap : null;
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  if (iaDisponible() && recap) {
    try {
      const style = trouver(STYLES, projet.style) || STYLES[0];
      const html = await demanderTexte({
        effort: "low",
        consignes: `
Tu produis la MAQUETTE CLIQUABLE d'une application, sous forme d'UN SEUL fichier HTML complet.
Contraintes absolues :
- Réponds UNIQUEMENT avec le code HTML, commençant par <!doctype html>, sans explication ni balise markdown.
- Aucune ressource externe : pas de <link>, pas de <script src>, pas d'images distantes, pas de polices web, pas de fetch.
- CSS et JavaScript en ligne. Les images sont des blocs colorés ou des SVG en ligne.
- Navigation entre les écrans par onglets (JavaScript minimal). Les formulaires n'envoient rien : afficher un message "Action simulée".
- Responsive (lisible sur téléphone). Texte en français, contenu d'exemple réaliste (pas de "lorem ipsum").
- Ajoute en haut un bandeau discret : "Maquette Kaizen — aperçu non fonctionnel".
- Style : ${style.label}. Couleur principale : ${projet.couleur || style.couleur}. Police : ${style.police}.
- Maximum 25 000 caractères.`,
        contenu: JSON.stringify({ nom: projet.nom, plateforme: projet.plateforme, recap }, null, 2),
      });
      const propre = assainir(html);
      if (propre.toLowerCase().startsWith("<!doctype html") && propre.length > 500) {
        return NextResponse.json({ html: propre, source: "ia" });
      }
    } catch (e) {
      console.error("Kaizen /maquette IA :", e?.message);
    }
  }
  return NextResponse.json({ html: maquetteSecours(projet, recap), source: "gabarit" });
}
