// Accès Supabase côté serveur (clé service) + identification de l'utilisateur.
import { createClient } from "@supabase/supabase-js";
import { estAdmin } from "../espace.js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleService = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const supabaseConfigure = () => Boolean(url() && cleService());

let client = null;
export function supabaseAdmin() {
  if (!supabaseConfigure()) return null;
  if (!client) {
    client = createClient(url(), cleService(), { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  }
  return client;
}

// Retourne { email, admin } à partir du jeton envoyé par le navigateur, ou null.
export async function utilisateur(request) {
  const sb = supabaseAdmin();
  const auth = request.headers.get("authorization") || "";
  if (!sb || !auth.startsWith("Bearer ")) return null;
  const { data, error } = await sb.auth.getUser(auth.slice(7));
  const email = data?.user?.email?.toLowerCase();
  if (error || !email) return null;
  return { email, admin: estAdmin(email, process.env.KAIZEN_ADMIN_EMAILS) };
}

// Charge des commandes avec leurs messages et devis.
// Les tables ajoutées au fil des versions (paiements, liens, maquettes) peuvent
// manquer si supabase/schema.sql n'a pas été relancé : on se rabat alors sur
// une requête plus simple au lieu de bloquer tout l'espace.
const SELECTIONS = [
  "*, messages:kaizen_messages(*), devis:kaizen_devis(*), paiements:kaizen_paiements(*), liens:kaizen_liens(*), maquette:kaizen_maquettes(source, updated_at)",
  "*, messages:kaizen_messages(*), devis:kaizen_devis(*), paiements:kaizen_paiements(*), liens:kaizen_liens(*)",
  "*, messages:kaizen_messages(*), devis:kaizen_devis(*)",
];

export async function chargerCommandes(sb, filtre) {
  let derniere = null;
  for (const selection of SELECTIONS) {
    let requete = sb.from("kaizen_commandes").select(selection).order("created_at", { ascending: false }).limit(200);
    // Les e-mails sont enregistrés en minuscules : comparaison exacte (pas de joker).
    if (filtre?.email) requete = requete.eq("email", filtre.email.toLowerCase());
    if (filtre?.id) requete = requete.eq("id", filtre.id);
    const { data, error } = await requete;
    if (error) {
      derniere = error;
      console.error("Kaizen chargerCommandes (" + selection.length + ") :", error.message, "— relancez supabase/schema.sql");
      continue;
    }
    return (data || []).map((c) => ({
      ...c,
      messages: (c.messages || []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
      devis: (c.devis || []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      paiements: c.paiements || [],
      liens: c.liens || [],
      maquette: Array.isArray(c.maquette) ? c.maquette[0] || null : c.maquette || null,
    }));
  }
  throw new Error(derniere?.message || "Chargement impossible");
}

// Maquette d'un projet (lue à la demande : le HTML peut être volumineux).
export async function lireMaquette(sb, commandeId) {
  const { data } = await sb.from("kaizen_maquettes").select("html, source, updated_at").eq("commande_id", commandeId).maybeSingle();
  return data || null;
}

export async function enregistrerMaquette(sb, commandeId, html, source) {
  const { error } = await sb.from("kaizen_maquettes").upsert({ commande_id: commandeId, html, source, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
