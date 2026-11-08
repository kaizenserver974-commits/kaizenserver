import { test } from "node:test";
import assert from "node:assert/strict";
import { analyserIdeeSecours, estimer, recapitulatifSecours, maquetteSecours, nettoyerProjet } from "../lib/moteur.js";

test("une idée de réservation est reconnue", () => {
  const a = analyserIdeeSecours("Je veux une application pour gérer mes réservations et que mes clients paient en ligne");
  assert.equal(a.typeId, "reservation");
  assert.ok(a.fonctionnalites.includes("paiement"));
});

test("une idée d'accompagnement est reconnue", () => {
  assert.equal(analyserIdeeSecours("Je veux accompagner mes clients dans leur parcours de coaching").typeId, "accompagnement");
});

test("le budget trop faible déclenche une première version réduite et une alerte", () => {
  const p = nettoyerProjet({ typeId: "reservation", plateforme: "web", fonctionnalites: ["comptes", "calendrier", "reservation", "rappels", "paiement", "tableau_admin", "messagerie"], budget: "b500", delai: "moins_1m" });
  const e = estimer(p);
  assert.ok(e.v1.fonctionnalites.length < p.fonctionnalites.length);
  assert.ok(e.plusTard.length > 0);
  assert.ok(e.alertes.length >= 2);
  assert.ok(e.v1.coutMin <= e.complet.coutMin);
  assert.ok(e.v1.fonctionnalites.includes("reservation"), "l'action principale reste dans la V1");
});

test("un budget suffisant garde tout dans la première version", () => {
  const p = nettoyerProjet({ typeId: "vitrine", fonctionnalites: ["pages_presentation", "formulaire_contact"], budget: "b1200", delai: "libre" });
  const e = estimer(p);
  assert.deepEqual(e.plusTard, []);
  assert.equal(e.alertes.length, 0);
});

test("récapitulatif et maquette de secours sont complets et échappés", () => {
  const p = nettoyerProjet({ nom: "<script>x</script>", typeId: "reservation", fonctionnalites: ["comptes", "reservation"], budget: "inconnu", delai: "libre" });
  const r = recapitulatifSecours(p, estimer(p));
  assert.ok(r.ecrans.length >= 2);
  const html = maquetteSecours(p, r);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(!html.includes("<script>x</script>"));
});

test("nettoyerProjet rejette les valeurs inconnues", () => {
  const p = nettoyerProjet({ typeId: "pirate", fonctionnalites: ["comptes", "inconnue"], couleur: "red" });
  assert.equal(p.typeId, "autre");
  assert.deepEqual(p.fonctionnalites, ["comptes"]);
  assert.equal(p.couleur, "");
});
