import { NextResponse } from "next/server";
import { QUESTIONS_AIDE, repondreSansIA } from "../../../lib/aide.js";
import { iaDisponible, demanderTexte } from "../../../lib/ia.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let question = "";
  try { ({ question = "" } = await request.json()); } catch { /* corps invalide */ }
  question = String(question).trim().slice(0, 500);
  if (question.length < 3) return NextResponse.json({ erreur: "Posez votre question en quelques mots." }, { status: 400 });

  if (iaDisponible()) {
    try {
      const reponse = await demanderTexte({
        consignes: `Tu es Bip, l'assistant d'aide du site KaizenServer, qui aide des personnes à transformer leur idée en application puis à la commander.
Réponds en 2 à 4 phrases, chaleureusement, sans jargon. Si la question sort du sujet (création d'applications, KaizenServer), ramène gentiment vers le projet.
Ne donne JAMAIS de prix, de fourchette de prix ni de délai : c'est Server, le maître du jeu (une vraie personne), qui les donne après la commande. N'invente aucun chiffre. Appuie-toi sur ces informations :
${QUESTIONS_AIDE.map((x) => `- ${x.q} ${x.r}`).join("\n")}`,
        contenu: question,
      });
      return NextResponse.json({ reponse: reponse.trim().slice(0, 1200), source: "ia" });
    } catch (e) {
      console.error("Kaizen /aide IA :", e?.message);
    }
  }
  return NextResponse.json({ reponse: repondreSansIA(question), source: "faq" });
}
