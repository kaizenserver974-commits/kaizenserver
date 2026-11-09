import { NextResponse } from "next/server";
import { numeroCommande, validerPreinscription, CADRES } from "../../../lib/commande.js";
import { supabaseAdmin } from "../../../lib/serveur/supabase.js";
import { emailConfigure, envoyerEmail, notifier, urlSite } from "../../../lib/serveur/email.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pré-inscription (page /bientot, partagée sur les réseaux) : enregistrée comme un projet
// dans l'Espace Server, avec un e-mail à l'équipe et une confirmation à la personne.
export async function POST(request) {
  let corps;
  try { corps = await request.json(); } catch { return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 }); }
  if (corps?.siteWeb) return NextResponse.json({ ok: true }); // champ piège anti-robots
  const { erreurs, p } = validerPreinscription(corps);
  if (erreurs.length) return NextResponse.json({ erreur: erreurs.join(" ") }, { status: 400 });

  const numero = numeroCommande();
  const cadre = CADRES.find((c) => c.id === p.cadre)?.label;
  const sb = supabaseAdmin();
  let enregistree = false;
  if (sb) {
    const { error } = await sb.from("kaizen_commandes").insert({
      numero, email: p.email, nom: p.nom, telephone: p.telephone || null, entreprise: p.entreprise || null,
      formule: "preinscription", statut: "nouvelle",
      projet: { nom: p.titre, idee: p.idee, fonctionnalites: [], personnalisees: [], cadre: p.cadre, budgetLibre: p.budget, delaiLibre: p.delai, source: p.source },
      recap: { titre: p.titre || "Projet (pré-inscription)", resume: `${cadre}. ${p.idee}`.slice(0, 1200) },
    });
    if (error) console.error("Kaizen pré-inscription :", error.message); else enregistree = true;
  }
  let envoyee = false;
  if (emailConfigure() && process.env.KAIZEN_EMAIL) {
    const lignes = [["Numéro", numero], ["Nom", p.nom], ["E-mail", p.email], ["Téléphone", p.telephone || "—"], ["Entreprise", p.entreprise || "—"], ["Pour", cadre], ["Projet", p.titre || "—"], ["Description", p.idee], ["Budget", p.budget || "—"], ["Délai", p.delai || "—"], ["Venu de", p.source]];
    try {
      await envoyerEmail({ a: process.env.KAIZEN_EMAIL, sujet: `📣 Nouveau projet (pré-inscription) ${numero} — ${p.nom}`, texte: `${lignes.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\nEspace Server : ${urlSite(request)}/admin`, repondreA: p.email });
      envoyee = true;
    } catch (e) { console.error("Kaizen pré-inscription e-mail :", e?.message); }
  }
  if (!enregistree && !envoyee) return NextResponse.json({ erreur: "L'envoi n'a pas abouti. Réessayez dans un instant." }, { status: 502 });
  await notifier({
    a: p.email, sujet: "Votre projet est bien reçu — KaizenServer", repondreA: process.env.KAIZEN_EMAIL,
    texte: `Bonjour ${p.nom},\n\nMerci ! Nous avons bien reçu votre projet${p.titre ? ` « ${p.titre} »` : ""} (n° ${numero}).\nServer, le maître du jeu, l'étudie et vous recontacte avec ses conseils et une proposition à prix doux.\n\nLe monde Kaizen ouvre bientôt : vous serez parmi les premiers prévenus.\n\nServer — KaizenServer\n${urlSite(request)}`,
  });
  return NextResponse.json({ ok: true, numero });
}
