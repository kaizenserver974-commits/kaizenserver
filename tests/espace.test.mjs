import { test } from "node:test";
import assert from "node:assert/strict";
import { validerInfos, offreModifiable, validerLien, liensPourClient, validerNouveauProjet, validerMessage, validerDevis, estAdmin, nonLus, statut, montantEnLigne, valeurMollie, paiementReutilisable } from "../lib/espace.js";

test("messages : vides et trop longs refusés", () => {
  assert.ok(validerMessage("  ").erreur);
  assert.ok(validerMessage("x".repeat(4001)).erreur);
  assert.equal(validerMessage("  Bonjour ").contenu, "Bonjour");
});

test("devis : montant et délai contrôlés", () => {
  assert.deepEqual(validerDevis({ montant: "6 500,50", delaiSemaines: "8", details: "V1" }).devis, { montant: 6500.5, delai_semaines: 8, details: "V1", acompte_pct: 0 });
  assert.equal(validerDevis({ montant: 100, acomptePct: 30 }).devis.acompte_pct, 30);
  assert.ok(validerDevis({ montant: 100, acomptePct: 150 }).erreur);
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

test("paiement en ligne : montant de l'acompte et format Mollie", () => {
  assert.equal(montantEnLigne({ montant: 6900, acompte_pct: 30 }), 2070);
  assert.equal(montantEnLigne({ montant: 999.99, acompte_pct: 50 }), 500);
  assert.equal(montantEnLigne({ montant: 6900, acompte_pct: 0 }), 0);
  assert.equal(valeurMollie(2070), "2070.00");
  assert.equal(valeurMollie(12.5), "12.50");
});

test("paiement en ligne : reprise d'un paiement récent seulement", () => {
  const maintenant = Date.parse("2026-11-07T12:00:00Z");
  assert.equal(paiementReutilisable({ statut: "open", checkout_url: "x", created_at: "2026-11-07T11:30:00Z" }, maintenant), true);
  assert.equal(paiementReutilisable({ statut: "open", checkout_url: "x", created_at: "2026-11-07T10:00:00Z" }, maintenant), false);
  assert.equal(paiementReutilisable({ statut: "paid", checkout_url: "x", created_at: "2026-11-07T11:59:00Z" }, maintenant), false);
});

test("liens : adresse contrôlée, accès privés jamais envoyés au client", () => {
  assert.equal(validerLien({ titre: "App", url: "https://monapp.vercel.app" }).lien.visible_client, true);
  assert.ok(validerLien({ titre: "App", url: "javascript:alert(1)" }).erreur);
  assert.ok(validerLien({ titre: "", url: "https://x.fr" }).erreur);
  assert.equal(validerLien({ titre: "Supabase", url: "https://supabase.com/x", visibleClient: false }).lien.visible_client, false);
  const liens = [{ titre: "App", visible_client: true }, { titre: "Supabase", visible_client: false }];
  assert.deepEqual(liensPourClient(liens).map((l) => l.titre), ["App"]);
});

test("nouveau projet créé par Server : champs obligatoires", () => {
  assert.ok(validerNouveauProjet({ titre: "RésaYoga", nom: "Lina", email: "pas-un-email" }).erreur);
  assert.equal(validerNouveauProjet({ titre: "RésaYoga", nom: "Lina", email: "Lina@Exemple.fr" }).projet.email, "lina@exemple.fr");
});

test("modification par Server : coordonnées et offres", () => {
  assert.ok(validerInfos({ nom: "Lina", email: "faux" }).erreur);
  assert.equal(validerInfos({ nom: "Lina", email: "LINA@x.fr" }).infos.email, "lina@x.fr");
  assert.equal(offreModifiable({ id: "d", statut: "envoye" }, []), true);
  assert.equal(offreModifiable({ id: "d", statut: "accepte" }, []), false);
  assert.equal(offreModifiable({ id: "d", statut: "envoye" }, [{ devis_id: "d", statut: "paid" }]), false);
});

test("choix à faire par le client : question, 2 à 8 réponses, gratuit ou en pièces d'or", async () => {
  const { validerChoix } = await import("../lib/espace.js");
  const ok = validerChoix({ question: "Quelle couleur ?", options: "Bleu\nRouge\n\n", cout: "30" });
  assert.deepEqual(ok.choix, { question: "Quelle couleur ?", details: "", options: ["Bleu", "Rouge"], cout: 30 });
  assert.equal(validerChoix({ question: "Quelle couleur ?", options: ["Bleu"] }).erreur.includes("2 à 8"), true);
  assert.ok(validerChoix({ question: "Quelle couleur ?", options: ["Bleu", "bleu"] }).erreur);
  assert.ok(validerChoix({ question: "Q ?", options: ["A", "B"], cout: -5 }).erreur);
  assert.equal(validerChoix({ question: "Quelle couleur ?", options: ["A", "B"] }).choix.cout, 0);
});
