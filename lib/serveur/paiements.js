// Création et synchronisation des paiements Mollie d'une offre de Server.
import { creerPaiementMollie, lirePaiementMollie, mollieConfigure } from "./mollie.js";
import { montantEnLigne, valeurMollie, paiementPaye, paiementReutilisable } from "../espace.js";
import { notifier, urlSite } from "./email.js";

const eurosTexte = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

// Crée (ou reprend) le paiement en ligne d'une offre acceptée. Retourne l'URL de paiement.
export async function demarrerPaiement(sb, request, commande, devis) {
  if (!mollieConfigure()) return { erreur: "Le paiement en ligne n'est pas encore activé.", status: 503 };
  if (devis.statut !== "accepte") return { erreur: "Acceptez d'abord l'offre de Server.", status: 409 };
  const montant = montantEnLigne(devis);
  if (!montant) return { erreur: "Cette offre ne prévoit pas de paiement en ligne.", status: 409 };
  const paiements = (commande.paiements || []).filter((p) => p.devis_id === devis.id);
  if (paiements.some(paiementPaye)) return { erreur: "Ce paiement est déjà réglé. Merci !", status: 409 };
  const enCours = paiements.find((p) => paiementReutilisable(p));
  if (enCours) return { url: enCours.checkout_url };

  const site = urlSite(request);
  const p = await creerPaiementMollie({
    montant: valeurMollie(montant),
    description: `KaizenServer ${commande.numero} — ${devis.acompte_pct < 100 ? `acompte ${devis.acompte_pct} %` : "règlement"}`.slice(0, 255),
    redirectUrl: `${site}/espace?onglet=devis&paiement=retour`,
    webhookUrl: `${site}/api/paiement/webhook`,
    metadata: { commandeId: commande.id, devisId: devis.id, numero: commande.numero },
  });
  const url = p?._links?.checkout?.href;
  if (!url) throw new Error("Mollie n'a pas renvoyé de page de paiement");
  const { error } = await sb.from("kaizen_paiements").insert({ commande_id: commande.id, devis_id: devis.id, mollie_id: p.id, montant, statut: p.status || "open", checkout_url: url });
  if (error) throw new Error(error.message);
  return { url };
}

// Relit un paiement chez Mollie (seule source de vérité) et met la base à jour.
export async function synchroniserPaiement(sb, request, mollieId) {
  const { data: ligne } = await sb.from("kaizen_paiements").select("*, commande:kaizen_commandes(id, numero, email, nom)").eq("mollie_id", mollieId).maybeSingle();
  if (!ligne) return null;
  const p = await lirePaiementMollie(mollieId);
  const statut = p.status;
  if (statut === ligne.statut) return ligne;
  const devenuPaye = statut === "paid" && ligne.statut !== "paid";
  await sb.from("kaizen_paiements").update({ statut, ...(devenuPaye ? { paid_at: p.paidAt || new Date().toISOString() } : {}) }).eq("id", ligne.id);
  if (devenuPaye) {
    const c = ligne.commande || {};
    await notifier({
      a: process.env.KAIZEN_EMAIL,
      sujet: `💶 Paiement reçu — ${eurosTexte(ligne.montant)} — commande ${c.numero}`,
      texte: `${c.nom || c.email} a réglé ${eurosTexte(ligne.montant)} en ligne (Mollie ${mollieId}).\n\nEspace Server : ${urlSite(request)}/admin`,
      repondreA: c.email,
    });
    await notifier({
      a: c.email,
      sujet: `✅ Paiement reçu — commande ${c.numero}`,
      texte: `Bonjour ${c.nom || ""},\n\nNous avons bien reçu votre paiement de ${eurosTexte(ligne.montant)}. Merci !\nServer, votre maître du jeu, lance la suite de votre projet.\n\nVotre espace : ${urlSite(request)}/espace`,
      repondreA: process.env.KAIZEN_EMAIL,
    });
  }
  return { ...ligne, statut };
}

// Rattrapage : si le webhook n'est pas encore passé, on relit les paiements en attente.
export async function rafraichirPaiementsEnAttente(sb, request, commandes) {
  if (!mollieConfigure()) return false;
  const enAttente = commandes.flatMap((c) => c.paiements || []).filter((p) => ["open", "pending", "authorized"].includes(p.statut) && Date.now() - new Date(p.created_at).getTime() < 48 * 3600 * 1000).slice(0, 5);
  let change = false;
  for (const p of enAttente) {
    try { const r = await synchroniserPaiement(sb, request, p.mollie_id); if (r && r.statut !== p.statut) change = true; } catch (e) { console.error("Kaizen paiement sync :", e?.message); }
  }
  return change;
}
