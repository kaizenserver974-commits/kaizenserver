import { NextResponse } from "next/server";
import { validerCommande, numeroCommande, resumeCommande, confirmationClient } from "../../../lib/commande.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Envoi par Resend (https://resend.com) via son API HTTP.
// Variables : RESEND_API_KEY, KAIZEN_EMAIL (adresse qui reçoit les commandes),
// KAIZEN_EMAIL_FROM (expéditeur vérifié dans Resend, facultatif).
async function envoyer({ a, sujet, texte, html, repondreA }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.KAIZEN_EMAIL_FROM || "KaizenServer <onboarding@resend.dev>",
      to: [a],
      subject: sujet,
      text: texte,
      html,
      ...(repondreA ? { reply_to: repondreA } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status} : ${(await r.text()).slice(0, 200)}`);
}

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

  if (!process.env.RESEND_API_KEY || !process.env.KAIZEN_EMAIL) {
    return NextResponse.json(
      { erreur: "La commande en ligne n'est pas encore activée sur ce site. Copiez votre dossier ou téléchargez-le en PDF pour l'envoyer.", nonConfigure: true },
      { status: 503 },
    );
  }

  const numero = numeroCommande();
  const { texte, html } = resumeCommande(commande, numero);
  try {
    await envoyer({
      a: process.env.KAIZEN_EMAIL,
      sujet: `🛒 Nouvelle commande ${numero} — ${commande.recap.titre || commande.projet.nom || "application"} (${commande.contact.nom})`,
      texte, html, repondreA: commande.contact.email,
    });
  } catch (e) {
    console.error("Kaizen /commande :", e?.message);
    return NextResponse.json({ erreur: "L'envoi de la commande a échoué. Réessayez dans un instant." }, { status: 502 });
  }

  // La confirmation au client est un plus : son échec ne bloque pas la commande.
  let confirmationEnvoyee = true;
  try {
    const c = confirmationClient(commande, numero);
    await envoyer({ a: commande.contact.email, sujet: `Votre commande KaizenServer ${numero}`, ...c, repondreA: process.env.KAIZEN_EMAIL });
  } catch (e) {
    confirmationEnvoyee = false;
    console.error("Kaizen /commande confirmation :", e?.message);
  }

  return NextResponse.json({ ok: true, numero, confirmationEnvoyee, date: new Date().toISOString() });
}
