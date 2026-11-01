import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigure, utilisateur, chargerCommandes } from "../../../lib/serveur/supabase.js";
import { STATUTS, validerMessage, validerDevis, statut, nonLus } from "../../../lib/espace.js";
import { notifier, urlSite } from "../../../lib/serveur/email.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refus = (message, status) => NextResponse.json({ erreur: message }, { status });

async function autoriser(request) {
  if (!supabaseConfigure()) return { reponse: refus("L'espace équipe n'est pas encore activé.", 503) };
  const u = await utilisateur(request);
  if (!u) return { reponse: refus("Connectez-vous.", 401) };
  if (!u.admin) return { reponse: refus("Accès réservé à l'équipe KaizenServer.", 403) };
  return { u };
}

export async function GET(request) {
  const { reponse } = await autoriser(request);
  if (reponse) return reponse;
  try {
    const commandes = await chargerCommandes(supabaseAdmin());
    return NextResponse.json({ commandes, nonLus: nonLus(commandes, "equipe") });
  } catch (e) {
    console.error("Kaizen /admin :", e?.message);
    return refus("Impossible de charger les commandes.", 500);
  }
}

export async function POST(request) {
  const { reponse } = await autoriser(request);
  if (reponse) return reponse;
  let corps;
  try { corps = await request.json(); } catch { return refus("Requête invalide.", 400); }
  const sb = supabaseAdmin();
  const [commande] = await chargerCommandes(sb, { id: String(corps.commandeId || "") }).catch(() => []);
  if (!commande) return refus("Commande introuvable.", 404);
  const lienClient = `${urlSite(request)}/connexion`;

  if (corps.action === "message") {
    const { contenu, erreur } = validerMessage(corps.contenu);
    if (erreur) return refus(erreur, 400);
    const { error } = await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "equipe", contenu });
    if (error) return refus("Le message n'a pas pu être envoyé.", 500);
    await notifier({
      a: commande.email,
      sujet: `✉️ Nouveau message de KaizenServer — commande ${commande.numero}`,
      texte: `Bonjour ${commande.nom || ""},\n\nL'équipe KaizenServer vous a écrit :\n\n${contenu}\n\nRépondez depuis votre espace : ${lienClient}`,
      repondreA: process.env.KAIZEN_EMAIL,
    });
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "lu") {
    await sb.from("kaizen_messages").update({ lu: true }).eq("commande_id", commande.id).eq("auteur", "client").eq("lu", false);
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "statut") {
    if (!STATUTS.some((s) => s.id === corps.statut)) return refus("Statut inconnu.", 400);
    const { error } = await sb.from("kaizen_commandes").update({ statut: corps.statut, updated_at: new Date().toISOString() }).eq("id", commande.id);
    if (error) return refus("Le statut n'a pas pu être modifié.", 500);
    if (corps.prevenir) {
      await notifier({
        a: commande.email,
        sujet: `${statut(corps.statut).icone} Votre commande ${commande.numero} : ${statut(corps.statut).label}`,
        texte: `Bonjour ${commande.nom || ""},\n\nVotre commande ${commande.numero} est maintenant : ${statut(corps.statut).label}.\n\nSuivez-la depuis votre espace : ${lienClient}`,
        repondreA: process.env.KAIZEN_EMAIL,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "devis") {
    const { devis, erreur } = validerDevis(corps);
    if (erreur) return refus(erreur, 400);
    const { error } = await sb.from("kaizen_devis").insert({ commande_id: commande.id, ...devis });
    if (error) return refus("Le devis n'a pas pu être créé.", 500);
    await sb.from("kaizen_commandes").update({ statut: "devis_envoye", updated_at: new Date().toISOString() }).eq("id", commande.id);
    const montant = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(devis.montant);
    await notifier({
      a: commande.email,
      sujet: `🧾 Votre devis KaizenServer — commande ${commande.numero}`,
      texte: `Bonjour ${commande.nom || ""},\n\nVotre devis est prêt : ${montant}${devis.delai_semaines ? `, environ ${devis.delai_semaines} semaines` : ""}.\n${devis.details ? `\n${devis.details}\n` : ""}\nConsultez-le et répondez depuis votre espace : ${lienClient}`,
      repondreA: process.env.KAIZEN_EMAIL,
    });
    return NextResponse.json({ ok: true });
  }

  return refus("Action inconnue.", 400);
}
