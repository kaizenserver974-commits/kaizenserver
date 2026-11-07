// Achat de pièces d'or par Mollie (parcours, sans compte obligatoire).
import { creerPaiementMollie, lirePaiementMollie, mollieConfigure } from "./mollie.js";
import { trouverPack } from "../pieces.js";
import { valeurMollie } from "../espace.js";
import { urlSite } from "./email.js";

export async function acheterPieces(sb, request, { pack, projetLocal }) {
  if (!mollieConfigure() || !sb) return { erreur: "La recharge de pièces n'est pas encore activée.", status: 503 };
  const p = trouverPack(pack);
  if (!p) return { erreur: "Pack inconnu.", status: 400 };
  const projet = String(projetLocal || "");
  if (!/^[\w-]{6,80}$/.test(projet)) return { erreur: "Projet invalide.", status: 400 };
  const id = crypto.randomUUID();
  const site = urlSite(request);
  const paiement = await creerPaiementMollie({
    montant: valeurMollie(p.prix),
    description: `KaizenServer — ${p.pieces} pièces d'or`,
    redirectUrl: `${site}/nouveau?id=${encodeURIComponent(projet)}&achat=${id}`,
    metadata: { type: "pieces", achat: id, pieces: p.pieces },
  });
  const url = paiement?._links?.checkout?.href;
  if (!url) throw new Error("Mollie n'a pas renvoyé de page de paiement");
  const { error } = await sb.from("kaizen_achats_pieces").insert({ id, mollie_id: paiement.id, pack: p.id, pieces: p.pieces, montant: p.prix, statut: paiement.status || "open", projet_local: projet });
  if (error) throw new Error(error.message);
  return { url, achat: id };
}

// Vérifie un achat chez Mollie ; les pièces ne peuvent être récupérées qu'une seule fois.
export async function verifierAchat(sb, achat) {
  if (!sb || !/^[0-9a-f-]{36}$/i.test(String(achat || ""))) return { erreur: "Achat invalide.", status: 400 };
  const { data: ligne } = await sb.from("kaizen_achats_pieces").select("*").eq("id", achat).maybeSingle();
  if (!ligne) return { erreur: "Achat introuvable.", status: 404 };
  if (ligne.reclame) return { statut: "paid", pieces: 0, deja: true };
  const p = await lirePaiementMollie(ligne.mollie_id);
  if (p.status !== ligne.statut) await sb.from("kaizen_achats_pieces").update({ statut: p.status, ...(p.status === "paid" ? { paid_at: p.paidAt || new Date().toISOString() } : {}) }).eq("id", ligne.id);
  if (p.status !== "paid") return { statut: p.status, pieces: 0 };
  const { data: maj } = await sb.from("kaizen_achats_pieces").update({ reclame: true }).eq("id", ligne.id).eq("reclame", false).select("pieces");
  return { statut: "paid", pieces: maj?.[0]?.pieces || 0, deja: !maj?.length };
}
