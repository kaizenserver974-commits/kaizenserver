"use client";

import { useEffect, useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";

export default function Connexion() {
  const sb = supabaseNavigateur();
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState("saisie"); // saisie | envoi | envoye
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!sb) return undefined;
    sb.auth.getSession().then(({ data }) => { if (data?.session) window.location.replace("/espace"); });
    const { data } = sb.auth.onAuthStateChange((_e, session) => { if (session) window.location.replace("/espace"); });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    setEtat("envoi");
    const { error } = await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/espace` } });
    if (error) {
      // On affiche la raison donnée par Supabase pour pouvoir corriger la configuration.
      const m = String(error.message || "");
      const raison =
        /rate limit|security purposes|seconds/i.test(m) ? "Trop de demandes : attendez quelques minutes avant de réessayer." :
        /signups? not allowed|signup is disabled/i.test(m) ? "Les inscriptions sont désactivées dans Supabase (Authentication → Sign In / Providers → autoriser les nouveaux utilisateurs)." :
        /provider is not enabled|email.*disabled|otp.*disabled/i.test(m) ? "La connexion par e-mail n'est pas activée dans Supabase (Authentication → Sign In / Providers → Email)." :
        /invalid api key|apikey|jwt|failed to fetch|network/i.test(m) ? "Le site n'arrive pas à joindre Supabase : vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel, puis redéployez." :
        /invalid.*email|email.*invalid/i.test(m) ? "Adresse e-mail invalide." : "";
      setErreur(`L'envoi du lien a échoué. ${raison} (Détail : ${m || "inconnu"})`);
      setEtat("saisie");
      return;
    }
    setEtat("envoye");
  }

  return (
    <main className="conteneur page connexion">
      <section className="carte etape connexion-carte">
        <img src="/personnages/bip.webp" alt="" width="72" height="72" className="avatar-illustre" style={{ "--anneau": "#7b5cff" }} />
        <p className="surtitre">Espace client</p>
        <h1 className="h-page">Se connecter</h1>
        {!sb ? (
          <p className="alerte">L'espace client n'est pas encore activé sur ce site. Vous pouvez quand même créer et commander votre application : vos projets sont gardés dans « Mes projets ».</p>
        ) : etat === "envoye" ? (
          <div className="succes" role="status">
            <strong>📬 Lien envoyé à {email}</strong>
            <p style={{ margin: "6px 0 0" }}>Ouvrez l'e-mail et cliquez sur le lien pour accéder à votre espace (commandes, devis, messages). Pensez à vérifier vos indésirables.</p>
          </div>
        ) : (
          <form onSubmit={envoyer}>
            <p className="discret">Pas de mot de passe : recevez un lien de connexion par e-mail. Utilisez l'adresse indiquée lors de votre commande pour retrouver vos devis et vos messages.</p>
            <label className="champ"><span>Votre e-mail</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" /></label>
            {erreur && <p className="alerte erreur" style={{ marginTop: 12 }}>{erreur}</p>}
            <button className="btn grand" style={{ width: "100%", marginTop: 18 }} disabled={etat === "envoi"}>{etat === "envoi" ? "Envoi…" : "Recevoir mon lien de connexion"}</button>
          </form>
        )}
        <p className="note" style={{ marginTop: 16 }}>Pas encore de commande ? <a href="/nouveau" className="lien-cyan">Créez votre projet</a>.</p>
      </section>
    </main>
  );
}
