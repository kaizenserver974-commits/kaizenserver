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
export async function chargerCommandes(sb, filtre) {
  let requete = sb.from("kaizen_commandes").select("*, messages:kaizen_messages(*), devis:kaizen_devis(*)").order("created_at", { ascending: false }).limit(200);
  // Les e-mails sont enregistrés en minuscules : comparaison exacte (pas de joker).
  if (filtre?.email) requete = requete.eq("email", filtre.email.toLowerCase());
  if (filtre?.id) requete = requete.eq("id", filtre.id);
  const { data, error } = await requete;
  if (error) throw new Error(error.message);
  return (data || []).map((c) => ({
    ...c,
    messages: (c.messages || []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    devis: (c.devis || []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }));
}
