import { NextResponse } from "next/server";
import { nettoyerProjet } from "../../../lib/moteur.js";
import { genererMaquette, validerImagesReference } from "../../../lib/serveur/generation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  let projet, recap, retour, consignesClient, images;
  try {
    const corps = await request.json();
    projet = nettoyerProjet(corps?.projet);
    recap = corps?.recap && typeof corps.recap === "object" ? corps.recap : null;
    retour = String(corps?.retour || "").trim().slice(0, 1000);
    consignesClient = String(corps?.consignes || "").trim().slice(0, 1000);
    // Images de référence ajoutées par le client à l'étape précédente (3 au plus).
    images = validerImagesReference(corps?.images);
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  // Même IA et mêmes possibilités que Server : consignes + images de référence.
  const consignes = [
    consignesClient && `Consignes du client pour sa maquette : ${consignesClient}`,
    projet.inspirations && `Inspirations citées par le client : ${projet.inspirations}`,
    projet.precisions && `Précisions du client : ${projet.precisions}`,
    projet.publicCible && `Public visé : ${projet.publicCible}`,
    // « retour » : demande de modification du client (prioritaire).
    retour && `Le client demande ces modifications de la maquette précédente (prioritaire) : ${retour}`,
  ].filter(Boolean).join("\n");
  return NextResponse.json(await genererMaquette(projet, recap, { consignes, images }));
}
