import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/serveur/supabase.js";
import { synchroniserPaiement } from "../../../../lib/serveur/paiements.js";
import { webhookAchat } from "../../../../lib/serveur/pieces.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mollie appelle cette adresse avec « id=tr_… » quand un paiement change.
// On ne fait jamais confiance au contenu : le statut est relu chez Mollie.
export async function POST(request) {
  const sb = supabaseAdmin();
  let id = "";
  try { id = String((await request.formData()).get("id") || ""); } catch { /* corps invalide */ }
  if (!sb || !/^tr_[A-Za-z0-9]+$/.test(id)) return new NextResponse("ok", { status: 200 });
  try {
    // Achat de pièces d'or : crédité sur le portefeuille du compte ; sinon paiement d'un devis.
    if (!(await webhookAchat(sb, id))) await synchroniserPaiement(sb, request, id);
  } catch (e) {
    console.error("Kaizen webhook Mollie :", e?.message);
    return new NextResponse("erreur", { status: 500 }); // Mollie réessaiera plus tard
  }
  return new NextResponse("ok", { status: 200 });
}
