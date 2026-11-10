import { NextResponse } from "next/server";
import { TYPES, FONCTIONNALITES, PLATEFORMES } from "../../../lib/catalogue.js";
import { analyserIdeeSecours } from "../../../lib/moteur.js";
import { iaDisponible, demanderJSON, s } from "../../../lib/ia.js";
import { utilisateur, supabaseConfigure } from "../../../lib/serveur/supabase.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = s.obj({
  typeId: s.enumStr(TYPES.map((t) => t.id)),
  plateforme: s.enumStr(PLATEFORMES.map((p) => p.id)),
  nomSuggere: s.str(),
  reformulation: s.str(),
  publicCible: s.str(),
  fonctionnalites: s.arr(s.enumStr(FONCTIONNALITES.map((f) => f.id))),
  suggestionsPersonnalisees: s.arr(s.str()),
  questions: s.arr(s.str()),
});

export async function POST(request) {
  // Réservé aux personnes connectées (protège aussi la facture de l'IA).
  if (supabaseConfigure() && !(await utilisateur(request))) return NextResponse.json({ erreur: "Connectez-vous pour utiliser les services de Kaizen.", connexion: true }, { status: 401 });
  let idee = "";
  try {
    ({ idee = "" } = await request.json());
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  idee = String(idee).trim().slice(0, 2000);
  if (idee.length < 10) {
    return NextResponse.json({ erreur: "Décrivez votre idée en une ou deux phrases." }, { status: 400 });
  }

  if (iaDisponible()) {
    try {
      const analyse = await demanderJSON({
        nom: "analyse_idee",
        schema,
        consignes: `
Analyse l'idée d'application décrite par la personne.
- typeId : le type le plus proche parmi : ${TYPES.map((t) => `${t.id} (${t.label})`).join(", ")}.
- plateforme : "web" par défaut, "mobile" seulement si la personne parle explicitement d'application à installer.
- nomSuggere : un nom court et mémorable pour l'application (2 mots max).
- reformulation : reformule l'idée en 1 à 2 phrases claires, en commençant par "Vous souhaitez".
- publicCible : qui va utiliser l'application, en une phrase.
- fonctionnalites : 4 à 7 identifiants du catalogue vraiment utiles pour cette idée. Catalogue : ${FONCTIONNALITES.map((f) => `${f.id} = ${f.label}`).join(" ; ")}.
- suggestionsPersonnalisees : 0 à 3 fonctionnalités spécifiques à cette idée qui ne sont PAS dans le catalogue (phrase courte).
- questions : 3 questions simples qui aideront à préciser le besoin.`,
        contenu: idee,
      });
      return NextResponse.json({ ...analyse, source: "ia" });
    } catch (e) {
      console.error("Kaizen /analyser IA :", e?.message);
    }
  }
  return NextResponse.json(analyserIdeeSecours(idee));
}
