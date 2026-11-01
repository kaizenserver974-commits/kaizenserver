import { NextResponse } from "next/server";
import { validerCommande, numeroCommande, resumeCommande, confirmationClient } from "../../../lib/commande.js";
import { supabaseAdmin } from "../../../lib/serveur/supabase.js";
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
    return NextResponse.json(
      { erreur: "La commande en ligne n'est pas encore activée sur ce site. Copiez votre dossier ou téléchargez-le en PDF pour l'envoyer.", nonConfigure: true },
      { status: 503 },
    );
  }

  const numero = numeroCommande();
  let enregistree = false;
  if (sb) {
    const { error } = await sb.from("kaizen_commandes").insert({
      numero,
      email: commande.contact.email,
      nom: commande.contact.nom,
      telephone: commande.contact.telephone || null,
      entreprise: commande.contact.entreprise || null,
      formule: commande.formule,
      projet: { ...commande.projet, message: commande.contact.message, pieces: commande.pieces.map((p) => p.nom) },
      recap: commande.recap,
    });
    if (error) console.error("Kaizen /commande Supabase :", error.message);
    else enregistree = true;
  }

  let envoyee = false;
  if (emailEquipe) {
    const { texte, html } = resumeCommande(commande, numero);
    try {
      await envoyerEmail({
        a: process.env.KAIZEN_EMAIL,
        sujet: `🛒 Nouvelle commande ${numero} — ${commande.recap.titre || commande.projet.nom || "application"} (${commande.contact.nom})`,
        texte: `${texte}\n\nEspace équipe : ${urlSite(request)}/admin`,
        html, repondreA: commande.contact.email, pieces: commande.pieces,
      });
      envoyee = true;
    } catch (e) {
      console.error("Kaizen /commande e-mail :", e?.message);
    }
  }

  if (!enregistree && !envoyee) {
    return NextResponse.json({ erreur: "L'envoi de la commande a échoué. Réessayez dans un instant." }, { status: 502 });
  }

  const c = confirmationClient(commande, numero);
  const espace = sb ? `\n\nSuivez votre commande, vos devis et vos messages : ${urlSite(request)}/connexion (connectez-vous avec ${commande.contact.email}).` : "";
  const confirmationEnvoyee = await notifier({ a: commande.contact.email, sujet: `Votre commande KaizenServer ${numero}`, texte: c.texte + espace, html: c.html, repondreA: process.env.KAIZEN_EMAIL });

  return NextResponse.json({ ok: true, numero, confirmationEnvoyee, espaceClient: enregistree, date: new Date().toISOString() });
}
