// Sert une image de l'atelier de Server (utilisée dans les maquettes). Adresse difficile à deviner.
import { supabaseAdmin, supabaseConfigure } from "../../../../lib/serveur/supabase.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!supabaseConfigure() || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))) return new Response("Introuvable", { status: 404 });
  const { data } = await supabaseAdmin().from("kaizen_images").select("type, contenu").eq("id", id).maybeSingle();
  if (!data) return new Response("Introuvable", { status: 404 });
  return new Response(Buffer.from(data.contenu, "base64"), {
    headers: { "Content-Type": data.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
