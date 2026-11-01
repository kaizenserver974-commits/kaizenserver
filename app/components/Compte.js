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
    const { data } = sb.auth.onAuthStateChange((_e, s) => setConnecte(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);
  return <a href={connecte ? "/espace" : "/connexion"} className="btn petit contour masque-mobile">{connecte ? "Mon espace" : "Se connecter"}</a>;
}
