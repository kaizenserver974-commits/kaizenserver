import { NextResponse } from "next/server";
import { supabaseAdmin, utilisateur } from "../../../../lib/serveur/supabase.js";
import { verifierAchat } from "../../../../lib/serveur/pieces.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let corps;
  try { corps = await request.json(); } catch { return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 }); }
  try {
    const u = await utilisateur(request);
    const r = await verifierAchat(supabaseAdmin(), corps?.achat, u?.email);
    if (r.erreur) return NextResponse.json({ erreur: r.erreur }, { status: r.status });
    return NextResponse.json(r);
  } catch (e) {
    console.error("Kaizen vérification pièces :", e?.message);
    return NextResponse.json({ erreur: "Vérification impossible pour le moment." }, { status: 502 });
  }
}
