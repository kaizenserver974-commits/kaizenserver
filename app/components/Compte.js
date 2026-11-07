"use client";

import { useEffect, useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";

// Lien d'en-tête : « Se connecter » ou « Mon espace » selon la session.
export default function Compte() {
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
      if (s && depuisLien && (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") && !window.location.pathname.startsWith("/espace")) {
        window.location.replace("/espace");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <a href={connecte ? "/espace" : "/connexion"} className="btn petit contour masque-mobile">{connecte ? "Mon espace" : "Se connecter"}</a>;
}
