// API Mollie (https://docs.mollie.com) appelée en HTTP, sans dépendance.
// Variable : MOLLIE_API_KEY (clé « live_… » ou « test_… » du profil KaizenServer).
export const mollieConfigure = () => Boolean(String(process.env.MOLLIE_API_KEY || "").trim());

async function appelMollie(chemin, options = {}) {
  const r = await fetch(`https://api.mollie.com/v2${chemin}`, {
    ...options,
    headers: { Authorization: `Bearer ${String(process.env.MOLLIE_API_KEY).trim()}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mollie ${r.status} : ${d.detail || d.title || "erreur"}`);
  return d;
}

export function creerPaiementMollie({ montant, description, redirectUrl, webhookUrl, metadata }) {
  return appelMollie("/payments", {
    method: "POST",
    body: JSON.stringify({ amount: { currency: "EUR", value: montant }, description, redirectUrl, webhookUrl, metadata, locale: "fr_FR" }),
  });
}

export function lirePaiementMollie(id) {
  if (!/^tr_[A-Za-z0-9]+$/.test(String(id || ""))) throw new Error("Identifiant Mollie invalide");
  return appelMollie(`/payments/${id}`);
}
