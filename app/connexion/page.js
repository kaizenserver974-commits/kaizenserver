"use client";

import { useEffect, useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";
import { traduireErreur, verifierMotDePasse, MOT_DE_PASSE_MIN } from "../../lib/connexion.js";

// Modes : connexion (mot de passe) · inscription · oubli · lien (e-mail magique) · nouveau (après « oublié »)
const TITRES = {
  connexion: "Se connecter",
  inscription: "Créer mon compte",
  oubli: "Mot de passe oublié",
  lien: "Recevoir un lien de connexion",
  nouveau: "Choisir mon mot de passe",
};

// Page où revenir après la connexion (ex. : le parcours en cours pour payer en pièces d'or).
// Seuls les chemins internes sont acceptés.
function destination() {
  if (typeof window === "undefined") return "/espace";
  const r = new URLSearchParams(window.location.search).get("retour") || "";
  return r.startsWith("/") && !r.startsWith("//") && !r.includes("\\") ? r : "/espace";
}

export default function Connexion() {
  const sb = supabaseNavigateur();
  const [mode, setMode] = useState("connexion");
  // Lien « Créer mon compte » : /connexion?mode=inscription (lu après le premier affichage).
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "inscription") setMode("inscription"); }, []);
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [voir, setVoir] = useState(false);
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!sb) return undefined;
    const recuperation = /type=recovery/.test(window.location.hash) || new URLSearchParams(window.location.search).has("reinit");
    if (recuperation) setMode("nouveau");
    // getUser() vérifie la session auprès de Supabase : une session périmée (compte
    // supprimé, jeton expiré) est effacée au lieu de provoquer une boucle.
    sb.auth.getUser().then(({ data, error }) => {
      if (recuperation) return;
      if (data?.user && !error) window.location.replace(destination());
      else sb.auth.signOut({ scope: "local" }).catch(() => {});
    });
    const { data } = sb.auth.onAuthStateChange((evt, session) => {
      if (evt === "PASSWORD_RECOVERY") { setMode("nouveau"); return; }
      if (session && evt === "SIGNED_IN" && !recuperation) window.location.replace(destination());
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const changer = (m) => { setMode(m); setErreur(""); setInfo(""); setMdp(""); setMdp2(""); };
  const adresse = () => email.trim().toLowerCase();
  const origine = () => window.location.origin;

  async function soumettre(e) {
    e.preventDefault();
    setErreur(""); setInfo("");
    if (mode === "inscription" || mode === "nouveau") {
      const pb = verifierMotDePasse(mdp, mdp2);
      if (pb) { setErreur(pb); return; }
    }
    setAttente(true);
    try {
      if (mode === "connexion") {
        const { error } = await sb.auth.signInWithPassword({ email: adresse(), password: mdp });
        if (error) throw error;
        window.location.replace(destination());
      } else if (mode === "inscription") {
        const { data, error } = await sb.auth.signUp({ email: adresse(), password: mdp, options: { emailRedirectTo: `${origine()}${destination()}` } });
        if (error) throw error;
        // Supabase ne renvoie pas d'erreur pour une adresse déjà inscrite : identités vides.
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setErreur(traduireErreur("already registered"));
        } else if (data?.session) {
          window.location.replace(destination());
        } else {
          setInfo(`📬 Compte créé ! Ouvrez l'e-mail envoyé à ${adresse()} pour confirmer votre adresse (une seule fois), puis connectez-vous avec votre mot de passe.`);
          setMode("connexion");
        }
      } else if (mode === "oubli") {
        const { error } = await sb.auth.resetPasswordForEmail(adresse(), { redirectTo: `${origine()}/connexion?reinit=1` });
        if (error) throw error;
        setInfo(`📬 Si un compte existe pour ${adresse()}, un e-mail vient d'être envoyé : ouvrez-le pour choisir votre mot de passe.`);
      } else if (mode === "lien") {
        const { error } = await sb.auth.signInWithOtp({ email: adresse(), options: { emailRedirectTo: `${origine()}${destination()}` } });
        if (error) throw error;
        setInfo(`📬 Lien envoyé à ${adresse()}. Ouvrez l'e-mail et appuyez sur le lien (pensez aux indésirables).`);
      } else if (mode === "nouveau") {
        const { error } = await sb.auth.updateUser({ password: mdp });
        if (error) throw error;
        setInfo("✅ Mot de passe enregistré ! Vous pourrez désormais vous connecter avec votre e-mail et ce mot de passe.");
        setTimeout(() => window.location.replace(destination()), 1500);
      }
    } catch (err) {
      setErreur(traduireErreur(err?.message));
    } finally {
      setAttente(false);
    }
  }

  const besoinEmail = mode !== "nouveau";
  const besoinMdp = mode === "connexion" || mode === "inscription" || mode === "nouveau";
  const confirmer = mode === "inscription" || mode === "nouveau";
  const bouton = { connexion: "Se connecter", inscription: "Créer mon compte", oubli: "Recevoir l'e-mail", lien: "Recevoir mon lien", nouveau: "Enregistrer mon mot de passe" }[mode];

  return (
    <main className="conteneur page connexion">
      <section className="carte etape connexion-carte">
        <img src="/personnages/bip.webp" alt="" width="72" height="72" className="avatar-illustre" style={{ "--anneau": "#7b5cff" }} />
        <p className="surtitre">Espace client</p>
        <h1 className="h-page">{TITRES[mode]}</h1>

        {!sb ? (
          <p className="alerte">L'espace client n'est pas encore activé sur ce site. Vous pouvez quand même créer et commander votre application : vos projets sont gardés dans « Mes projets ».</p>
        ) : (
          <form onSubmit={soumettre} className="formulaire-connexion">
            {mode === "connexion" && <p className="discret">Connectez-vous avec l'e-mail utilisé lors de votre commande.</p>}
            {mode === "inscription" && <p className="discret">Utilisez l'adresse indiquée lors de votre commande pour retrouver vos offres et vos messages.</p>}
            {mode === "oubli" && <p className="discret">Recevez un e-mail pour choisir un nouveau mot de passe — ou en créer un si vous vous connectiez jusqu'ici par lien.</p>}
            {mode === "nouveau" && <p className="discret">Choisissez votre mot de passe : au moins {MOT_DE_PASSE_MIN} caractères, avec des lettres et des chiffres.</p>}

            {besoinEmail && (
              <label className="champ"><span>E-mail</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" /></label>
            )}
            {besoinMdp && (
              <label className="champ">
                <span>{mode === "connexion" ? "Mot de passe" : "Nouveau mot de passe"}</span>
                <div className="ligne-mdp">
                  <input type={voir ? "text" : "password"} required minLength={mode === "connexion" ? 1 : MOT_DE_PASSE_MIN} autoComplete={mode === "connexion" ? "current-password" : "new-password"} value={mdp} onChange={(e) => setMdp(e.target.value)} />
                  <button type="button" className="btn petit secondaire" onClick={() => setVoir((v) => !v)} aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{voir ? "🙈" : "👁️"}</button>
                </div>
              </label>
            )}
            {confirmer && (
              <label className="champ"><span>Confirmer le mot de passe</span><input type={voir ? "text" : "password"} required autoComplete="new-password" value={mdp2} onChange={(e) => setMdp2(e.target.value)} /></label>
            )}

            {erreur && <p className="alerte erreur" style={{ marginTop: 12 }}>{erreur}</p>}
            {info && <p className="succes" role="status">{info}</p>}

            <button className="btn grand" style={{ width: "100%", marginTop: 18 }} disabled={attente}>{attente ? "Un instant…" : bouton}</button>

            <div className="liens-connexion">
              {mode === "connexion" && <>
                <button type="button" onClick={() => changer("oubli")}>Mot de passe oublié ?</button>
                <button type="button" onClick={() => changer("inscription")}>Créer mon compte</button>
                <button type="button" onClick={() => changer("lien")}>Recevoir un lien par e-mail</button>
              </>}
              {mode !== "connexion" && mode !== "nouveau" && <button type="button" onClick={() => changer("connexion")}>← J'ai déjà un mot de passe</button>}
            </div>
          </form>
        )}
        <p className="note" style={{ marginTop: 16 }}>Pas encore de commande ? <a href="/nouveau" className="lien-cyan">Créez votre projet</a>.</p>
      </section>
    </main>
  );
}
