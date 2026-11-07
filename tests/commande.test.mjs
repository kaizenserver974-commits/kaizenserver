import { test } from "node:test";
import assert from "node:assert/strict";
import { validerCommande, numeroCommande, resumeCommande } from "../lib/commande.js";

const base = {
  contact: { nom: "Lina Martin", email: "lina@exemple.fr", telephone: "06 12 34 56 78" },
  formule: "v1",
  consentement: true,
  projet: { idee: "Une application de réservation pour mon salon", typeId: "reservation", fonctionnalites: ["reservation", "comptes"], budget: "5k_10k", delai: "1_3m", priorite: "elevee" },
  recap: { titre: "RésaSalon", resume: "Réservation en ligne", v1: ["Réservation"] },
};

test("une commande complète est valide", () => {
  assert.deepEqual(validerCommande(base).erreurs, []);
});

test("e-mail, nom et consentement sont obligatoires", () => {
  const r = validerCommande({ ...base, contact: { nom: "L", email: "pas-un-email" }, consentement: false });
  assert.equal(r.erreurs.length, 3);
});

test("le numéro de commande a le bon format", () => {
  assert.match(numeroCommande(new Date("2026-11-01T10:00:00Z")), /^KZ-20261101-[A-Z0-9]{4}$/);
});

test("le résumé contient les infos clés et échappe le HTML", () => {
  const c = validerCommande({ ...base, contact: { ...base.contact, message: "<script>x</script>" } });
  const { texte, html } = resumeCommande(c, "KZ-1");
  assert.match(texte, /Lina Martin/);
  assert.match(texte, /Élevée/);
  assert.ok(!html.includes("<script>x</script>"));
});

test("pièces jointes : format et taille contrôlés", () => {
  const ok = validerCommande({ ...base, pieces: [{ nom: "logo.png", type: "image/png", contenu: "iVBORw0KGgo=" }] });
  assert.deepEqual(ok.erreurs, []);
  assert.equal(ok.pieces[0].nom, "logo.png");
  const mauvais = validerCommande({ ...base, pieces: [{ nom: "virus.exe", type: "application/x-msdownload", contenu: "TVqQ" }] });
  assert.equal(mauvais.erreurs.length, 1);
  const trop = validerCommande({ ...base, pieces: [1, 2, 3, 4].map(() => ({ nom: "a.png", type: "image/png", contenu: "AAAA" })) });
  assert.equal(trop.erreurs.length, 1);
});

import { solde, debiter, crediter, BONUS_CLASSIQUE, COUT_MODIFICATION, COUT_COMMANDE } from "../lib/pieces.js";
test("pièces : solde, débit, crédit", () => {
  const p = { jeu: { actif: true, points: 70 } };
  assert.equal(solde(p), 70);
  const apres = { ...p, pieces: debiter(p, 30) };
  assert.equal(solde(apres), 40);
  assert.equal(debiter({ ...apres, pieces: debiter(apres, 30) }, 30), null);
  assert.equal(solde({ ...apres, pieces: crediter(apres, 60) }), 100);
  assert.equal(solde({ jeu: { actif: false } }), BONUS_CLASSIQUE);
  assert.equal(COUT_MODIFICATION, 60);
  assert.equal(COUT_COMMANDE, 140);
});
