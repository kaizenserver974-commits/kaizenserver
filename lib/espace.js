// Règles métier de l'espace client et de l'espace équipe (sans dépendance).

export const STATUTS = [
  { id: "nouvelle", label: "Commande reçue", icone: "📥" },
  { id: "en_etude", label: "En étude", icone: "🔎" },
  { id: "devis_envoye", label: "Devis envoyé", icone: "🧾" },
  { id: "devis_accepte", label: "Devis accepté", icone: "✅" },
  { id: "en_developpement", label: "En développement", icone: "🛠️" },
  { id: "livree", label: "Application livrée", icone: "🚀" },
  { id: "devis_refuse", label: "Devis refusé", icone: "✖️" },
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
  return { devis: { montant: Math.round(montant * 100) / 100, delai_semaines: delai, details } };
}

export function estAdmin(email, liste = "") {
  const e = String(email || "").trim().toLowerCase();
  return Boolean(e) && String(liste).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(e);
}

export function nonLus(commandes = [], pour = "client") {
  const auteur = pour === "client" ? "equipe" : "client";
  return commandes.reduce((n, c) => n + (c.messages || []).filter((m) => m.auteur === auteur && !m.lu).length, 0);
}
