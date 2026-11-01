import { test } from "node:test";
import assert from "node:assert/strict";
import { validerMessage, validerDevis, estAdmin, nonLus, statut } from "../lib/espace.js";

test("messages : vides et trop longs refusés", () => {
  assert.ok(validerMessage("  ").erreur);
  assert.ok(validerMessage("x".repeat(4001)).erreur);
  assert.equal(validerMessage("  Bonjour ").contenu, "Bonjour");
});

test("devis : montant et délai contrôlés", () => {
  assert.deepEqual(validerDevis({ montant: "6 500,50", delaiSemaines: "8", details: "V1" }).devis, { montant: 6500.5, delai_semaines: 8, details: "V1" });
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
