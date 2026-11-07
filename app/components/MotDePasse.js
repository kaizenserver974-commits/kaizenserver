"use client";

import { useState } from "react";
import { supabaseNavigateur } from "../../lib/supabaseClient.js";
import { traduireErreur, verifierMotDePasse, MOT_DE_PASSE_MIN } from "../../lib/connexion.js";

// Choisir ou changer son mot de passe quand on est déjà connecté (aucun e-mail envoyé).
export default function MotDePasse() {
  const [ouvert, setOuvert] = useState(false);
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [msg, setMsg] = useState({ type: "", texte: "" });
  const [attente, setAttente] = useState(false);
  if (!ouvert) return <button className="btn petit secondaire" onClick={() => setOuvert(true)}>🔑 Choisir / changer mon mot de passe</button>;
  async function enregistrer(e) {
    e.preventDefault();
    const pb = verifierMotDePasse(mdp, mdp2);
    if (pb) { setMsg({ type: "erreur", texte: pb }); return; }
    setAttente(true); setMsg({ type: "", texte: "" });
    const { error } = await supabaseNavigateur().auth.updateUser({ password: mdp });
    setAttente(false);
    if (error) { setMsg({ type: "erreur", texte: traduireErreur(error.message) }); return; }
    setMsg({ type: "ok", texte: "✅ Mot de passe enregistré. Vous pourrez vous connecter avec votre e-mail et ce mot de passe." });
    setMdp(""); setMdp2("");
  }
  return (
    <form className="carte-edition" onSubmit={enregistrer}>
      <strong>🔑 Mon mot de passe</strong>
      <p className="note">Au moins {MOT_DE_PASSE_MIN} caractères, avec des lettres et des chiffres.</p>
      <div className="formulaire-deux">
        <label className="champ"><span>Nouveau mot de passe</span><input type="password" autoComplete="new-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} /></label>
        <label className="champ"><span>Confirmer</span><input type="password" autoComplete="new-password" required value={mdp2} onChange={(e) => setMdp2(e.target.value)} /></label>
      </div>
      {msg.texte && <p className={msg.type === "ok" ? "succes" : "alerte erreur"}>{msg.texte}</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn petit" disabled={attente}>{attente ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" className="btn petit secondaire" onClick={() => setOuvert(false)}>Fermer</button>
      </div>
    </form>
  );
}
