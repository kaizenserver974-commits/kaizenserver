import { test } from "node:test";
import assert from "node:assert/strict";
import { repondreSansIA } from "../lib/aide.js";

test("l'aide répond aux questions courantes", () => {
  assert.match(repondreSansIA("C'est combien le prix ?"), /gratuits/);
  assert.match(repondreSansIA("est-ce que la commande m'engage"), /Non/);
  assert.match(repondreSansIA("bonjour le chat"), /pas de réponse toute prête/);
});
