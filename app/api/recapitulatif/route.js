import { NextResponse } from "next/server";
import { nettoyerProjet } from "../../../lib/moteur.js";
import { genererRecap } from "../../../lib/serveur/generation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Les tarifs et délais sont donnés par Server (maître du jeu) : aucune estimation n'est envoyée au client.
export async function POST(request) {
  let projet;
  try {
    projet = nettoyerProjet((await request.json())?.projet);
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  return NextResponse.json({ recap: await genererRecap(projet) });
}
