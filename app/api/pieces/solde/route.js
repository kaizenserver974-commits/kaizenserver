import { NextResponse } from "next/server";
import { supabaseAdmin, utilisateur } from "../../../../lib/serveur/supabase.js";
import { lireSolde, crediterRecompenses, historique, bourse, resteDuJour } from "../../../../lib/serveur/portefeuille.js";
import { PLAFOND_GRATUIT_JOUR, sansPlafond } from "../../../../lib/pieces.js";

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
  // Une bourse par projet : sans projet, pas de solde.
  const cleBourse = bourse(u.email, corps?.projet);
  if (!cleBourse) return NextResponse.json({ ok: true, solde: 0, email: u.email, sansProjet: true });
  try {
    let solde, gagne = 0, plafond = false;
    // Server et les comptes de test n'ont pas de limite quotidienne ; les clients oui.
    const illimite = sansPlafond(u.email, u.admin, process.env.KAIZEN_SANS_PLAFOND);
    if (Array.isArray(corps?.recompenses)) {
      // Server (administrateur) n'a pas de limite quotidienne : il peut tester librement.
      ({ solde, gagne, plafond } = await crediterRecompenses(sb, u.email, corps.projet, corps.recompenses.map(String), { sansPlafond: illimite }));
    } else {
      solde = await lireSolde(sb, cleBourse);
    }
    const mouvements = corps?.historique ? await historique(sb, cleBourse) : undefined;
    const resteJour = illimite ? null : await resteDuJour(sb, u.email).catch(() => null);
    return NextResponse.json({ ok: true, solde, gagne, plafond, resteJour, plafondJour: PLAFOND_GRATUIT_JOUR, illimite, email: u.email, ...(mouvements ? { mouvements } : {}) });
  } catch (e) {
    console.error("Kaizen portefeuille :", e?.message);
    // Tables ou fonctions absentes : supabase/schema.sql n'a pas été lancé.
    const schema = /schema\.sql|does not exist|Could not find|PGRST202|42883|42P01/i.test(String(e?.message));
    return NextResponse.json({
      erreur: schema
        ? (u.admin ? "Base de données à mettre à jour : lancez supabase/schema.sql dans Supabase (SQL Editor)." : "Les pièces d'or sont en cours d'installation. Réessayez un peu plus tard.")
        : "Le solde de pièces est indisponible pour le moment.",
      // Détail technique visible seulement par Server et les comptes de test (pour diagnostiquer).
      ...(sansPlafond(u.email, u.admin, process.env.KAIZEN_SANS_PLAFOND) ? { detail: String(e?.message || "inconnu").slice(0, 300) } : {}),
      schema,
    }, { status: 500 });
  }
}
