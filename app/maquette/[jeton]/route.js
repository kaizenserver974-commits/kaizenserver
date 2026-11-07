import { supabaseAdmin, maquetteParJeton } from "../../../lib/serveur/supabase.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Page publique d'une maquette (lien partageable).
// L'en-tête CSP « sandbox » isole complètement la page : ses scripts ne peuvent
// accéder ni aux données du site (connexion, projets), ni au réseau.
export async function GET(_request, { params }) {
  const { jeton } = await params;
  const sb = supabaseAdmin();
  const html = sb ? await maquetteParJeton(sb, jeton).catch(() => null) : null;
  if (!html) {
    return new Response("<!doctype html><meta charset=utf-8><title>Maquette introuvable</title><body style='font-family:sans-serif;padding:40px'>Cette maquette n'existe pas ou a été remplacée.</body>", {
      status: 404, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-modals; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
