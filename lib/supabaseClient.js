"use client";
// Client Supabase du navigateur : uniquement pour la connexion (lien magique).
// Flux « implicit » : le lien reçu par e-mail fonctionne même s'il est ouvert
// sur un autre appareil que celui où il a été demandé (PKCE l'interdit).
import { createClient } from "@supabase/supabase-js";

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client = null;
export function supabaseNavigateur() {
  if (!URL_SB || !CLE) return null;
  if (!client) client = createClient(URL_SB, CLE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" } });
  return client;
}

export async function jeton() {
  const sb = supabaseNavigateur();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session?.access_token || null;
}

// Appel authentifié aux routes /api/espace et /api/admin.
export async function appelAuthentifie(url, options = {}) {
  const t = await jeton();
  const r = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(options.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.erreur || `Une erreur est survenue (code ${r.status}). Réessayez dans un instant.`); e.status = r.status; throw e; }
  return d;
}
