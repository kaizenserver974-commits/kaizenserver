import { test } from "node:test";
import assert from "node:assert/strict";
import { nouveauJeu, recompenser, niveau, recit, UNIVERS } from "../lib/jeu.js";

test("chaque univers a un nom de niveau et un récit pour les 8 étapes", () => {
  assert.ok(UNIVERS.length >= 4);
  for (const u of UNIVERS) { assert.equal(u.niveaux.length, 8); assert.equal(u.recits.length, 8); }
});

test("une récompense n'est gagnée qu'une fois", () => {
  let jeu = nouveauJeu({ univers: "espace", avatar: "robot", pseudo: "Zoé" });
  const r1 = recompenser(jeu, ["idee"]);
  assert.equal(r1.jeu.points, 50);
  assert.deepEqual(r1.gains.badges, ["visionnaire"]);
  const r2 = recompenser(r1.jeu, ["idee"]);
  assert.equal(r2.gains, null);
  assert.equal(r2.jeu.points, 50);
});

test("passage de niveau signalé", () => {
  const jeu = nouveauJeu({ univers: "aventure", avatar: "mage" });
  const { jeu: j, gains } = recompenser(jeu, ["idee", "type", "fonctionnalites"]);
  assert.equal(j.points, 120);
  assert.equal(gains.niveauAtteint, 2);
  assert.equal(niveau(j.points).numero, 2);
});

test("mode classique : aucune récompense", () => {
  const { jeu, gains } = recompenser({ actif: false }, ["idee"]);
  assert.equal(gains, null);
  assert.deepEqual(jeu, { actif: false });
});

test("le récit utilise le pseudo", () => {
  assert.match(recit(nouveauJeu({ univers: "ocean", avatar: "pirate", pseudo: "Lina" }), 0), /Lina/);
});
