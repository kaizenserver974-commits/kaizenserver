import { NextResponse } from "next/server";
import { nettoyerProjet } from "../../../lib/moteur.js";
import { genererMaquette } from "../../../lib/serveur/generation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  let projet, recap, retour;
  try {
    const corps = await request.json();
    projet = nettoyerProjet(corps?.projet);
    recap = corps?.recap && typeof corps.recap === "object" ? corps.recap : null;
    retour = String(corps?.retour || "").trim().slice(0, 1000);
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  // « retour » : demande de modification du client (consignes prioritaires pour l'IA).
  return NextResponse.json(await genererMaquette(projet, recap, { consignes: retour ? `Le client demande ces modifications de la maquette précédente : ${retour}` : "" }));
}
