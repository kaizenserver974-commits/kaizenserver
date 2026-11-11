"use client";
// Pièces d'or côté navigateur : le solde vient toujours du serveur (compte connecté).
// Le navigateur ne fait qu'afficher ; les débits et crédits sont faits par le serveur.
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  return { connecte: true, solde: d.solde, email: d.email, gagne: d.gagne || 0, plafond: Boolean(d.plafond), resteJour: typeof d.resteJour === "number" ? d.resteJour : undefined, plafondJour: d.plafondJour };
}

// Une bourse par projet : le projet ouvert est celui de l'adresse (?id=…).
export function PortefeuilleProvider({ children }) {
  const projet = useSearchParams().get("id") || "";
  // connecte : null = on vérifie, false = pas connecté, true = connecté.
  const [etat, setEtat] = useState({ connecte: null, solde: null, email: "", erreur: "" });

  // Seule la réponse à la DERNIÈRE demande envoyée est prise en compte :
  // une réponse arrivée en retard (ancien solde) ne doit pas faire redescendre le compteur.
  const derniere = useRef(0);
  const appliquer = useCallback((r, numero) => {
    if (numero !== undefined && numero !== derniere.current) return;
    setEtat((e) => ({ ...e, connecte: r.connecte, ...(typeof r.solde === "number" ? { solde: r.solde } : {}), ...(typeof r.resteJour === "number" ? { resteJour: r.resteJour, plafondJour: r.plafondJour || 1000 } : {}), email: r.email || e.email, erreur: r.erreur || "", indisponible: Boolean(r.indisponible) }));
  }, []);
  const charger = useCallback(async () => {
    if (!projet) return;
    const n = ++derniere.current;
    appliquer(await appelSolde({ projet }), n);
  }, [appliquer, projet]);
  // Gain confirmé par le serveur (ce qui a VRAIMENT été versé), pour l'annonce « +X pièces ».
  const [gain, setGain] = useState(null);
  // Limite quotidienne de pièces gratuites atteinte : affichée en permanence (pas seulement 4 secondes).
  const [plafondAtteint, setPlafondAtteint] = useState(false);
  const recompenses = useCallback(async (cles, { annoncerPlafond = true } = {}) => {
    if (!cles?.length || !projet) return;
    const n = ++derniere.current;
    const r = await appelSolde({ recompenses: cles, projet });
    appliquer(r, n);
    if (r.plafond) setPlafondAtteint(true);
    const plafond = r.plafond && annoncerPlafond;
    if (r.gagne > 0 || plafond) setGain({ montant: r.gagne || 0, plafond, cle: Date.now() });
  }, [appliquer, projet]);
  useEffect(() => {
    if (!gain) return undefined;
    const t = setTimeout(() => setGain(null), 3800);
    return () => clearTimeout(t);
  }, [gain]);
  // Annonce « −X pièces » : uniquement pour une vraie dépense (maquette, génie, modification, commande).
  const [depense, setDepense] = useState(null);
  const fixerSolde = useCallback((solde, montantDepense = 0) => {
    if (typeof solde !== "number") return;
    derniere.current += 1; // toute réponse plus ancienne devient obsolète
    setEtat((e) => ({ ...e, solde }));
    if (montantDepense > 0) setDepense({ montant: montantDepense, reste: solde, cle: Date.now() });
  }, []);
  useEffect(() => {
    if (!depense) return undefined;
    const t = setTimeout(() => setDepense(null), 3500);
    return () => clearTimeout(t);
  }, [depense]);

  useEffect(() => { charger(); }, [charger]);

  // Changement de projet : le compteur repart de la bourse de ce projet.
  useEffect(() => { setEtat((e) => ({ ...e, solde: null })); }, [projet]);

  const valeur = useMemo(() => ({ ...etat, projet, dispo: etat.solde ?? 0, depense, gain, plafondAtteint, charger, recompenses, fixerSolde }), [etat, projet, depense, gain, plafondAtteint, charger, recompenses, fixerSolde]);
  return createElement(Contexte.Provider, { value: valeur }, children);
}

export const usePortefeuille = () => useContext(Contexte);

// Lien vers la connexion qui ramène ensuite à la page en cours.
export const lienConnexion = () => (typeof window === "undefined" ? "/connexion" : `/connexion?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`);
