"use client";

import { useEffect, useState } from "react";
import { supabaseNavigateur, jeton } from "../../lib/supabaseClient.js";
import Compte from "./Compte.js";

const CLE_ROLE = "kaizen.role";
const CLE_APERCU = "kaizen.apercuClient";

// Rôle du visiteur : « visiteur », « client » ou « server » (maître du jeu).
// Le rôle est confirmé par le serveur ; une copie locale évite le clignotement du menu.
function useRole() {
  const [role, setRole] = useState("visiteur");
  const [apercu, setApercu] = useState(false);
  useEffect(() => {
    try {
      const memo = localStorage.getItem(CLE_ROLE);
      if (memo) setRole(memo);
      const q = new URLSearchParams(window.location.search);
      if (q.has("client")) sessionStorage.setItem(CLE_APERCU, "1");
      setApercu(sessionStorage.getItem(CLE_APERCU) === "1");
    } catch { /* stockage indisponible */ }
    const sb = supabaseNavigateur();
    if (!sb) return undefined;
    async function verifier() {
      const t = await jeton().catch(() => null);
      let r = "visiteur";
      if (t) {
        const d = await fetch("/api/compte", { method: "POST", headers: { Authorization: `Bearer ${t}` } }).then((x) => x.json()).catch(() => null);
        r = d?.admin ? "server" : d?.connecte ? "client" : "visiteur";
      }
      setRole(r);
      try { localStorage.setItem(CLE_ROLE, r); } catch { /* stockage indisponible */ }
    }
    verifier();
    const { data } = sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "SIGNED_OUT") verifier(); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { role, apercu };
}

function quitterApercu() {
  try { sessionStorage.removeItem(CLE_APERCU); } catch { /* stockage indisponible */ }
  window.location.href = "/admin";
}

export function EnteteNav() {
  const { role, apercu } = useRole();
  if (role === "server" && !apercu) {
    return (
      <nav className="entete-nav nav-server" aria-label="Navigation de Server">
        <span className="badge-server">🧞 Server</span>
        <a href="/admin">Projets en cours</a>
        <a href="/admin?filtre=toutes">Tous les projets</a>
        <a href="/espace?client=1">Voir comme un client</a>
        <a href="/" className="masque-mobile">Le site</a>
        <Compte libelle="Espace Server" lien="/admin" />
      </nav>
    );
  }
  return (
    <nav className="entete-nav" aria-label="Navigation principale">
      {role === "server" && apercu && <button type="button" className="btn petit apercu-retour" onClick={quitterApercu}>← Server</button>}
      <a href="/">Accueil</a>
      <a href="/nouveau">Commander</a>
      <a href="/exemples">Exemples</a>
      <a href="/ressources">Ressources</a>
      <a href="/a-propos">À propos</a>
      <a href="/projets">Mes projets</a>
      <Compte />
      <a href="/nouveau" className="btn petit btn-entete">Créer <span className="masque-mobile">mon projet</span></a>
    </nav>
  );
}

export function NavBasse() {
  const { role, apercu } = useRole();
  if (role === "server" && !apercu) {
    return (
      <nav className="nav-basse" aria-label="Navigation mobile de Server">
        <a href="/admin" className="principal"><span>🧞</span>Projets</a>
        <a href="/admin?filtre=toutes"><span>🗂️</span>Tous</a>
        <a href="/espace?client=1"><span>👁️</span>Vue client</a>
        <a href="/"><span>🌐</span>Le site</a>
      </nav>
    );
  }
  return (
    <nav className="nav-basse" aria-label="Navigation mobile">
      <a href="/"><span>🏠</span>Accueil</a>
      <a href="/nouveau" className="principal"><span>✨</span>Commander</a>
      <a href="/projets"><span>📁</span>Projets</a>
      <a href="/espace?onglet=messages"><span>✉️</span>Messages</a>
      <a href="/espace?onglet=devis"><span>🧾</span>Devis</a>
      <a href="/espace"><span>👤</span>Profil</a>
    </nav>
  );
}
