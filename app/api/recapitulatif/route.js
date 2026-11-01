import { NextResponse } from "next/server";
import { TYPES, PLATEFORMES, STYLES, BUDGETS, DELAIS, PRIORITES, trouver, fonctionnalite } from "../../../lib/catalogue.js";
import { nettoyerProjet, estimer, recapitulatifSecours } from "../../../lib/moteur.js";
import { iaDisponible, demanderJSON, s } from "../../../lib/ia.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(request) {
  let projet;
  try {
    projet = nettoyerProjet((await request.json())?.projet);
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

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
      return NextResponse.json({ recap: { ...recap, source: "ia" } });
    } catch (e) {
      console.error("Kaizen /recapitulatif IA :", e?.message);
    }
  }
  // Les tarifs et délais sont donnés par Server (maître du jeu) : aucune estimation n'est envoyée au client.
  return NextResponse.json({ recap: recapitulatifSecours(projet, estimation) });
}
