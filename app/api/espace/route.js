import { NextResponse } from "next/server";
import { bourse, debiter, SoldeInsuffisant } from "../../../lib/serveur/portefeuille.js";
import { COUT_MODIF_SERVER } from "../../../lib/pieces.js";
import { supabaseAdmin, supabaseConfigure, utilisateur, chargerCommandes, lireMaquette } from "../../../lib/serveur/supabase.js";
import { validerMessage, nonLus, statut, liensPourClient } from "../../../lib/espace.js";
import { notifier, urlSite } from "../../../lib/serveur/email.js";
import { mollieConfigure } from "../../../lib/serveur/mollie.js";
import { demarrerPaiement, rafraichirPaiementsEnAttente } from "../../../lib/serveur/paiements.js";
import { numeroCommande } from "../../../lib/commande.js";

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
    return refus(`Impossible de charger votre espace pour le moment. (Détail : ${e?.message || "inconnu"} — si une table manque, relancez supabase/schema.sql dans Supabase.)`, 500);
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

  // Écrire à Server sans commande : un fil « Message à Server » est créé au premier message
  // (visible dans l'Espace Server, qui répond dans ce même fil).
  if (corps.action === "contact") {
    const { contenu, erreur } = validerMessage(corps.contenu);
    if (erreur) return refus(erreur, 400);
    let fil = (await chargerCommandes(sb, { email: u.email }).catch(() => [])).find((c) => c.formule === "contact");
    if (!fil) {
      const { data, error } = await sb.from("kaizen_commandes").insert({
        numero: numeroCommande(), email: u.email, nom: String(corps.nom || "").trim().slice(0, 80) || u.email.split("@")[0], formule: "contact", statut: "nouvelle",
        projet: { nom: "Message à Server", idee: "", fonctionnalites: [], personnalisees: [] }, recap: { titre: "💬 Message à Server" },
      }).select("id, numero").single();
      if (error) return refus("Le message n'a pas pu être envoyé.", 500);
      fil = data;
    }
    const { error } = await sb.from("kaizen_messages").insert({ commande_id: fil.id, auteur: "client", type: "message", contenu });
    if (error) return refus("Le message n'a pas pu être envoyé.", 500);
    await notifier({
      a: process.env.KAIZEN_EMAIL,
      sujet: `💬 Nouveau message de ${u.email}`,
      texte: `${u.email} vous écrit :\n\n${contenu}\n\nRépondez depuis l'Espace Server : ${urlSite(request)}/admin`,
      repondreA: u.email,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const [commande] = await chargerCommandes(sb, { id: String(corps.commandeId || ""), email: u.email }).catch(() => []);
  if (!commande) return refus("Commande introuvable.", 404);

  // Demande de modification de la maquette à Server : 30 pièces d'or prises dans la bourse du projet.
  // Le client accepte la maquette envoyée par Server : Server est prévenu.
  if (corps.action === "maquette_accepter") {
    if (!commande.maquette) return refus("Pas encore de maquette.", 404);
    if (commande.projet?.maquetteValidee === true) return NextResponse.json({ ok: true, deja: true });
    const le = new Date().toISOString();
    const { error } = await sb.from("kaizen_commandes").update({ projet: { ...(commande.projet || {}), maquetteValidee: true, maquetteAccepteeLe: le }, updated_at: le }).eq("id", commande.id);
    if (error) return refus("L'acceptation n'a pas pu être enregistrée.", 500);
    await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "client", contenu: "✅ J'accepte la maquette, merci !" });
    await notifier({
      a: process.env.KAIZEN_EMAIL,
      sujet: `✅ Maquette acceptée — ${commande.numero} (${commande.nom || commande.email})`,
      texte: `${commande.nom || commande.email} a accepté sa maquette (commande ${commande.numero}).\n\nEspace Server : ${urlSite(request)}/admin`,
      repondreA: commande.email,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "modification") {
    const { contenu, erreur } = validerMessage(corps.contenu);
    if (erreur) return refus(erreur, 400);
    const cleBourse = bourse(u.email, commande.projet?.projetLocal);
    if (!cleBourse) return refus("Ouvrez ce projet depuis « Mes projets » sur cet appareil pour utiliser ses pièces d'or, ou écrivez à Server dans les messages.", 400);
    let solde;
    try { solde = await debiter(sb, cleBourse, COUT_MODIF_SERVER, `Modification de maquette demandée à Server (${commande.numero})`); }
    catch (e) {
      if (e instanceof SoldeInsuffisant) return NextResponse.json({ erreur: e.message, solde: e.solde, manque: true }, { status: 402 });
      return refus("Le paiement en pièces d'or est indisponible pour le moment.", 500);
    }
    await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "client", contenu: `✏️ Demande de modification de la maquette (−${COUT_MODIF_SERVER} 🪙) :\n${contenu}` });
    await notifier({
      a: process.env.KAIZEN_EMAIL,
      sujet: `✏️ Modification de maquette demandée — ${commande.numero} (${commande.nom || commande.email})`,
      texte: `${commande.nom || commande.email} demande une modification de sa maquette :\n\n${contenu}\n\nEspace Server : ${urlSite(request)}/admin`,
      repondreA: commande.email,
    }).catch(() => {});
    return NextResponse.json({ ok: true, solde });
  }

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
