"use client";

import { useEffect, useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";

// Lien d'en-tête : « Se connecter » ou « Mon espace » selon la session.
export default function Compte({ libelle = "Mon espace", lien = "/espace" }) {
  const [connecte, setConnecte] = useState(false);
  useEffect(() => {
    const sb = supabaseNavigateur();
    if (!sb) return undefined;
    sb.auth.getUser().then(({ data, error }) => setConnecte(Boolean(data?.user) && !error));
    // Arrivée depuis le lien e-mail (jetons dans l'adresse) : direction l'espace client.
    const adresse = window.location.hash + window.location.search;
    // Lien « mot de passe oublié » : la page de connexion gère la saisie du nouveau mot de passe.
    const depuisLien = /access_token=|type=magiclink|code=/.test(adresse) && !/type=recovery/.test(adresse) && !window.location.pathname.startsWith("/connexion");
    const { data } = sb.auth.onAuthStateChange((evt, s) => {
      setConnecte(Boolean(s));
      // Sauf sur le parcours (/nouveau) : le client y revient pour payer avec ses pièces d'or.
      if (s && depuisLien && (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") && !window.location.pathname.startsWith("/espace") && !window.location.pathname.startsWith("/nouveau")) {
        window.location.replace("/espace");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function deconnecter() {
    if (!window.confirm("Se déconnecter de KaizenServer ?")) return;
    const sb = supabaseNavigateur();
    await sb?.auth.signOut().catch(() => sb?.auth.signOut({ scope: "local" }));
    try { localStorage.removeItem("kaizen.role"); sessionStorage.removeItem("kaizen.apercuClient"); } catch { /* stockage indisponible */ }
    window.location.href = "/";
  }
  if (!connecte) return <a href="/connexion" className="btn petit contour masque-mobile">Se connecter</a>;
  return (
    <span className="compte-entete">
      <a href={lien} className="btn petit contour masque-mobile">{libelle}</a>
      <button type="button" className="btn petit secondaire bouton-deconnexion" onClick={deconnecter} title="Se déconnecter" aria-label="Se déconnecter">
        <span aria-hidden="true">⏻</span><span className="texte-deconnexion"> Se déconnecter</span>
      </button>
    </span>
  );
}
