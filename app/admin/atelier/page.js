"use client";

// Atelier de Server : créer ou retoucher soi-même la maquette d'un projet, et générer ses images.
import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur, appelAuthentifie } from "../../../lib/supabaseClient.js";
import { EditeurMaquette, GalerieImages, maquetteVierge } from "../../components/Atelier.js";

const api = (corps) => appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify(corps) });

export default function Atelier() {
  const sb = supabaseNavigateur();
  const [etat, setEtat] = useState("chargement");
  const [erreur, setErreur] = useState("");
  const [commandes, setCommandes] = useState([]);
  const [choisie, setChoisie] = useState("");
  const [maquette, setMaquette] = useState(null); // { html, cle }
  const [onglet, setOnglet] = useState("maquette");

  const charger = useCallback(async () => {
    try {
      const d = await appelAuthentifie("/api/admin");
      setCommandes(d.commandes);
      const demande = new URLSearchParams(window.location.search).get("commande");
      setChoisie((c) => c || (d.commandes.some((x) => x.id === demande) ? demande : d.commandes[0]?.id || ""));
      setEtat("pret");
    } catch (e) {
      setErreur(e.message);
      setEtat(e.status === 401 ? "deconnecte" : "erreur");
    }
  }, []);
  useEffect(() => {
    if (!sb) { setEtat("erreur"); setErreur("L'espace Server n'est pas encore activé."); return undefined; }
    const { data } = sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") charger(); });
    return () => data.subscription.unsubscribe();
  }, [sb, charger]);

  const c = commandes.find((x) => x.id === choisie);
  const titre = c?.recap?.titre || c?.projet?.nom || "Mon application";
  // Charge la maquette du projet choisi (ou une maquette vierge s'il n'en a pas).
  useEffect(() => {
    if (!c) return;
    setMaquette(null);
    if (!c.maquette) { setMaquette({ html: maquetteVierge(titre), cle: `${c.id}-vierge`, vierge: true }); return; }
    api({ action: "maquette_lire", commandeId: c.id })
      .then((r) => setMaquette({ html: r.html, cle: `${c.id}-${Date.now()}` }))
      .catch(() => setMaquette({ html: maquetteVierge(titre), cle: `${c.id}-vierge`, vierge: true }));
  }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (etat !== "pret") {
    return (
      <main className="conteneur page">
        <section className="carte connexion-carte">
          <h1 className="h-page">🎨 Atelier de Server</h1>
          <p className="discret">{etat === "chargement" ? "Chargement…" : etat === "deconnecte" ? "Connectez-vous avec l'adresse de Server." : erreur}</p>
          {etat === "deconnecte" && <a className="btn" href="/connexion?retour=/admin/atelier">Se connecter</a>}
        </section>
      </main>
    );
  }

  return (
    <main className="conteneur page atelier-page">
      <div className="titre-ligne">
        <h1 className="h-page">🎨 Atelier de Server</h1>
        <div className="actions">
          <button className={`btn petit ${onglet === "maquette" ? "" : "secondaire"}`} onClick={() => setOnglet("maquette")}>🖼️ Créer la maquette</button>
          <button className={`btn petit ${onglet === "images" ? "" : "secondaire"}`} onClick={() => setOnglet("images")}>✨ Générer des images</button>
        </div>
      </div>

      {onglet === "images" ? (
        <section className="carte">
          <h2>✨ Mes images</h2>
          <p className="note">Créez des images avec l'IA ou importez les vôtres. Elles restent dans votre galerie : utilisez-les dans vos maquettes (onglet « Créer la maquette » → 🖼️ Images) ou comme images de référence pour l'IA.</p>
          <GalerieImages />
        </section>
      ) : (
        <section className="carte">
          <div className="atelier-projet">
            <label className="champ" style={{ marginTop: 0 }}>
              <span>Projet</span>
              <select value={choisie} onChange={(e) => setChoisie(e.target.value)}>
                {commandes.map((x) => <option key={x.id} value={x.id}>{x.recap?.titre || x.projet?.nom || "Sans titre"} — {x.nom || x.email} ({x.numero})</option>)}
              </select>
            </label>
            {c && <a className="btn petit secondaire" href={`/admin?commande=${c.id}`}>← Retour au projet</a>}
            {maquette && !maquette.vierge && (
              <button className="btn petit secondaire" onClick={() => { if (window.confirm("Repartir d'une maquette vierge ? (L'ancienne reste enregistrée tant que vous ne cliquez pas sur Enregistrer.)")) setMaquette({ html: maquetteVierge(titre), cle: `${c.id}-vierge-${Date.now()}`, vierge: true }); }}>📄 Partir d'une page vierge</button>
            )}
          </div>
          {maquette?.vierge && <p className="note">Ce projet n'a pas encore de maquette : voici une page de départ à 4 écrans. Modifiez les textes, mettez vos images, changez les couleurs, puis enregistrez.</p>}
          {!c ? <p className="discret">Aucun projet pour le moment.</p> : !maquette ? <p className="discret">Chargement de la maquette…</p> : (
            <EditeurMaquette key={maquette.cle} htmlInitial={maquette.html} titre={titre}
              enregistrer={async (html) => { await api({ action: "maquette_enregistrer", commandeId: c.id, html }); setCommandes((l) => l.map((x) => (x.id === c.id ? { ...x, maquette: { ...(x.maquette || {}), source: "server", updated_at: new Date().toISOString() } } : x))); }} />
          )}
        </section>
      )}
    </main>
  );
}
