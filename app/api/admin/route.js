import { NextResponse } from "next/server";
import { texteSignet, htmlSignet } from "../../../lib/signet.js";
import { supabaseAdmin, supabaseConfigure, utilisateur, chargerCommandes, lireMaquette, enregistrerMaquette, lirePiecesJointes } from "../../../lib/serveur/supabase.js";
import { genererMaquette, validerImagesReference } from "../../../lib/serveur/generation.js";
import { nettoyerProjet, estimer, recapitulatifSecours } from "../../../lib/moteur.js";
import { STATUTS, validerMessage, validerDevis, statut, nonLus } from "../../../lib/espace.js";
import { notifier, urlSite } from "../../../lib/serveur/email.js";
import { mollieConfigure } from "../../../lib/serveur/mollie.js";
import { rafraichirPaiementsEnAttente } from "../../../lib/serveur/paiements.js";
import { montantEnLigne, validerLien, validerNouveauProjet, validerInfos, offreModifiable } from "../../../lib/espace.js";
import { numeroCommande, emailMaquetteEnvoyee } from "../../../lib/commande.js";
import { genererImage, validerImageImportee, validerMaquetteAtelier } from "../../../lib/serveur/images.js";
import { assainir } from "../../../lib/serveur/generation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro : l'IA peut prendre plus d'une minute (surtout avec des images)

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
    return refus(`Impossible de charger les commandes. (Détail : ${e?.message || "inconnu"} — si une table manque, relancez supabase/schema.sql dans Supabase.)`, 500);
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

  // ——— Atelier : galerie d'images (générées par l'IA ou importées) ———
  const tableImagesManquante = (e) => /kaizen_images|relation|does not exist|schema cache/i.test(String(e?.message || ""));
  const erreurImages = (e) => refus(tableImagesManquante(e) ? "La galerie n'est pas encore activée : relancez supabase/schema.sql dans Supabase (SQL Editor)." : "La galerie est indisponible pour le moment.", 500);
  if (corps.action === "images_lister") {
    const { data, error } = await sb.from("kaizen_images").select("id, description, origine, created_at").order("created_at", { ascending: false }).limit(60);
    if (error) return erreurImages(error);
    return NextResponse.json({ ok: true, images: data });
  }
  if (corps.action === "image_generer" || corps.action === "image_ajouter") {
    let image;
    const description = String(corps.description || "").trim().slice(0, 1000);
    if (corps.action === "image_generer") {
      if (!process.env.OPENAI_API_KEY) return refus("L'IA n'est pas configurée (OPENAI_API_KEY absente dans Vercel).", 503);
      if (description.length < 5) return refus("Décrivez l'image en quelques mots.", 400);
      try { image = await genererImage(description, corps.format); } catch (e) { return refus(e.message, 502); }
    } else {
      image = validerImageImportee(corps.image);
      if (!image) return refus("Image invalide ou trop lourde (JPG, PNG ou WebP).", 400);
    }
    const { data, error } = await sb.from("kaizen_images").insert({ ...image, description: description || "Image importée", origine: corps.action === "image_generer" ? "ia" : "import" }).select("id, description, origine, created_at").single();
    if (error) return erreurImages(error);
    return NextResponse.json({ ok: true, image: data });
  }
  if (corps.action === "image_supprimer") {
    const { error } = await sb.from("kaizen_images").delete().eq("id", String(corps.imageId || ""));
    if (error) return erreurImages(error);
    return NextResponse.json({ ok: true });
  }

  const [commande] = await chargerCommandes(sb, { id: String(corps.commandeId || "") }).catch(() => []);
  if (!commande) return refus("Commande introuvable.", 404);
  const lienClient = `${urlSite(request)}/connexion`;

  if (corps.action === "infos_modifier") {
    const { infos, erreur } = validerInfos(corps);
    if (erreur) return refus(erreur, 400);
    const { error } = await sb.from("kaizen_commandes").update({
      nom: infos.nom, email: infos.email, telephone: infos.telephone || null, entreprise: infos.entreprise || null,
      projet: { ...(commande.projet || {}), nom: infos.titre || commande.projet?.nom, idee: infos.idee },
      recap: { ...(commande.recap || {}), titre: infos.titre || commande.recap?.titre },
      updated_at: new Date().toISOString(),
    }).eq("id", commande.id);
    if (error) return refus("Les modifications n'ont pas pu être enregistrées.", 500);
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "devis_modifier" || corps.action === "devis_retirer") {
    const ancien = commande.devis.find((d) => d.id === corps.devisId);
    if (!ancien) return refus("Offre introuvable.", 404);
    if (!offreModifiable(ancien, commande.paiements)) return refus("Cette offre a déjà reçu une réponse du client : envoyez plutôt une nouvelle offre.", 409);
    if (corps.action === "devis_retirer") {
      const { error } = await sb.from("kaizen_devis").delete().eq("id", ancien.id).eq("statut", "envoye");
      if (error) return refus("L'offre n'a pas pu être retirée.", 500);
      if (!commande.devis.some((d) => d.id !== ancien.id)) await sb.from("kaizen_commandes").update({ statut: "en_etude", updated_at: new Date().toISOString() }).eq("id", commande.id);
      return NextResponse.json({ ok: true });
    }
    const { devis, erreur } = validerDevis(corps);
    if (erreur) return refus(erreur, 400);
    const { error } = await sb.from("kaizen_devis").update(devis).eq("id", ancien.id).eq("statut", "envoye");
    if (error) return refus("L'offre n'a pas pu être modifiée.", 500);
    if (corps.prevenir) {
      const montant = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(devis.montant);
      await notifier({
        a: commande.email,
        sujet: `🧾 Offre mise à jour par Server — commande ${commande.numero}`,
        texte: `Bonjour ${commande.nom || ""},\n\nServer, votre maître du jeu, a mis à jour son offre : ${montant}${devis.delai_semaines ? `, environ ${devis.delai_semaines} semaines` : ""}.\n${devis.details ? `\n${devis.details}\n` : ""}\nConsultez-la depuis votre espace : ${lienClient}`,
        repondreA: process.env.KAIZEN_EMAIL,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "pieces_lire") {
    const pieces = await lirePiecesJointes(sb, commande.id);
    return NextResponse.json({ ok: true, pieces: pieces.map((p) => ({ nom: p.nom, type: p.type, url: `data:${p.type};base64,${p.contenu}` })) });
  }

  if (corps.action === "maquette_lire") {
    const m = await lireMaquette(sb, commande.id);
    return m ? NextResponse.json({ ok: true, ...m }) : refus("Pas encore de maquette pour ce projet.", 404);
  }

  // Atelier : maquette créée ou retouchée à la main par Server.
  if (corps.action === "maquette_enregistrer") {
    const { html, erreur } = validerMaquetteAtelier(corps.html);
    if (erreur) return refus(erreur, 400);
    try { await enregistrerMaquette(sb, commande.id, assainir(html), "server"); } catch (e) { return refus(`La maquette n'a pas pu être enregistrée (${e.message}).`, 500); }
    return NextResponse.json({ ok: true });
  }

  // Server envoie la maquette au client (« votre vœu est exaucé » pour une demande au génie) :
  // un message dans son espace + un e-mail avec le lien de la maquette.
  if (corps.action === "maquette_envoyer") {
    if (!commande.maquette) return refus("Enregistrez d'abord une maquette pour ce projet.", 400);
    const mot = String(corps.mot || "").trim().slice(0, 1500);
    const genie = commande.formule === "genie";
    const lienMaquette = commande.maquette.jeton ? `${urlSite(request)}/maquette/${commande.maquette.jeton}` : lienClient;
    const contenu = `${genie ? "🧞 Votre vœu est exaucé ! Votre maquette sur mesure est prête." : "🖼️ Votre maquette est prête."} Retrouvez-la ci-dessous : vous pouvez l'accepter ou demander une modification.${mot ? `\n\n${mot}` : ""}`;
    const { error } = await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "equipe", type: "message", contenu });
    if (error) return refus("Le message n'a pas pu être envoyé.", 500);
    await sb.from("kaizen_commandes").update({ projet: { ...(commande.projet || {}), maquetteEnvoyeeLe: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq("id", commande.id);
    const email = emailMaquetteEnvoyee({ nom: commande.nom, numero: commande.numero, genie, mot, lienMaquette, lienEspace: lienClient });
    const envoye = await notifier({ a: commande.email, ...email, repondreA: process.env.KAIZEN_EMAIL });
    return NextResponse.json({ ok: true, email: envoye });
  }

  // Server demande à l'IA de (re)créer la maquette à partir de la description du projet.
  if (corps.action === "maquette_generer") {
    try {
      const consignes = String(corps.consignes || "").trim().slice(0, 2000);
      // Images de Server d'abord, puis celles du client (3 au total).
      const imagesClient = (await lirePiecesJointes(sb, commande.id))
        .filter((p) => /^image\/(png|jpe?g|webp)$/.test(p.type)).map((p) => `data:${p.type};base64,${p.contenu}`);
      const images = validerImagesReference([...(corps.images || []), ...imagesClient]);
      const ideeActuelle = String(commande.projet?.idee || "").trim();
      // Une description trop courte est remplacée par les consignes saisies par Server.
      const idee = ideeActuelle.length >= 10 ? ideeActuelle : consignes;
      const projet = nettoyerProjet({ ...(commande.projet || {}), idee, nom: commande.recap?.titre || commande.projet?.nom });
      if (projet.idee.trim().length < 10) return refus("Décrivez le projet en une phrase au moins (zone « Vos améliorations visuelles ») pour générer la maquette.", 400);
      if (idee !== ideeActuelle) await sb.from("kaizen_commandes").update({ projet: { ...(commande.projet || {}), idee } }).eq("id", commande.id);
      // Récapitulatif instantané (moteur de règles) pour rester sous la limite de temps :
      // l'IA est réservée à la maquette, qui reçoit aussi les consignes et les images.
      const recap = commande.recap?.ecrans?.length ? commande.recap : recapitulatifSecours(projet, estimer(projet));
      // Option : Server améliore la maquette actuelle du client au lieu de repartir de zéro.
      const base = corps.partirDeLaMaquette ? (await lireMaquette(sb, commande.id))?.html || "" : "";
      const { html, source, raison } = await genererMaquette(projet, recap, { consignes, images, auteur: "server", base, demandes: String(consignes || "").split(/\n+|(?<=[.!?;])\s+/).map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter((x) => x.length > 3) });
      await enregistrerMaquette(sb, commande.id, html, source);
      if (recap !== commande.recap) await sb.from("kaizen_commandes").update({ recap: { ...recap, titre: commande.recap?.titre || recap.titre || projet.nom } }).eq("id", commande.id);
      return NextResponse.json({ ok: true, source, raison });
    } catch (e) {
      console.error("Kaizen maquette Server :", e?.message);
      return refus("La maquette n'a pas pu être générée. Réessayez.", 502);
    }
  }

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

  // Envoie au client le lien du site et comment installer le signet (icône sur l'écran d'accueil).
  if (corps.action === "signet") {
    const site = urlSite(request);
    const lien = ["accueil", "nouveau", "espace"].includes(corps.page) ? `${site}${corps.page === "accueil" ? "/" : `/${corps.page}`}` : `${site}/`;
    const mot = String(corps.mot || "").trim().slice(0, 1500);
    const ok = await notifier({
      a: commande.email,
      sujet: "📲 Votre accès KaizenServer (et comment l'installer sur votre téléphone)",
      texte: `Bonjour ${commande.nom || ""},\n\n${mot ? `${mot}\n\n` : ""}Voici votre accès à KaizenServer : ${lien}\n\nGardez KaizenServer sur votre écran d'accueil :\n\n${texteSignet(lien)}\n\nExplications illustrées : ${site}/installer\n\nServer — KaizenServer`,
      html: htmlSignet({ nom: commande.nom, lien, mot, site }),
      repondreA: process.env.KAIZEN_EMAIL,
    });
    if (!ok) return refus("L'e-mail n'a pas pu être envoyé (vérifiez la configuration Resend).", 502);
    // Trace dans le fil de messages du projet.
    await sb.from("kaizen_messages").insert({ commande_id: commande.id, auteur: "equipe", type: "message", contenu: `📲 Lien du site et explications pour installer le signet envoyés par e-mail (${lien}).${mot ? `\n\n${mot}` : ""}` });
    return NextResponse.json({ ok: true });
  }

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
