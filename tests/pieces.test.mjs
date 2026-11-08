import test from "node:test";
import assert from "node:assert/strict";
import { solde, debiter, COUT_MAQUETTE, COUT_COMMANDE } from "../lib/pieces.js";
import { recompenser, nouveauJeu } from "../lib/jeu.js";

test("le client arrive à la maquette avec 330 pièces", () => {
  let jeu = nouveauJeu({ univers: "monde-mia", avatar: { forme: "illustre", perso: "mia" }, pseudo: "Mia" });
  jeu = recompenser(jeu, ["idee", "type", "fonctionnalites", "perso", "style", "budget", "precisions", "recap"]).jeu;
  assert.equal(solde({ jeu }), 330);
});

test("payer la maquette puis la commande fait bien baisser les pièces", () => {
  let jeu = nouveauJeu({ univers: "monde-lou", avatar: { forme: "illustre", perso: "lou" }, pseudo: "Lou" });
  jeu = recompenser(jeu, ["idee", "type", "fonctionnalites", "style", "budget", "recap"]).jeu;
  let projet = { jeu, pieces: { achete: 200, depense: 0 } };
  const depart = solde(projet);
  // Maquette : on paie 140, la récompense donne de l'expérience mais pas de pièces.
  projet = { ...projet, pieces: debiter(projet, COUT_MAQUETTE), jeu: recompenser(projet.jeu, ["maquette"]).jeu };
  assert.equal(solde(projet), depart - COUT_MAQUETTE);
  projet = { ...projet, pieces: debiter(projet, COUT_COMMANDE), jeu: recompenser(projet.jeu, ["commande"]).jeu };
  assert.equal(solde(projet), depart - COUT_MAQUETTE - COUT_COMMANDE);
  assert.ok(projet.jeu.points > jeu.points, "le niveau progresse quand même");
});
