"use client";

import { useEffect, useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";

// Lien d'en-tête : « Se connecter » ou « Mon espace » selon la session.
export default function Compte() {
  const [connecte, setConnecte] = useState(false);
  useEffect(() => {
    const sb = supabaseNavigateur();
    if (!sb) return undefined;
    sb.auth.getSession().then(({ data }) => setConnecte(Boolean(data?.session)));
    // Arrivée depuis le lien e-mail (jetons dans l'adresse) : direction l'espace client.
    const depuisLien = /access_token=|type=magiclink|code=/.test(window.location.hash + window.location.search);
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
