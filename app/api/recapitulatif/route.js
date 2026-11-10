import { NextResponse } from "next/server";
import { nettoyerProjet } from "../../../lib/moteur.js";
import { genererRecap } from "../../../lib/serveur/generation.js";
import { utilisateur, supabaseConfigure } from "../../../lib/serveur/supabase.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Les tarifs et délais sont donnés par Server (maître du jeu) : aucune estimation n'est envoyée au client.
export async function POST(request) {
  // Réservé aux personnes connectées (protège aussi la facture de l'IA).
  if (supabaseConfigure() && !(await utilisateur(request))) return NextResponse.json({ erreur: "Connectez-vous pour utiliser les services de Kaizen.", connexion: true }, { status: 401 });
  let projet;
  try {
    projet = nettoyerProjet((await request.json())?.projet);
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  return NextResponse.json({ recap: await genererRecap(projet) });
}
