import { NextResponse } from "next/server";
import { nettoyerProjet } from "../../../lib/moteur.js";
import { genererMaquette, validerImagesReference } from "../../../lib/serveur/generation.js";
import { supabaseAdmin, utilisateur } from "../../../lib/serveur/supabase.js";
import { debiter, rembourser, SoldeInsuffisant } from "../../../lib/serveur/portefeuille.js";
import { COUT_MAQUETTE, COUT_MODIFICATION } from "../../../lib/pieces.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro : l'IA peut prendre plus d'une minute (surtout avec des images)

// Maquette par l'IA, payée en pièces d'or sur le compte du client (vérifié par le serveur).
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

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ erreur: "Les pièces d'or ne sont pas encore activées sur ce site." }, { status: 503 });
  const u = await utilisateur(request);
  if (!u) return NextResponse.json({ erreur: "Connectez-vous pour utiliser vos pièces d'or.", connexion: true }, { status: 401 });

  const cout = retour ? COUT_MODIFICATION : COUT_MAQUETTE;
  const motif = retour ? "Modification de maquette par l'IA" : "Maquette instantanée par l'IA";
  let solde;
  try {
    solde = await debiter(sb, u.email, cout, motif);
  } catch (e) {
    if (e instanceof SoldeInsuffisant) return NextResponse.json({ erreur: e.message, solde: e.solde, manque: true }, { status: 402 });
    console.error("Kaizen /maquette débit :", e?.message);
    return NextResponse.json({ erreur: "Le paiement en pièces d'or est indisponible pour le moment." }, { status: 500 });
  }

  // Même IA et mêmes possibilités que Server : consignes + images de référence.
  const consignes = [
    consignesClient && `Consignes du client pour sa maquette : ${consignesClient}`,
    projet.inspirations && `Inspirations citées par le client : ${projet.inspirations}`,
    projet.precisions && `Précisions du client : ${projet.precisions}`,
    projet.publicCible && `Public visé : ${projet.publicCible}`,
    retour && `Le client demande ces modifications de la maquette précédente (prioritaire) : ${retour}`,
  ].filter(Boolean).join("\n");

  const resultat = await genererMaquette(projet, recap, { consignes, images });
  // L'IA n'a pas répondu (maquette de secours) : le client est remboursé.
  if (resultat.source !== "ia") solde = await rembourser(sb, u.email, cout, motif).catch(() => solde);
  return NextResponse.json({ ...resultat, rembourse: resultat.source !== "ia", solde });
}
