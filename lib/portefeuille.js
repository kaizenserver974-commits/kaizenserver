"use client";
// Pièces d'or côté navigateur : le solde vient toujours du serveur (compte connecté).
// Le navigateur ne fait qu'afficher ; les débits et crédits sont faits par le serveur.
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { jeton } from "./supabaseClient.js";

const Contexte = createContext(null);

async function appelSolde(corps) {
  const t = await jeton();
  if (!t) return { connecte: false };
  const r = await fetch("/api/pieces/solde", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify(corps || {}) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) return { connecte: false };
  if (r.status === 503) return { connecte: true, indisponible: true, erreur: d.erreur };
  if (!r.ok) return { connecte: true, erreur: d.erreur || "Solde indisponible." };
  return { connecte: true, solde: d.solde, email: d.email };
}

// Une bourse par projet : le projet ouvert est celui de l'adresse (?id=…).
export function PortefeuilleProvider({ children }) {
  const projet = useSearchParams().get("id") || "";
  // connecte : null = on vérifie, false = pas connecté, true = connecté.
  const [etat, setEtat] = useState({ connecte: null, solde: null, email: "", erreur: "" });

  const appliquer = useCallback((r) => {
    setEtat((e) => ({ ...e, connecte: r.connecte, ...(typeof r.solde === "number" ? { solde: r.solde } : {}), email: r.email || e.email, erreur: r.erreur || "", indisponible: Boolean(r.indisponible) }));
  }, []);
  const charger = useCallback(async () => { if (projet) appliquer(await appelSolde({ projet })); }, [appliquer, projet]);
  const recompenses = useCallback(async (cles) => {
    if (!cles?.length || !projet) return;
    appliquer(await appelSolde({ recompenses: cles, projet }));
  }, [appliquer, projet]);
  const fixerSolde = useCallback((solde) => {
    if (typeof solde === "number") setEtat((e) => ({ ...e, solde }));
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Changement de projet : le compteur repart de la bourse de ce projet.
  useEffect(() => { setEtat((e) => ({ ...e, solde: null })); }, [projet]);

  const valeur = useMemo(() => ({ ...etat, projet, dispo: etat.solde ?? 0, charger, recompenses, fixerSolde }), [etat, projet, charger, recompenses, fixerSolde]);
  return createElement(Contexte.Provider, { value: valeur }, children);
}

export const usePortefeuille = () => useContext(Contexte);

// Lien vers la connexion qui ramène ensuite à la page en cours.
export const lienConnexion = () => (typeof window === "undefined" ? "/connexion" : `/connexion?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`);
