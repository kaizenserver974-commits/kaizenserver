"use client";

// Atelier de Server : galerie d'images (générées par l'IA ou importées) et éditeur de maquette
// à la main (textes, images, blocs, couleurs, code), avec aperçu en direct.
import { useEffect, useRef, useState } from "react";
import { appelAuthentifie } from "../../lib/supabaseClient.js";

const api = (corps) => appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify(corps) });
export const urlImage = (id) => `${typeof window === "undefined" ? "" : window.location.origin}/api/images/${id}`;

// Réduit une image importée (ou récupérée) en data URL JPEG.
export function versDataUrl(blob, cote = 1600) {
  return new Promise((ok, ko) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => ko(new Error("Image illisible"));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => ko(new Error("Image illisible"));
      img.onload = () => {
        const r = Math.min(1, cote / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/jpeg", 0.85);
        if (url.length > 1_300_000) url = c.toDataURL("image/jpeg", 0.65);
        ok(url);
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(blob);
  });
}

const FORMATS = [["carre", "Carré"], ["portrait", "Portrait (écran de téléphone)"], ["paysage", "Paysage (bannière)"]];
const IDEES = ["Photo réaliste d'une moto sportive dans un garage moderne, lumière néon bleue", "Illustration 3D d'un personnage souriant qui tient un téléphone, style application", "Fond abstrait sombre avec dégradé violet et bleu, formes douces", "Icône d'application : une clé à molette dorée sur fond bleu nuit"];

// Galerie : générer une image avec l'IA, importer une image, et choisir une image (choisir(id, url)).
export function GalerieImages({ choisir, libelleChoisir = "Insérer" }) {
  const [images, setImages] = useState(null);
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("carre");
  const [attente, setAttente] = useState("");
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState("");

  async function charger() {
    try { setImages((await api({ action: "images_lister" })).images); } catch (e) { setErreur(e.message); setImages([]); }
  }
  useEffect(() => { charger(); }, []);

  async function generer() {
    setErreur(""); setAttente("L'IA dessine votre image… (30 secondes à 1 minute)");
    try {
      const r = await api({ action: "image_generer", description, format });
      setImages((x) => [r.image, ...(x || [])]);
    } catch (e) { setErreur(e.message); } finally { setAttente(""); }
  }
  async function importer(fichiers) {
    setErreur("");
    for (const f of [...fichiers].slice(0, 5)) {
      if (!/^image\//.test(f.type)) { setErreur("Images uniquement."); continue; }
      setAttente(`Import de ${f.name}…`);
      try {
        const r = await api({ action: "image_ajouter", image: await versDataUrl(f), description: f.name });
        setImages((x) => [r.image, ...(x || [])]);
      } catch (e) { setErreur(e.message); }
    }
    setAttente("");
  }
  async function supprimer(id) {
    if (!window.confirm("Supprimer cette image de la galerie ? (Si une maquette l'utilise, elle n'y apparaîtra plus.)")) return;
    try { await api({ action: "image_supprimer", imageId: id }); setImages((x) => x.filter((i) => i.id !== id)); } catch (e) { setErreur(e.message); }
  }
  async function copier(id) {
    try { await navigator.clipboard.writeText(urlImage(id)); setCopie(id); setTimeout(() => setCopie(""), 1800); } catch { window.prompt("Copiez l'adresse de l'image :", urlImage(id)); }
  }

  return (
    <div className="galerie-atelier">
      <div className="generateur-image">
        <label className="champ" style={{ marginTop: 0 }}>
          <span>✨ Décrivez l'image à créer</span>
          <textarea rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex. : photo réaliste d'une moto noire dans un garage éclairé au néon, vue de trois quarts" />
        </label>
        <div className="idees-image">
          {IDEES.map((t) => <button key={t} type="button" className="puce" onClick={() => setDescription(t)}>{t.split(",")[0]}</button>)}
        </div>
        <div className="actions">
          <select value={format} onChange={(e) => setFormat(e.target.value)} aria-label="Format de l'image">
            {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn petit" disabled={Boolean(attente) || description.trim().length < 5} onClick={generer}>🎨 Générer l'image</button>
          <label className="btn petit secondaire">
            📥 Importer mes images
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { importer(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </div>
      {attente && <div className="chargement"><span className="rond" /> {attente}</div>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      {images === null ? <p className="discret">Chargement de la galerie…</p> : images.length === 0 ? <p className="discret">Votre galerie est vide : générez ou importez une image.</p> : (
        <div className="grille-images">
          {images.map((i) => (
            <figure key={i.id} className="image-galerie">
              <img src={urlImage(i.id)} alt={i.description} loading="lazy" />
              <figcaption title={i.description}>{i.origine === "ia" ? "🎨 " : "📥 "}{i.description}</figcaption>
              <div className="image-actions">
                {choisir && <button className="btn petit" onClick={() => choisir(i.id, urlImage(i.id))}>{libelleChoisir}</button>}
                <button className="btn petit secondaire" onClick={() => copier(i.id)} title="Copier l'adresse">{copie === i.id ? "✅" : "🔗"}</button>
                <a className="btn petit secondaire" href={urlImage(i.id)} download target="_blank" rel="noopener noreferrer" title="Télécharger">⬇</a>
                <button className="btn petit secondaire" onClick={() => supprimer(i.id)} title="Supprimer">🗑</button>
              </div>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

// Script injecté dans l'aperçu (iframe isolée) : édition des textes, sélection des blocs, échanges avec l'atelier.
const SCRIPT_EDITEUR = `<script data-kz>(function(){
var mode='texte',sel=null;
var st=document.createElement('style');st.setAttribute('data-kz','');
st.textContent='[data-kz-sel]{outline:3px solid #f5c542!important;outline-offset:2px!important}[data-kz-survol]{outline:2px dashed #a78bfa!important;outline-offset:2px!important}';
(document.head||document.documentElement).appendChild(st);
function dire(m){m.kz=true;parent.postMessage(m,'*');}
function code(){var c=document.documentElement.cloneNode(true);
c.querySelectorAll('[data-kz]').forEach(function(e){e.remove();});
c.querySelectorAll('[data-kz-sel]').forEach(function(e){e.removeAttribute('data-kz-sel');});
c.querySelectorAll('[data-kz-survol]').forEach(function(e){e.removeAttribute('data-kz-survol');});
return '<!doctype html>\\n'+c.outerHTML;}
function choisir(e){if(sel)sel.removeAttribute('data-kz-sel');sel=e||null;
if(sel){sel.setAttribute('data-kz-sel','');var bg=getComputedStyle(sel).backgroundImage||'';
dire({type:'sel',tag:sel.tagName.toLowerCase(),image:sel.tagName==='IMG'||/url\\(/.test(bg),texte:(sel.innerText||'').trim().slice(0,50)});}else dire({type:'sel',tag:''});}
document.addEventListener('click',function(e){if(mode!=='selection')return;e.preventDefault();e.stopPropagation();choisir(e.target);},true);
document.addEventListener('mouseover',function(e){if(mode==='selection'&&e.target.setAttribute)e.target.setAttribute('data-kz-survol','');},true);
document.addEventListener('mouseout',function(e){if(e.target.removeAttribute)e.target.removeAttribute('data-kz-survol');},true);
document.addEventListener('input',function(){dire({type:'modif'});});
function changerMode(m){mode=m;try{document.designMode=m==='texte'?'on':'off';}catch(x){}if(m!=='selection')choisir(null);}
window.addEventListener('message',function(e){var d=e.data||{};if(!d.kz)return;
if(d.type==='mode')changerMode(d.mode);
if(d.type==='lire')dire({type:'code',id:d.id,html:code()});
if(!sel)return;
if(d.type==='image'){if(sel.tagName==='IMG'){sel.src=d.src;sel.removeAttribute('srcset');}else{sel.style.backgroundImage='url("'+d.src+'")';sel.style.backgroundSize='cover';sel.style.backgroundPosition='center';}dire({type:'modif'});}
if(d.type==='ajouter-image'){var i=document.createElement('img');i.src=d.src;i.alt='';i.style.cssText='display:block;width:100%;height:auto;border-radius:16px;margin:10px 0';sel.parentNode.insertBefore(i,sel.nextSibling);choisir(i);dire({type:'modif'});}
if(d.type==='supprimer'){var s=sel;choisir(null);s.remove();dire({type:'modif'});}
if(d.type==='dupliquer'){var c=sel.cloneNode(true);c.removeAttribute('data-kz-sel');sel.parentNode.insertBefore(c,sel.nextSibling);choisir(c);dire({type:'modif'});}
if(d.type==='parent'&&sel.parentElement&&sel.parentElement!==document.documentElement)choisir(sel.parentElement);
});
changerMode('texte');dire({type:'pret'});
})();<\/script>`;

const injecter = (html) => (/<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${SCRIPT_EDITEUR}</body>`) : html + SCRIPT_EDITEUR);

// Couleurs utilisées dans la maquette (les plus fréquentes d'abord).
function couleursDe(html) {
  const compte = {};
  for (const m of String(html).matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
    const cle = `#${h.toLowerCase()}`;
    compte[cle] = (compte[cle] || 0) + 1;
  }
  return Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);
}
function remplacerCouleur(html, de, vers) {
  const court = /^#(.)\1(.)\2(.)\3$/i.test(de) ? `#${de[1]}${de[3]}${de[5]}` : null;
  let h = html.replace(new RegExp(`${de}\\b`, "gi"), vers);
  if (court) h = h.replace(new RegExp(`${court}\\b`, "gi"), vers);
  return h;
}

// Maquette vierge pour partir de zéro : 4 écrans, navigation en bas, tout est modifiable.
export function maquetteVierge(titre = "Mon application") {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre}</title>
<style>
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0f1e;color:#f3f4ff;min-height:100vh;padding-bottom:84px}
.bandeau{font-size:11px;text-align:center;padding:4px;background:#1b2040;color:#a5abd6}
header{padding:22px 20px 8px}header small{color:#9aa3d9}h1{font-size:26px;margin-top:4px}
.ecran{display:none;padding:12px 20px}.ecran.actif{display:block}
.hero{height:190px;border-radius:22px;background:linear-gradient(135deg,#7b5cff,#22d3ee);display:flex;align-items:flex-end;padding:18px;font-weight:700;font-size:20px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
h2{font-size:18px;margin:22px 0 10px}
.cartes{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.carte{background:#151a33;border-radius:18px;padding:16px;box-shadow:0 6px 18px rgba(0,0,0,.25)}
.carte b{display:block;font-size:22px;color:#22d3ee}.carte span{font-size:13px;color:#9aa3d9}
.ligne{display:flex;align-items:center;gap:12px;background:#151a33;border-radius:16px;padding:14px;margin-bottom:10px}
.pastille{width:42px;height:42px;border-radius:12px;background:#7b5cff;flex:none}
.bouton{display:block;width:100%;margin-top:18px;padding:15px;border:0;border-radius:14px;background:#7b5cff;color:#fff;font-weight:700;font-size:16px}
nav{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-around;padding:10px 6px 16px;background:#11152b;border-top:1px solid #222a52}
nav button{background:none;border:0;color:#7d86bd;font-size:12px;display:grid;justify-items:center;gap:3px}nav button.actif{color:#fff}nav i{font-style:normal;font-size:20px}
</style></head><body>
<div class="bandeau">Maquette Kaizen — aperçu non fonctionnel</div>
<header><small>Bonjour 👋</small><h1>${titre}</h1></header>
<section class="ecran actif" data-ecran="accueil">
<div class="hero">Votre titre principal ici</div>
<h2>En un coup d'œil</h2>
<div class="cartes"><div class="carte"><b>12</b><span>Premier chiffre clé</span></div><div class="carte"><b>78 %</b><span>Deuxième chiffre clé</span></div></div>
<h2>À faire</h2>
<div class="ligne"><div class="pastille"></div><div><b>Première action</b><br><span>Détail de l'action</span></div></div>
<div class="ligne"><div class="pastille"></div><div><b>Deuxième action</b><br><span>Détail de l'action</span></div></div>
<button class="bouton" onclick="alert('Action simulée')">Bouton principal</button>
</section>
<section class="ecran" data-ecran="explorer"><h2>Explorer</h2><div class="hero" style="height:140px">Une image ou une bannière</div><h2>Catégories</h2><div class="cartes"><div class="carte"><b>🚀</b><span>Catégorie 1</span></div><div class="carte"><b>🎯</b><span>Catégorie 2</span></div><div class="carte"><b>💡</b><span>Catégorie 3</span></div><div class="carte"><b>⭐</b><span>Catégorie 4</span></div></div></section>
<section class="ecran" data-ecran="activite"><h2>Activité</h2><div class="ligne"><div class="pastille"></div><div><b>Événement récent</b><br><span>Il y a 2 heures</span></div></div><div class="ligne"><div class="pastille"></div><div><b>Autre événement</b><br><span>Hier</span></div></div></section>
<section class="ecran" data-ecran="profil"><h2>Profil</h2><div class="ligne"><div class="pastille" style="border-radius:50%"></div><div><b>Prénom Nom</b><br><span>email@exemple.fr</span></div></div><button class="bouton" onclick="alert('Action simulée')">Modifier mon profil</button></section>
<nav><button class="actif" data-vers="accueil"><i>🏠</i>Accueil</button><button data-vers="explorer"><i>🧭</i>Explorer</button><button data-vers="activite"><i>📊</i>Activité</button><button data-vers="profil"><i>👤</i>Profil</button></nav>
<script>document.querySelectorAll('nav button').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.ecran').forEach(function(e){e.classList.toggle('actif',e.dataset.ecran===b.dataset.vers)});document.querySelectorAll('nav button').forEach(function(x){x.classList.toggle('actif',x===b)})})});</script>
</body></html>`;
}

// Éditeur : l'aperçu est modifiable directement (textes), et des outils agissent sur le bloc sélectionné.
export function EditeurMaquette({ htmlInitial, enregistrer, titre }) {
  const cadre = useRef(null);
  const enAttente = useRef({});
  const [source, setSource] = useState(htmlInitial); // ce qui est chargé dans l'aperçu
  const [version, setVersion] = useState(0); // force le rechargement de l'aperçu
  const [historique, setHistorique] = useState([]);
  const [mode, setMode] = useState("texte");
  const [sel, setSel] = useState(null);
  const [panneau, setPanneau] = useState(""); // "", "images", "couleurs", "code"
  const [code, setCode] = useState("");
  const [couleurs, setCouleurs] = useState([]);
  const [format, setFormat] = useState("mobile");
  const [modifie, setModifie] = useState(false);
  const [message, setMessage] = useState({ type: "", texte: "" });
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const ecouter = (e) => {
      if (e.source !== cadre.current?.contentWindow || !e.data?.kz) return;
      const d = e.data;
      if (d.type === "pret") cadre.current.contentWindow.postMessage({ kz: true, type: "mode", mode }, "*");
      if (d.type === "sel") setSel(d.tag ? d : null);
      if (d.type === "modif") setModifie(true);
      if (d.type === "code" && enAttente.current[d.id]) { enAttente.current[d.id](d.html); delete enAttente.current[d.id]; }
    };
    window.addEventListener("message", ecouter);
    return () => window.removeEventListener("message", ecouter);
  }, [mode]);

  const envoyer = (m) => cadre.current?.contentWindow?.postMessage({ kz: true, ...m }, "*");
  const lire = () => new Promise((ok) => {
    const id = `${Date.now()}-${Math.random()}`;
    enAttente.current[id] = ok;
    envoyer({ type: "lire", id });
    setTimeout(() => { if (enAttente.current[id]) { delete enAttente.current[id]; ok(null); } }, 4000);
  });
  // Prend une photo de l'état actuel (pour « Annuler »), puis applique un changement.
  async function memoriser() { const h = await lire(); if (h) setHistorique((x) => [...x.slice(-19), h]); return h; }
  async function recharger(html) { setSel(null); setSource(html); setVersion((v) => v + 1); setModifie(true); }

  function changerMode(m) { setMode(m); envoyer({ type: "mode", mode: m }); }
  async function outil(type, extra = {}) { await memoriser(); envoyer({ type, ...extra }); }
  async function annuler() {
    const precedent = historique[historique.length - 1];
    if (!precedent) return;
    setHistorique((x) => x.slice(0, -1));
    recharger(precedent);
  }
  async function ouvrirPanneau(p) {
    if (panneau === p) { setPanneau(""); return; }
    if (p === "code" || p === "couleurs") {
      const h = await lire();
      if (h) { setCode(h); setCouleurs(couleursDe(h)); }
    }
    setPanneau(p);
  }
  async function changerCouleur(de, vers) {
    const h = await memoriser();
    if (!h) return;
    const nouveau = remplacerCouleur(h, de, vers);
    setCouleurs((x) => x.map((c) => (c === de ? vers : c)));
    recharger(nouveau);
  }
  async function appliquerCode() {
    if (!/^\s*<!doctype html/i.test(code)) { setMessage({ type: "erreur", texte: "Le code doit commencer par <!doctype html>." }); return; }
    await memoriser();
    recharger(code);
    setMessage({ type: "succes", texte: "Code appliqué à l'aperçu." });
  }
  async function choisirImage(_id, url) {
    if (!sel) { setMessage({ type: "erreur", texte: "Sélectionnez d'abord un bloc ou une image dans l'aperçu (outil 👆 Sélectionner)." }); return; }
    await outil("image", { src: url });
    setMessage({ type: "succes", texte: sel.tag === "img" ? "Image remplacée." : "Image placée en fond du bloc sélectionné." });
  }
  async function ajouterImage(_id, url) {
    if (!sel) { setMessage({ type: "erreur", texte: "Sélectionnez d'abord l'endroit où ajouter l'image (outil 👆 Sélectionner)." }); return; }
    await outil("ajouter-image", { src: url });
  }
  async function sauver() {
    setMessage({ type: "", texte: "" }); setEnCours(true);
    try {
      const h = await lire();
      if (!h) throw new Error("L'aperçu ne répond pas : rechargez la page.");
      await enregistrer(h);
      setModifie(false);
      setMessage({ type: "succes", texte: "✅ Maquette enregistrée. Le client la voit dans son espace." });
    } catch (e) { setMessage({ type: "erreur", texte: e.message }); } finally { setEnCours(false); }
  }
  async function telecharger() {
    const h = await lire();
    if (!h) return;
    const url = URL.createObjectURL(new Blob([h], { type: "text/html" }));
    const a = document.createElement("a"); a.href = url; a.download = `${(titre || "maquette").replace(/[^\w-]+/g, "-")}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="editeur-maquette">
      <div className="barre-outils" role="toolbar" aria-label="Outils de l'atelier">
        <button className={`btn petit ${mode === "texte" ? "" : "secondaire"}`} onClick={() => changerMode("texte")} title="Cliquez sur un texte de l'aperçu pour l'écrire">✏️ Textes</button>
        <button className={`btn petit ${mode === "selection" ? "" : "secondaire"}`} onClick={() => changerMode("selection")} title="Cliquez sur un bloc ou une image pour le sélectionner">👆 Sélectionner</button>
        <span className="separateur" />
        <button className={`btn petit ${panneau === "images" ? "" : "secondaire"}`} onClick={() => ouvrirPanneau("images")}>🖼️ Images</button>
        <button className={`btn petit ${panneau === "couleurs" ? "" : "secondaire"}`} onClick={() => ouvrirPanneau("couleurs")}>🎨 Couleurs</button>
        <button className={`btn petit ${panneau === "code" ? "" : "secondaire"}`} onClick={() => ouvrirPanneau("code")}>&lt;/&gt; Code</button>
        <span className="separateur" />
        <button className="btn petit secondaire" disabled={!historique.length} onClick={annuler}>↩️ Annuler</button>
        <button className={`btn petit ${format === "mobile" ? "" : "secondaire"}`} onClick={() => setFormat("mobile")}>📱</button>
        <button className={`btn petit ${format === "bureau" ? "" : "secondaire"}`} onClick={() => setFormat("bureau")}>🖥️</button>
        <button className="btn petit secondaire" onClick={telecharger}>⬇ Télécharger</button>
        {enregistrer && <button className="btn petit btn-enregistrer" disabled={enCours} onClick={sauver}>{enCours ? "Enregistrement…" : `💾 Enregistrer${modifie ? " *" : ""}`}</button>}
      </div>

      <p className="aide-outil">
        {mode === "texte" ? "✏️ Cliquez directement sur un texte de l'aperçu et écrivez." : sel ? <>Sélection : <b>&lt;{sel.tag}&gt;</b> {sel.texte ? `« ${sel.texte} »` : ""}</> : "👆 Cliquez sur un bloc ou une image de l'aperçu pour le sélectionner."}
      </p>
      {mode === "selection" && sel && (
        <div className="actions outils-selection">
          <button className="btn petit secondaire" onClick={() => envoyer({ type: "parent" })}>⬆️ Bloc parent</button>
          <button className="btn petit secondaire" onClick={() => outil("dupliquer")}>⧉ Dupliquer</button>
          <button className="btn petit secondaire" onClick={() => outil("supprimer")}>🗑 Supprimer</button>
          <button className="btn petit secondaire" onClick={() => setPanneau("images")}>🖼️ {sel.tag === "img" ? "Remplacer l'image" : "Mettre une image"}</button>
        </div>
      )}
      {message.texte && <p className={`alerte ${message.type === "erreur" ? "erreur" : "succes"}`}>{message.texte}</p>}

      <div className={`atelier-zone ${panneau ? "avec-panneau" : ""}`}>
        <div className={`cadre-maquette ${format}`}>
          <iframe key={version} ref={cadre} title="Aperçu modifiable de la maquette" sandbox="allow-scripts allow-modals" srcDoc={injecter(source)} />
        </div>
        {panneau && (
          <aside className="panneau-atelier">
            {panneau === "images" && (
              <>
                <p className="note">{sel ? <>Choisissez une image pour le bloc sélectionné (<b>&lt;{sel.tag}&gt;</b>).</> : "Sélectionnez d'abord un bloc ou une image dans l'aperçu (👆), puis choisissez une image."}</p>
                {sel && sel.tag !== "img" && <p className="note">« Insérer » met l'image en fond du bloc ; « + Ajouter » la place juste en dessous.</p>}
                <GalerieImages choisir={choisirImage} libelleChoisir={sel?.tag === "img" ? "Remplacer" : "Insérer"} />
                {sel && sel.tag !== "img" && <GalerieAjout ajouter={ajouterImage} />}
              </>
            )}
            {panneau === "couleurs" && (
              <div className="couleurs-atelier">
                <p className="note">Les couleurs de la maquette : changez-en une, elle change partout.</p>
                {couleurs.length === 0 && <p className="discret">Aucune couleur trouvée.</p>}
                {couleurs.map((c) => (
                  <label key={c} className="ligne-couleur">
                    <input type="color" value={c} onChange={(e) => changerCouleur(c, e.target.value)} />
                    <code>{c}</code>
                  </label>
                ))}
              </div>
            )}
            {panneau === "code" && (
              <div className="code-atelier">
                <p className="note">Le code HTML de la maquette. Modifiez-le puis cliquez sur « Appliquer ».</p>
                <textarea spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code HTML de la maquette" />
                <div className="actions">
                  <button className="btn petit" onClick={appliquerCode}>Appliquer le code</button>
                  <small className={code.length > 120000 ? "alerte erreur" : "discret"}>{Math.round(code.length / 100) / 10} k caractères / 120 k</small>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// Petite rangée « + Ajouter sous le bloc » pour les images de la galerie.
function GalerieAjout({ ajouter }) {
  const [images, setImages] = useState([]);
  useEffect(() => { api({ action: "images_lister" }).then((r) => setImages(r.images.slice(0, 12))).catch(() => {}); }, []);
  if (!images.length) return null;
  return (
    <div className="galerie-ajout">
      <p className="note">+ Ajouter une image sous le bloc sélectionné :</p>
      <div className="rangee-ajout">
        {images.map((i) => (
          <button key={i.id} type="button" onClick={() => ajouter(i.id, urlImage(i.id))} title={i.description}>
            <img src={urlImage(i.id)} alt={i.description} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
