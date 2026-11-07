import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigure, utilisateur, chargerCommandes } from "../../../lib/serveur/supabase.js";
import { STATUTS, validerMessage, validerDevis, statut, nonLus } from "../../../lib/espace.js";
import { notifier, urlSite } from "../../../lib/serveur/email.js";
import { mollieConfigure } from "../../../lib/serveur/mollie.js";
import { rafraichirPaiementsEnAttente } from "../../../lib/serveur/paiements.js";
import { montantEnLigne, validerLien, validerNouveauProjet } from "../../../lib/espace.js";
import { numeroCommande } from "../../../lib/commande.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refus = (message, status) => NextResponse.json({ erreur: message }, { status });

async function autoriser(request) {
  if (!supabaseConfigure()) return { reponse: refus("L'espace équipe n'est pas encore activé.", 503) };
  const u = await utilisateur(request);
  if (!u) return { reponse: refus("Connectez-vous.", 401) };
  if (!u.admin) {
    const configure = Boolean(String(process.env.KAIZEN_ADMIN_EMAILS || "").trim());
    return { reponse: refus(`Accès réservé à Server, le maître du jeu. Vous êtes connecté avec ${u.email}. ${configure ? "Cette adresse n'est pas dans KAIZEN_ADMIN_EMAILS." : "La variable KAIZEN_ADMIN_EMAILS est vide ou absente."} Ajoutez-la dans Vercel (Settings → Environment Variables), puis faites un Redeploy.`, 403) };
  }
  return { u };
}

export async function GET(request) {
  const { reponse } = await autoriser(request);
  if (reponse) return reponse;
  try {
    const sb = supabaseAdmin();
    let commandes = await chargerCommandes(sb);
    if (await rafraichirPaiementsEnAttente(sb, request, commandes)) commandes = await chargerCommandes(sb);
    return NextResponse.json({ commandes, nonLus: nonLus(commandes, "equipe"), paiementEnLigne: mollieConfigure() });
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

  // Nouveau projet créé à la main par Server (client venu hors du site).
  if (corps.action === "creer") {
    const { projet, erreur } = validerNouveauProjet(corps);
    if (erreur) return refus(erreur, 400);
    const numero = numeroCommande();
    const { data, error } = await sb.from("kaizen_commandes").insert({
      numero, source: "manuel", email: projet.email, nom: projet.nom, telephone: projet.telephone || null, formule: "conseil", statut: "en_etude",
      projet: { nom: projet.titre, idee: projet.idee, fonctionnalites: [], personnalisees: [] }, recap: { titre: projet.titre },
    }).select("id").single();
    if (error) return refus("Le projet n'a pas pu être créé.", 500);
    return NextResponse.json({ ok: true, id: data.id, numero });
  }

  const [commande] = await chargerCommandes(sb, { id: String(corps.commandeId || "") }).catch(() => []);
  if (!commande) return refus("Commande introuvable.", 404);

  if (corps.action === "lien_ajouter") {
    const { lien, erreur } = validerLien(corps);
    if (erreur) return refus(erreur, 400);
    const { error } = await sb.from("kaizen_liens").insert({ commande_id: commande.id, ...lien });
    if (error) return refus("Le lien n'a pas pu être ajouté.", 500);
    if (lien.visible_client && corps.prevenir) {
      await notifier({
        a: commande.email,
        sujet: `🔗 Nouveau lien pour votre application — commande ${commande.numero}`,
        texte: `Bonjour ${commande.nom || ""},\n\nServer, votre maître du jeu, a ajouté un lien : ${lien.titre}\n${lien.url}\n\nRetrouvez tous vos liens dans votre espace : ${lienClient}`,
        repondreA: process.env.KAIZEN_EMAIL,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "lien_supprimer") {
    const { error } = await sb.from("kaizen_liens").delete().eq("id", String(corps.lienId || "")).eq("commande_id", commande.id);
    if (error) return refus("Le lien n'a pas pu être supprimé.", 500);
    return NextResponse.json({ ok: true });
  }
  const lienClient = `${urlSite(request)}/connexion`;

  if (corps.action === "message") {
    const { contenu, erreur } = validerMessage(corps.contenu);
    if (erreur) return refus(erreur, 400);
    const type = corps.type === "conseil" ? "conseil" : "message";
    const { error } = await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "equipe", type, contenu });
    if (error) return refus("Le message n'a pas pu être envoyé.", 500);
    await notifier({
      a: commande.email,
      sujet: `${type === "conseil" ? "💡 Un conseil" : "✉️ Un message"} de Server, votre maître du jeu — commande ${commande.numero}`,
      texte: `Bonjour ${commande.nom || ""},\n\nServer, votre maître du jeu, ${type === "conseil" ? "vous donne un conseil" : "vous a écrit"} :\n\n${contenu}\n\nRépondez depuis votre espace : ${lienClient}`,
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
      sujet: `🧾 L'offre de Server, votre maître du jeu — commande ${commande.numero}`,
      texte: `Bonjour ${commande.nom || ""},\n\nServer, votre maître du jeu, vous envoie son offre : ${montant}${devis.delai_semaines ? `, environ ${devis.delai_semaines} semaines` : ""}.\n${devis.details ? `\n${devis.details}\n` : ""}${montantEnLigne(devis) ? `\nAprès acceptation, vous pourrez régler ${devis.acompte_pct < 100 ? `l'acompte de ${devis.acompte_pct} %` : "le montant"} en ligne, en toute sécurité (Mollie).\n` : ""}\nConsultez-la et répondez depuis votre espace : ${lienClient}`,
      repondreA: process.env.KAIZEN_EMAIL,
    });
    return NextResponse.json({ ok: true });
  }

  return refus("Action inconnue.", 400);
}
