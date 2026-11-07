import { test } from "node:test";
import assert from "node:assert/strict";
import { verifierMotDePasse, traduireErreur } from "../lib/connexion.js";

test("mot de passe : longueur, lettres et chiffres, confirmation", () => {
  assert.ok(verifierMotDePasse("abc1"));
  assert.ok(verifierMotDePasse("abcdefgh"));
  assert.ok(verifierMotDePasse("abcdefg1", "abcdefg2"));
  assert.equal(verifierMotDePasse("abcdefg1", "abcdefg1"), "");
});

test("erreurs Supabase traduites", () => {
  assert.match(traduireErreur("Invalid login credentials"), /incorrect/);
  assert.match(traduireErreur("Email not confirmed"), /Confirmez/);
  assert.match(traduireErreur("email rate limit exceeded"), /Trop de demandes/);
});
