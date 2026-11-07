import { NextResponse } from "next/server";
import { nettoyerProjet } from "../../../lib/moteur.js";
import { genererMaquette } from "../../../lib/serveur/generation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  let projet, recap;
  try {
    const corps = await request.json();
    projet = nettoyerProjet(corps?.projet);
    recap = corps?.recap && typeof corps.recap === "object" ? corps.recap : null;
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  return NextResponse.json(await genererMaquette(projet, recap));
}
