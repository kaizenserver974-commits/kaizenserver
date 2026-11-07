import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigure, utilisateur, chargerCommandes, lireMaquette } from "../../../lib/serveur/supabase.js";
import { validerMessage, nonLus, statut, liensPourClient } from "../../../lib/espace.js";
import { notifier, urlSite } from "../../../lib/serveur/email.js";
import { mollieConfigure } from "../../../lib/serveur/mollie.js";
import { demarrerPaiement, rafraichirPaiementsEnAttente } from "../../../lib/serveur/paiements.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refus = (message, status) => NextResponse.json({ erreur: message }, { status });

// GET : commandes, devis et messages de l'utilisateur connecté.
export async function GET(request) {
  if (!supabaseConfigure()) return refus("L'espace client n'est pas encore activé.", 503);
  const u = await utilisateur(request);
  if (!u) return refus("Connectez-vous pour accéder à votre espace.", 401);
  try {
    const sb = supabaseAdmin();
    let commandes = await chargerCommandes(sb, { email: u.email });
    if (await rafraichirPaiementsEnAttente(sb, request, commandes)) commandes = await chargerCommandes(sb, { email: u.email });
    commandes = commandes.map((c) => ({ ...c, liens: liensPourClient(c.liens) }));
    return NextResponse.json({ email: u.email, admin: u.admin, commandes, nonLus: nonLus(commandes, "client"), paiementEnLigne: mollieConfigure() });
  } catch (e) {
    console.error("Kaizen /espace :", e?.message);
    return refus("Impossible de charger votre espace pour le moment.", 500);
  }
}

// POST : actions du client sur SA commande — message, lecture, réponse au devis.
export async function POST(request) {
  if (!supabaseConfigure()) return refus("L'espace client n'est pas encore activé.", 503);
  const u = await utilisateur(request);
  if (!u) return refus("Connectez-vous pour accéder à votre espace.", 401);
  let corps;
  try { corps = await request.json(); } catch { return refus("Requête invalide.", 400); }

  const sb = supabaseAdmin();
  const [commande] = await chargerCommandes(sb, { id: String(corps.commandeId || ""), email: u.email }).catch(() => []);
  if (!commande) return refus("Commande introuvable.", 404);

  if (corps.action === "message") {
    const { contenu, erreur } = validerMessage(corps.contenu);
    if (erreur) return refus(erreur, 400);
    const { error } = await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "client", contenu });
    if (error) return refus("Le message n'a pas pu être envoyé.", 500);
    await notifier({
      a: process.env.KAIZEN_EMAIL,
      sujet: `✉️ Nouveau message — commande ${commande.numero} (${commande.nom || commande.email})`,
      texte: `${commande.nom || commande.email} a écrit :\n\n${contenu}\n\nRépondre : ${urlSite(request)}/admin`,
      repondreA: commande.email,
    });
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "lu") {
    await sb.from("kaizen_messages").update({ lu: true }).eq("commande_id", commande.id).eq("auteur", "equipe").eq("lu", false);
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "devis") {
    const decision = corps.decision === "accepte" ? "accepte" : corps.decision === "refuse" ? "refuse" : null;
    const devis = commande.devis.find((d) => d.id === corps.devisId);
    if (!decision || !devis) return refus("Devis introuvable.", 404);
    if (devis.statut !== "envoye") return refus("Vous avez déjà répondu à ce devis.", 409);
    const { error } = await sb.from("kaizen_devis").update({ statut: decision, repondu_at: new Date().toISOString() }).eq("id", devis.id).eq("statut", "envoye");
    if (error) return refus("La réponse n'a pas pu être enregistrée.", 500);
    const nouveau = decision === "accepte" ? "devis_accepte" : "devis_refuse";
    await sb.from("kaizen_commandes").update({ statut: nouveau, updated_at: new Date().toISOString() }).eq("id", commande.id);
    await notifier({
      a: process.env.KAIZEN_EMAIL,
      sujet: `${decision === "accepte" ? "✅" : "✖️"} ${statut(nouveau).label} — commande ${commande.numero}`,
      texte: `${commande.nom || commande.email} a ${decision === "accepte" ? "accepté" : "refusé"} le devis de ${devis.montant} €.\n\n${urlSite(request)}/admin`,
      repondreA: commande.email,
    });
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "maquette_lire") {
    const m = await lireMaquette(sb, commande.id);
    return m ? NextResponse.json({ ok: true, ...m }) : refus("Pas encore de maquette.", 404);
  }

  if (corps.action === "payer") {
    const devis = commande.devis.find((d) => d.id === corps.devisId);
    if (!devis) return refus("Offre introuvable.", 404);
    try {
      const r = await demarrerPaiement(sb, request, commande, devis);
      if (r.erreur) return refus(r.erreur, r.status);
      return NextResponse.json({ ok: true, url: r.url });
    } catch (e) {
      console.error("Kaizen paiement :", e?.message);
      return refus("Le paiement n'a pas pu démarrer. Réessayez dans un instant.", 502);
    }
  }

  return refus("Action inconnue.", 400);
}
