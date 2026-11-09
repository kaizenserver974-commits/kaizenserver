"use client";

import { useEffect, useState } from "react";

const CADRES = [{ id: "entreprise", label: "🏢 Pour mon entreprise" }, { id: "personnel", label: "🙋 Pour moi, personnellement" }, { id: "association", label: "🤝 Pour mon association" }];
const BUDGETS = ["Moins de 300 €", "300 – 500 €", "500 – 1 000 €", "Plus de 1 000 €", "Je ne sais pas"];
const DELAIS = ["Dès que possible", "Dans 1 à 3 mois", "Pas pressé"];

export default function Formulaire() {
  const [f, setF] = useState({ cadre: "entreprise", nom: "", email: "", telephone: "", entreprise: "", titre: "", idee: "", budget: "", delai: "", consentement: false, siteWeb: "", source: "site" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fini, setFini] = useState(null);
  // Origine du visiteur (ex. : /bientot?source=facebook) pour savoir d'où viennent les projets.
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("source"); if (s) setF((x) => ({ ...x, source: s.slice(0, 40) })); }, []);
  const champ = (cle) => ({ value: f[cle], onChange: (e) => setF({ ...f, [cle]: e.target.value }) });

  async function envoyer(e) {
    e.preventDefault(); setErreur(""); setEnvoi(true);
    try {
      const r = await fetch("/api/preinscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erreur || "L'envoi n'a pas abouti.");
      setFini(d.numero || "ok");
    } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }

  if (fini) {
    return (
      <section className="carte bientot-merci">
        <img src="/personnages/server.webp" alt="" width="80" height="80" />
        <h2>Merci, votre projet est bien reçu ! 🎉</h2>
        <p>Server, le maître du jeu, l'étudie et vous recontacte très vite avec ses conseils et une proposition à prix doux. Un e-mail de confirmation vient de vous être envoyé.</p>
        <a className="btn" href="/">Découvrir KaizenServer</a>
      </section>
    );
  }

  return (
    <form className="carte bientot-form" onSubmit={envoyer}>
      <h2>Inscrivez votre projet</h2>
      <p className="petit-titre">C'est pour…</p>
      <div className="puces">
        {CADRES.map((c) => <button type="button" key={c.id} className={`puce ${f.cadre === c.id ? "choisie" : ""}`} onClick={() => setF({ ...f, cadre: c.id })}>{c.label}</button>)}
      </div>
      <label className="champ"><span>Nom de votre projet <small className="discret">(facultatif)</small></span><input maxLength={120} placeholder="Ex. : Appli de réservation pour mon salon" {...champ("titre")} /></label>
      <label className="champ"><span>Décrivez votre idée *</span><textarea rows={4} maxLength={2000} required placeholder="Ex. : Je veux que mes clients réservent leurs rendez-vous en ligne et reçoivent un rappel." {...champ("idee")} /></label>
      <div className="formulaire-deux">
        <label className="champ"><span>Budget envisagé</span><select {...champ("budget")}><option value="">Choisir…</option>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className="champ"><span>Pour quand ?</span><select {...champ("delai")}><option value="">Choisir…</option>{DELAIS.map((d) => <option key={d}>{d}</option>)}</select></label>
      </div>
      <div className="formulaire-deux">
        <label className="champ"><span>Prénom et nom *</span><input autoComplete="name" maxLength={100} required {...champ("nom")} /></label>
        <label className="champ"><span>E-mail *</span><input type="email" autoComplete="email" maxLength={160} required {...champ("email")} /></label>
      </div>
      <div className="formulaire-deux">
        <label className="champ"><span>Téléphone <small className="discret">(facultatif)</small></span><input type="tel" autoComplete="tel" maxLength={30} {...champ("telephone")} /></label>
        {f.cadre !== "personnel" && <label className="champ"><span>{f.cadre === "association" ? "Association" : "Entreprise"} <small className="discret">(facultatif)</small></span><input maxLength={120} {...champ("entreprise")} /></label>}
      </div>
      <input className="piege" tabIndex={-1} autoComplete="off" aria-hidden="true" {...champ("siteWeb")} />
      <label className="case consentement">
        <input type="checkbox" checked={f.consentement} onChange={(e) => setF({ ...f, consentement: e.target.checked })} />
        <span>J'accepte que KaizenServer utilise ces informations pour me recontacter au sujet de mon projet (<a className="lien-cyan" href="/confidentialite" target="_blank">confidentialité</a>). *</span>
      </label>
      {erreur && <p className="alerte erreur">{erreur}</p>}
      <button className="btn grand" disabled={envoi || !f.consentement}>{envoi ? "Envoi…" : "Envoyer mon projet ✈"}</button>
      <p className="note">🔒 Gratuit et sans engagement. Vos informations servent uniquement à vous recontacter.</p>
    </form>
  );
}
