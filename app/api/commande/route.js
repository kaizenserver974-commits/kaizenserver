import { NextResponse } from "next/server";
import { validerCommande, numeroCommande, resumeCommande, confirmationClient } from "../../../lib/commande.js";
import { supabaseAdmin, enregistrerMaquette, utilisateur } from "../../../lib/serveur/supabase.js";
import { debiter, rembourser, SoldeInsuffisant } from "../../../lib/serveur/portefeuille.js";
import { COUT_COMMANDE, COUT_GENIE } from "../../../lib/pieces.js";
import { assainir } from "../../../lib/serveur/generation.js";
import { emailConfigure, envoyerEmail, notifier, urlSite } from "../../../lib/serveur/email.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Une commande est acceptée si elle est enregistrée (Supabase) et/ou envoyée
// par e-mail à l'équipe (Resend + KAIZEN_EMAIL). Sinon : 503 honnête.
export async function POST(request) {
  let corps;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  // Champ piège invisible : rempli uniquement par les robots.
  if (corps?.siteWeb) return NextResponse.json({ ok: true, numero: numeroCommande() });

  const commande = validerCommande(corps);
  if (commande.erreurs.length) return NextResponse.json({ erreur: commande.erreurs.join(" ") }, { status: 400 });

  const sb = supabaseAdmin();
  const emailEquipe = emailConfigure() && process.env.KAIZEN_EMAIL;
  if (!sb && !emailEquipe) {
    // Noms (jamais les valeurs) des réglages manquants, pour aider Server à activer la commande.
    const manquants = ["RESEND_API_KEY", "KAIZEN_EMAIL"].filter((n) => !String(process.env[n] || "").trim());
    return NextResponse.json(
      { erreur: `La commande en ligne n'est pas encore activée sur ce site (réglage manquant : ${manquants.join(", ") || "configuration e-mail"}). Copiez votre dossier ou téléchargez-le en PDF pour l'envoyer.`, nonConfigure: true },
      { status: 503 },
    );
  }

  // Paiement en pièces d'or sur le compte connecté (commande : 140, vœu au génie : 250).
  if (!sb) return NextResponse.json({ erreur: "Les pièces d'or ne sont pas encore activées sur ce site." }, { status: 503 });
  const compte = await utilisateur(request);
  if (!compte) return NextResponse.json({ erreur: "Connectez-vous pour utiliser vos pièces d'or.", connexion: true }, { status: 401 });
  const genie = commande.formule === "genie";
  const cout = genie ? COUT_GENIE : COUT_COMMANDE;
  const motif = genie ? "Maquette sur mesure demandée au génie" : "Envoi de la commande";
  let soldeApres;
  try {
    soldeApres = await debiter(sb, compte.email, cout, motif);
  } catch (e) {
    if (e instanceof SoldeInsuffisant) return NextResponse.json({ erreur: e.message, solde: e.solde, manque: true }, { status: 402 });
    console.error("Kaizen /commande débit :", e?.message);
    return NextResponse.json({ erreur: "Le paiement en pièces d'or est indisponible pour le moment." }, { status: 500 });
  }

  const numero = numeroCommande();
  // Clé secrète remise au client : lui seul pourra ensuite mettre à jour la maquette de cette commande.
  const cleClient = crypto.randomUUID();
  let enregistree = false;
  if (sb) {
    const { data: ligne, error } = await sb.from("kaizen_commandes").insert({
      numero,
      email: commande.contact.email,
      nom: commande.contact.nom,
      telephone: commande.contact.telephone || null,
      entreprise: commande.contact.entreprise || null,
      formule: commande.formule,
      projet: { ...commande.projet, message: commande.contact.message, pieces: commande.pieces.map((p) => p.nom), cleClient, ...(commande.projet.maquetteValidee ? { maquetteAccepteeLe: new Date().toISOString() } : {}) },
      recap: commande.recap,
    }).select("id").single();
    if (error) console.error("Kaizen /commande Supabase :", error.message);
    else {
      enregistree = true;
      const html = assainir(String(corps?.maquette?.html || "").slice(0, 120000));
      if (html.toLowerCase().startsWith("<!doctype html")) {
        await enregistrerMaquette(sb, ligne.id, html, corps.maquette.source === "ia" ? "ia" : "gabarit").catch((e) => console.error("Kaizen maquette :", e?.message));
      }
    }
  }

  let envoyee = false;
  if (emailEquipe) {
    const { texte, html } = resumeCommande(commande, numero);
    try {
      await envoyerEmail({
        a: process.env.KAIZEN_EMAIL,
        sujet: `${commande.formule === "genie" ? "🧞 Demande de maquette au génie" : "🛒 Nouvelle commande"} ${numero} — ${commande.recap.titre || commande.projet.nom || "application"} (${commande.contact.nom})`,
        texte: `${texte}\n\nEspace équipe : ${urlSite(request)}/admin`,
        html, repondreA: commande.contact.email, pieces: commande.pieces,
      });
      envoyee = true;
    } catch (e) {
      console.error("Kaizen /commande e-mail :", e?.message);
    }
  }

  if (!enregistree && !envoyee) {
    await rembourser(sb, compte.email, cout, motif).catch((e) => console.error("Kaizen remboursement :", e?.message));
    return NextResponse.json({ erreur: "L'envoi de la commande a échoué. Réessayez dans un instant." }, { status: 502 });
  }

  const c = confirmationClient(commande, numero);
  const espace = sb ? `\n\nSuivez votre commande, vos devis et vos messages : ${urlSite(request)}/connexion (connectez-vous avec ${commande.contact.email}).` : "";
  const confirmationEnvoyee = await notifier({ a: commande.contact.email, sujet: commande.formule === "genie" ? `Votre demande de maquette au génie ${numero}` : `Votre commande KaizenServer ${numero}`, texte: c.texte + espace, html: c.html, repondreA: process.env.KAIZEN_EMAIL });

  return NextResponse.json({ ok: true, numero, confirmationEnvoyee, espaceClient: enregistree, date: new Date().toISOString(), solde: soldeApres, ...(enregistree ? { cleClient } : {}) });
}
