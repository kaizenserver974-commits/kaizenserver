import test from "node:test";
import assert from "node:assert/strict";
import { validerPhotos, preparerBase } from "../lib/serveur/generation.js";

const PHOTO = "data:image/jpeg;base64," + "A".repeat(300);
test("photos du client : seules les vraies images sont acceptées (4 max)", () => {
  assert.equal(validerPhotos([PHOTO, "javascript:alert(1)", "data:text/html;base64,AAAA", PHOTO, PHOTO, PHOTO, PHOTO]).length, 4);
});
test("la maquette actuelle envoyée en base remplace les photos par leurs noms", () => {
  const html = `<!doctype html><div style="background-image:url(${PHOTO})"></div><img src="${PHOTO}">`;
  const base = preparerBase(html, [PHOTO]);
  assert.ok(!base.includes("base64"));
  assert.equal(base.split("IMAGE_1").length - 1, 2);
});
