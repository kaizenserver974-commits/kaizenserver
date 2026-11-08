import { NextResponse } from "next/server";
import { supabaseAdmin, utilisateur } from "../../../../lib/serveur/supabase.js";
import { acheterPieces } from "../../../../lib/serveur/pieces.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let corps;
  try { corps = await request.json(); } catch { return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 }); }
  try {
    const u = await utilisateur(request);
    if (!u) return NextResponse.json({ erreur: "Connectez-vous pour acheter des pièces d'or.", connexion: true }, { status: 401 });
    const r = await acheterPieces(supabaseAdmin(), request, { ...(corps || {}), email: u.email });
    if (r.erreur) return NextResponse.json({ erreur: r.erreur }, { status: r.status });
    return NextResponse.json(r);
  } catch (e) {
    console.error("Kaizen achat pièces :", e?.message);
    return NextResponse.json({ erreur: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." }, { status: 502 });
  }
}
