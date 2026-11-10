"use client";

// Les services de Kaizen (créer son projet, ses projets, la commande) sont réservés aux personnes
// connectées. Sans compte : une invitation à se connecter ou à créer un compte gratuit.
import { useEffect, useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";

export default function ExigeCompte({ children, titre = "Créez votre compte pour commencer" }) {
  const sb = supabaseNavigateur();
  const [etat, setEtat] = useState("chargement");
  useEffect(() => {
    if (!sb) { setEtat("ok"); return undefined; } // connexion non configurée (développement)
    let actif = true;
    sb.auth.getSession().then(({ data }) => { if (actif) setEtat(data.session ? "ok" : "non"); }).catch(() => actif && setEtat("non"));
    const { data } = sb.auth.onAuthStateChange((_evt, session) => { if (actif) setEtat(session ? "ok" : "non"); });
    return () => { actif = false; data.subscription.unsubscribe(); };
  }, [sb]);

  if (etat === "ok") return children;
  if (etat === "chargement") return <main className="conteneur page"><p className="discret">Chargement…</p></main>;
  const retour = typeof window === "undefined" ? "/nouveau" : window.location.pathname + window.location.search;
  const lien = (mode) => `/connexion?${mode ? `mode=${mode}&` : ""}retour=${encodeURIComponent(retour)}`;
  return (
    <main className="conteneur page">
      <section className="carte connexion-carte exige-compte">
        <p className="exige-icone" aria-hidden="true">🔐</p>
        <h1 className="h-page">{titre}</h1>
        <p>Les services de Kaizen sont réservés aux membres : créer votre projet d'application avec les personnages, gagner vos pièces d'or, obtenir votre maquette et commander.</p>
        <p className="discret">Le compte est gratuit et prend une minute. Il garde vos projets, vos pièces d'or, vos commandes et vos échanges avec Server.</p>
        <div className="actions">
          <a className="btn grand" href={lien("inscription")}>✨ Créer mon compte gratuit</a>
          <a className="btn secondaire" href={lien("")}>J'ai déjà un compte</a>
        </div>
      </section>
    </main>
  );
}
