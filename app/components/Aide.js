"use client";
import { usePathname } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import { QUESTIONS_AIDE } from "../../lib/aide.js";
import { jeton } from "../../lib/supabaseClient.js";

// Bulle « Besoin d'aide ? » avec le robot Bip.
// Pas de bulle d'aide sur les pages autonomes (formulaire partagé sur les réseaux).
export default function Aide() {
  const chemin = usePathname();
  if (chemin === "/bientot" || chemin?.startsWith("/bientot/")) return null;
  return <AideBulle />;
}

function AideBulle() {
  const [ouvert, setOuvert] = useState(false);
  const [fil, setFil] = useState([{ de: "bip", texte: "Bonjour ! Je suis Bip 🤖 Une question sur votre projet ou la commande ? Je suis là." }]);
  const [question, setQuestion] = useState("");
  const [attente, setAttente] = useState(false);
  const bas = useRef(null);

  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [fil, ouvert]);
  useEffect(() => {
    const echap = (e) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, []);

  async function demander(texte) {
    const q = texte.trim();
    if (!q || attente) return;
    setFil((f) => [...f, { de: "moi", texte: q }]);
    setQuestion("");
    setAttente(true);
    try {
      const t = await jeton().catch(() => null);
      const r = await fetch("/api/aide", { method: "POST", headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ question: q }) });
      const d = await r.json();
      setFil((f) => [...f, { de: "bip", texte: d.reponse || d.erreur || "Je n'ai pas compris, pouvez-vous reformuler ?" }]);
    } catch {
      setFil((f) => [...f, { de: "bip", texte: "Oups, je n'arrive pas à répondre pour le moment. Réessayez dans un instant." }]);
    } finally {
      setAttente(false);
    }
  }

  return (
    <div className="aide">
      {ouvert && (
        <div className="aide-panneau" role="dialog" aria-label="Aide KaizenServer">
          <div className="aide-entete">
            <img src="/personnages/bip.webp" alt="" width="40" height="40" />
            <div><strong>Bip</strong><small>Assistant KaizenServer</small></div>
            <button className="aide-fermer" aria-label="Fermer l'aide" onClick={() => setOuvert(false)}>×</button>
          </div>
          <div className="aide-fil" aria-live="polite">
            {fil.map((m, i) => <p key={i} className={`aide-msg ${m.de}`}>{m.texte}</p>)}
            {attente && <p className="aide-msg bip"><span className="rond" /> </p>}
            {fil.length === 1 && (
              <div className="puces">
                {QUESTIONS_AIDE.slice(0, 5).map((x) => <button key={x.q} className="puce" onClick={() => demander(x.q)}>{x.q}</button>)}
              </div>
            )}
            <div ref={bas} />
          </div>
          <form className="aide-saisie" onSubmit={(e) => { e.preventDefault(); demander(question); }}>
            <input value={question} maxLength={500} placeholder="Votre question…" onChange={(e) => setQuestion(e.target.value)} aria-label="Votre question" />
            <button className="btn petit" disabled={attente || question.trim().length < 3}>Envoyer</button>
          </form>
        </div>
      )}
      <button className="aide-bouton" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <img src="/personnages/bip.webp" alt="" width="44" height="44" />
        <span className="aide-texte"><strong>Besoin d'aide ?</strong><small>Bip est là !</small></span>
      </button>
    </div>
  );
}
