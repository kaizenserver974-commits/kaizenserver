import { NextResponse } from "next/server";
import { supabaseAdmin, enregistrerMaquette } from "../../../../lib/serveur/supabase.js";
import { assainir } from "../../../../lib/serveur/generation.js";
import { notifier } from "../../../../lib/serveur/email.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le client met à jour la maquette de sa commande (modification, acceptation) après l'envoi.
// Autorisé uniquement avec la clé secrète remise au client lors de la commande.
export async function POST(request) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ erreur: "Service indisponible." }, { status: 503 });
  let corps;
  try { corps = await request.json(); } catch { return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 }); }
  const numero = String(corps?.numero || "");
  const cle = String(corps?.cle || "");
  if (!/^KZ-[\w-]{4,40}$/.test(numero) || !/^[0-9a-f-]{36}$/i.test(cle)) return NextResponse.json({ erreur: "Commande inconnue." }, { status: 400 });
  const { data: commande } = await sb.from("kaizen_commandes").select("id, numero, projet").eq("numero", numero).maybeSingle();
  if (!commande || commande.projet?.cleClient !== cle) return NextResponse.json({ erreur: "Commande inconnue." }, { status: 404 });

  const html = assainir(String(corps?.html || "").slice(0, 2_000_000));
  if (html.toLowerCase().startsWith("<!doctype html")) {
    await enregistrerMaquette(sb, commande.id, html, corps.source === "ia" ? "ia" : "gabarit");
  }
  const acceptee = corps?.acceptee === true;
  const dejaAcceptee = commande.projet?.maquetteValidee === true;
  await sb.from("kaizen_commandes").update({
    projet: { ...(commande.projet || {}), maquetteValidee: acceptee, ...(acceptee && !dejaAcceptee ? { maquetteAccepteeLe: new Date().toISOString() } : {}) },
    updated_at: new Date().toISOString(),
  }).eq("id", commande.id);

  // Server est prévenu quand le client accepte sa maquette.
  if (acceptee && !dejaAcceptee && process.env.KAIZEN_EMAIL) {
    await notifier({ a: process.env.KAIZEN_EMAIL, sujet: `✅ Maquette acceptée — commande ${commande.numero}`, texte: `Le client a accepté sa maquette pour la commande ${commande.numero}. Elle est visible dans l'Espace Server.` }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
