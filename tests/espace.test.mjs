import { test } from "node:test";
import assert from "node:assert/strict";
import { validerMessage, validerDevis, estAdmin, nonLus, statut, montantEnLigne, valeurMollie, paiementReutilisable } from "../lib/espace.js";

test("messages : vides et trop longs refusés", () => {
  assert.ok(validerMessage("  ").erreur);
  assert.ok(validerMessage("x".repeat(4001)).erreur);
  assert.equal(validerMessage("  Bonjour ").contenu, "Bonjour");
});

test("devis : montant et délai contrôlés", () => {
  assert.deepEqual(validerDevis({ montant: "6 500,50", delaiSemaines: "8", details: "V1" }).devis, { montant: 6500.5, delai_semaines: 8, details: "V1", acompte_pct: 0 });
  assert.equal(validerDevis({ montant: 100, acomptePct: 30 }).devis.acompte_pct, 30);
  assert.ok(validerDevis({ montant: 100, acomptePct: 150 }).erreur);
  assert.ok(validerDevis({ montant: "-3" }).erreur);
  assert.ok(validerDevis({ montant: "100", delaiSemaines: "0" }).erreur);
  assert.equal(validerDevis({ montant: 100, delaiSemaines: "" }).devis.delai_semaines, null);
});

test("administrateurs : liste par e-mail, insensible à la casse", () => {
  assert.equal(estAdmin("Equipe@Kaizen.fr", "equipe@kaizen.fr, autre@x.fr"), true);
  assert.equal(estAdmin("client@x.fr", "equipe@kaizen.fr"), false);
  assert.equal(estAdmin("", ""), false);
});

test("messages non lus comptés selon le lecteur", () => {
  const c = [{ messages: [{ auteur: "equipe", lu: false }, { auteur: "client", lu: false }, { auteur: "equipe", lu: true }] }];
  assert.equal(nonLus(c, "client"), 1);
  assert.equal(nonLus(c, "equipe"), 1);
  assert.equal(statut("inconnu").id, "nouvelle");
});

test("paiement en ligne : montant de l'acompte et format Mollie", () => {
  assert.equal(montantEnLigne({ montant: 6900, acompte_pct: 30 }), 2070);
  assert.equal(montantEnLigne({ montant: 999.99, acompte_pct: 50 }), 500);
  assert.equal(montantEnLigne({ montant: 6900, acompte_pct: 0 }), 0);
  assert.equal(valeurMollie(2070), "2070.00");
  assert.equal(valeurMollie(12.5), "12.50");
});

test("paiement en ligne : reprise d'un paiement récent seulement", () => {
  const maintenant = Date.parse("2026-11-07T12:00:00Z");
  assert.equal(paiementReutilisable({ statut: "open", checkout_url: "x", created_at: "2026-11-07T11:30:00Z" }, maintenant), true);
  assert.equal(paiementReutilisable({ statut: "open", checkout_url: "x", created_at: "2026-11-07T10:00:00Z" }, maintenant), false);
  assert.equal(paiementReutilisable({ statut: "paid", checkout_url: "x", created_at: "2026-11-07T11:59:00Z" }, maintenant), false);
});
