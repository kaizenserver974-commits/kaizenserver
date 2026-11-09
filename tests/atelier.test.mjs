import { test } from "node:test";
import assert from "node:assert/strict";
import { validerMaquetteAtelier, validerImageImportee, FORMATS_IMAGE } from "../lib/serveur/images.js";

test("atelier : une maquette doit être un HTML complet et pas trop lourd", () => {
  assert.ok(validerMaquetteAtelier("<p>bonjour</p>").erreur);
  assert.ok(validerMaquetteAtelier("<!doctype html><html></html>").erreur, "trop court");
  const ok = "<!doctype html><html><body>" + "x".repeat(200) + "</body></html>";
  assert.equal(validerMaquetteAtelier(ok).html, ok);
  assert.match(validerMaquetteAtelier("<!doctype html>" + "x".repeat(130_000)).erreur, /trop lourde/);
});

test("atelier : seules les images JPG, PNG ou WebP raisonnables sont importées", () => {
  assert.deepEqual(validerImageImportee("data:image/png;base64,QUJD"), { type: "image/png", contenu: "QUJD" });
  assert.equal(validerImageImportee("data:image/svg+xml;base64,QUJD"), null);
  assert.equal(validerImageImportee("https://exemple.fr/a.png"), null);
  assert.equal(validerImageImportee("data:image/jpeg;base64," + "A".repeat(4_100_000)), null);
});

test("atelier : trois formats d'image", () => {
  assert.deepEqual(Object.keys(FORMATS_IMAGE), ["carre", "portrait", "paysage"]);
});

test("e-mail « vœu exaucé » : lien de la maquette, mot de Server échappé", async () => {
  const { emailMaquetteEnvoyee } = await import("../lib/commande.js");
  const e = emailMaquetteEnvoyee({ nom: "Camille", numero: "KZ-1", genie: true, mot: "Voici <b>ta</b> moto", lienMaquette: "https://kaizenserver.fr/maquette/abc", lienEspace: "https://kaizenserver.fr/connexion" });
  assert.match(e.sujet, /vœu est exaucé/);
  assert.match(e.html, /https:\/\/kaizenserver\.fr\/maquette\/abc/);
  assert.match(e.html, /&lt;b&gt;ta&lt;\/b&gt;/);
  assert.match(e.texte, /Voici <b>ta<\/b> moto/);
  assert.match(emailMaquetteEnvoyee({ nom: "A", numero: "KZ-2", genie: false, lienMaquette: "x", lienEspace: "y" }).sujet, /maquette est prête/);
});
