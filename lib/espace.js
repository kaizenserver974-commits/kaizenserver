// Règles métier de l'espace client et de l'espace équipe (sans dépendance).

export const STATUTS = [
  { id: "nouvelle", label: "Commande reçue", icone: "📥" },
  { id: "en_etude", label: "Étude par Server", icone: "🔎" },
  { id: "devis_envoye", label: "Offre envoyée", icone: "🧾" },
  { id: "devis_accepte", label: "Offre acceptée", icone: "✅" },
  { id: "en_developpement", label: "En développement", icone: "🛠️" },
  { id: "livree", label: "Application livrée", icone: "🚀" },
  { id: "devis_refuse", label: "Offre refusée", icone: "✖️" },
  { id: "annulee", label: "Annulée", icone: "⏸️" },
];

// Ordre affiché dans la frise de suivi (hors statuts de sortie).
export const PARCOURS_STATUTS = ["nouvelle", "en_etude", "devis_envoye", "devis_accepte", "en_developpement", "livree"];

export const statut = (id) => STATUTS.find((s) => s.id === id) || STATUTS[0];

export function validerMessage(contenu) {
  const t = String(contenu ?? "").trim();
  if (t.length < 1) return { erreur: "Écrivez votre message." };
  if (t.length > 4000) return { erreur: "Message trop long (4000 caractères maximum)." };
  return { contenu: t };
}

export function validerDevis(d = {}) {
  const montant = Number(String(d.montant ?? "").replace(",", ".").replace(/\s/g, ""));
  const delai = d.delaiSemaines === "" || d.delaiSemaines == null ? null : Math.round(Number(d.delaiSemaines));
  const details = String(d.details ?? "").trim().slice(0, 4000);
  if (!Number.isFinite(montant) || montant <= 0 || montant > 10_000_000) return { erreur: "Indiquez un montant valide." };
  if (delai !== null && (!Number.isFinite(delai) || delai <= 0 || delai > 520)) return { erreur: "Indiquez un délai en semaines valide." };
  const acompte = d.acomptePct === "" || d.acomptePct == null ? 0 : Math.round(Number(d.acomptePct));
  if (!Number.isFinite(acompte) || acompte < 0 || acompte > 100) return { erreur: "La part à payer en ligne doit être entre 0 et 100 %." };
  return { devis: { montant: Math.round(montant * 100) / 100, delai_semaines: delai, details, acompte_pct: acompte } };
}

export function estAdmin(email, liste = "") {
  const e = String(email || "").trim().toLowerCase();
  return Boolean(e) && String(liste).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(e);
}

export function nonLus(commandes = [], pour = "client") {
  const auteur = pour === "client" ? "equipe" : "client";
  return commandes.reduce((n, c) => n + (c.messages || []).filter((m) => m.auteur === auteur && !m.lu).length, 0);
}

// ---------- Paiement en ligne (Mollie) ----------

export const ACOMPTES = [
  { pct: 0, label: "Pas de paiement en ligne" },
  { pct: 30, label: "Acompte de 30 %" },
  { pct: 50, label: "Acompte de 50 %" },
  { pct: 100, label: "Totalité (100 %)" },
];

// Montant à régler en ligne pour une offre (arrondi au centime).
export function montantEnLigne(devis) {
  const pct = Number(devis?.acompte_pct || 0);
  if (!pct || !(Number(devis?.montant) > 0)) return 0;
  return Math.round(Number(devis.montant) * pct) / 100;
}

// Format attendu par l'API Mollie : chaîne avec 2 décimales.
export const valeurMollie = (n) => Number(n).toFixed(2);

// Statuts Mollie : open, pending, authorized, paid, canceled, expired, failed.
export const PAIEMENT_FINAL_ECHEC = ["canceled", "expired", "failed"];
export const paiementPaye = (p) => p?.statut === "paid";

// Un paiement « open » récent peut être repris au lieu d'en créer un nouveau.
export function paiementReutilisable(p, maintenant = Date.now()) {
  return Boolean(p && ["open", "pending"].includes(p.statut) && p.checkout_url && maintenant - new Date(p.created_at).getTime() < 50 * 60 * 1000);
}
