// Achat de pièces d'or par Mollie : les pièces sont créditées sur le portefeuille
// du compte connecté (serveur), une seule fois par achat.
import { creerPaiementMollie, lirePaiementMollie, mollieConfigure } from "./mollie.js";
import { trouverPack } from "../pieces.js";
import { valeurMollie } from "../espace.js";
import { urlSite } from "./email.js";
import { crediter, lireSolde, bourse } from "./portefeuille.js";

export async function acheterPieces(sb, request, { pack, projetLocal, email }) {
  if (!mollieConfigure() || !sb) return { erreur: "La recharge de pièces n'est pas encore activée.", status: 503 };
  if (!email) return { erreur: "Connectez-vous pour acheter des pièces d'or.", status: 401 };
  const p = trouverPack(pack);
  if (!p) return { erreur: "Pack inconnu.", status: 400 };
  // Les pièces achetées vont dans la bourse du projet en cours.
  const projet = String(projetLocal || "");
  const cleBourse = bourse(email, projet);
  if (!cleBourse) return { erreur: "Ouvrez votre projet pour acheter des pièces.", status: 400 };
  const retour = `/nouveau?id=${encodeURIComponent(projet)}&`;
  const id = crypto.randomUUID();
  const site = urlSite(request);
  const paiement = await creerPaiementMollie({
    montant: valeurMollie(p.prix),
    description: `KaizenServer — ${p.pieces} pièces d'or`,
    redirectUrl: `${site}${retour}achat=${id}`,
    webhookUrl: `${site}/api/paiement/webhook`,
    metadata: { type: "pieces", achat: id, pieces: p.pieces },
  });
  const url = paiement?._links?.checkout?.href;
  if (!url) throw new Error("Mollie n'a pas renvoyé de page de paiement");
  const { error } = await sb.from("kaizen_achats_pieces").insert({ id, mollie_id: paiement.id, pack: p.id, pieces: p.pieces, montant: p.prix, statut: paiement.status || "open", projet_local: projet, email: cleBourse });
  if (error) throw new Error(error.message);
  return { url, achat: id };
}

// Relit le paiement chez Mollie et crédite le compte s'il est payé (une seule fois grâce à la clé).
async function synchroniserAchat(sb, ligne) {
  const p = await lirePaiementMollie(ligne.mollie_id);
  if (p.status !== ligne.statut) {
    await sb.from("kaizen_achats_pieces").update({ statut: p.status, ...(p.status === "paid" ? { paid_at: p.paidAt || new Date().toISOString() } : {}) }).eq("id", ligne.id);
  }
  if (p.status !== "paid" || !ligne.email) return { statut: p.status, credite: false };
  await crediter(sb, ligne.email, ligne.pieces, `Achat de ${ligne.pieces} pièces d'or`, `achat:${ligne.id}`);
  if (!ligne.reclame) await sb.from("kaizen_achats_pieces").update({ reclame: true }).eq("id", ligne.id);
  return { statut: "paid", credite: true };
}

// Retour du client après paiement.
export async function verifierAchat(sb, achat, email) {
  if (!sb || !/^[0-9a-f-]{36}$/i.test(String(achat || ""))) return { erreur: "Achat invalide.", status: 400 };
  const { data: ligne } = await sb.from("kaizen_achats_pieces").select("*").eq("id", achat).maybeSingle();
  if (!ligne) return { erreur: "Achat introuvable.", status: 404 };
  if (email && ligne.email && ligne.email !== email && !ligne.email.startsWith(`${email}#`)) return { erreur: "Cet achat appartient à un autre compte.", status: 403 };
  const deja = ligne.reclame;
  const r = await synchroniserAchat(sb, ligne);
  const solde = ligne.email ? await lireSolde(sb, ligne.email) : undefined;
  return { statut: r.statut, pieces: r.credite && !deja ? ligne.pieces : 0, deja, solde };
}

// Webhook Mollie : si le paiement est un achat de pièces, on le traite ici. Retourne true si c'était le cas.
export async function webhookAchat(sb, mollieId) {
  const { data: ligne } = await sb.from("kaizen_achats_pieces").select("*").eq("mollie_id", mollieId).maybeSingle();
  if (!ligne) return false;
  await synchroniserAchat(sb, ligne);
  return true;
}
