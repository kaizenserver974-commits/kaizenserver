import { NextResponse } from "next/server";
import { utilisateur } from "../../../lib/serveur/supabase.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rôle du compte connecté (pour afficher le menu client ou le menu Server).
export async function POST(request) {
  const u = await utilisateur(request);
  return NextResponse.json(u ? { connecte: true, admin: Boolean(u.admin) } : { connecte: false, admin: false });
}
