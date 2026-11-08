import test from "node:test";
import assert from "node:assert/strict";
import { dossierClient } from "../lib/serveur/generation.js";
import { nettoyerProjet } from "../lib/moteur.js";

test("l'IA reçoit tout ce que le client a renseigné", () => {
  const projet = nettoyerProjet({
    idee: "Une application pour suivre l'entretien de ma moto et mes dépenses.",
    nom: "Toto", typeId: "gestion", plateforme: "mobile", fonctionnalites: ["comptes", "tableau_bord"],
    personnalisees: ["Rappel de vidange"], publicCible: "Motards", style: "sobre", couleur: "#22c55e",
    precisions: "Thème sombre", inspirations: "Application Yamaha", priorite: "haute", retours: ["Ajouter un écran Historique"],
  });
  const d = dossierClient(projet, { titre: "Toto", resume: "Suivi moto" });
  assert.equal(d.ideeDuClient, projet.idee);
  assert.equal(d.nomApplication, "Toto");
  assert.ok(d.typeApplication && d.plateforme);
  assert.ok(d.fonctionnalitesChoisies.length >= 1);
  assert.deepEqual(d.fonctionnalitesAjouteesParLeClient, ["Rappel de vidange"]);
  assert.equal(d.publicVise, "Motards");
  assert.match(d.styleChoisi, /#22c55e/);
  assert.equal(d.precisions, "Thème sombre");
  assert.equal(d.inspirations, "Application Yamaha");
  assert.deepEqual(d.demandesDeModificationPrecedentes, ["Ajouter un écran Historique"]);
  assert.equal(d.recapitulatif.resume, "Suivi moto");
});
