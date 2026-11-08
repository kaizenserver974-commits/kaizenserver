import { NextResponse } from "next/server";
import { supabaseAdmin, utilisateur } from "../../../../lib/serveur/supabase.js";
import { lireSolde, crediterRecompenses } from "../../../../lib/serveur/portefeuille.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Solde du compte connecté ; « recompenses » crédite les récompenses du jeu (une fois par compte).
export async function POST(request) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ erreur: "Les pièces d'or ne sont pas encore activées sur ce site." }, { status: 503 });
  const u = await utilisateur(request);
  if (!u) return NextResponse.json({ erreur: "Connectez-vous pour utiliser vos pièces d'or.", connexion: true }, { status: 401 });
  let corps = {};
  try { corps = await request.json(); } catch { /* corps vide */ }
  try {
    const solde = Array.isArray(corps?.recompenses)
      ? await crediterRecompenses(sb, u.email, corps.recompenses.map(String), corps.projet)
      : await lireSolde(sb, u.email);
    return NextResponse.json({ ok: true, solde, email: u.email });
  } catch (e) {
    console.error("Kaizen portefeuille :", e?.message);
    // Tables ou fonctions absentes : supabase/schema.sql n'a pas été lancé.
    const schema = /schema\.sql|does not exist|Could not find|PGRST202|42883|42P01/i.test(String(e?.message));
    return NextResponse.json({
      erreur: schema
        ? (u.admin ? "Base de données à mettre à jour : lancez supabase/schema.sql dans Supabase (SQL Editor)." : "Les pièces d'or sont en cours d'installation. Réessayez un peu plus tard.")
        : "Le solde de pièces est indisponible pour le moment.",
      schema,
    }, { status: 500 });
  }
}
