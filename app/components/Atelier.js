"use client";

// Atelier de Server : galerie d'images (générées par l'IA ou importées) et éditeur de maquette
// à la main (textes, images, blocs, couleurs, code), avec aperçu en direct.
import { useEffect, useRef, useState } from "react";
import { appelAuthentifie } from "../../lib/supabaseClient.js";

const api = (corps) => appelAuthentifie("/api/admin", { method: "POST", body: JSON.stringify(corps) });
export const urlImage = (id) => `${typeof window === "undefined" ? "" : window.location.origin}/api/images/${id}`;

// Réduit une image importée (ou récupérée) en data URL JPEG.
// max : taille maximale du résultat (caractères) ; qualite : qualité JPEG de départ.
export function versDataUrl(blob, cote = 1600, { qualite = 0.85, max = 1_300_000 } = {}) {
  return new Promise((ok, ko) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => ko(new Error("Image illisible"));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => ko(new Error("Image illisible"));
      img.onload = () => {
        const c = document.createElement("canvas");
        const x = c.getContext("2d");
        let url = "";
        // On garde le plus de qualité possible, en réduisant seulement si l'image est trop lourde.
        for (const [facteur, q] of [[1, qualite], [1, qualite - 0.1], [0.8, qualite - 0.1], [0.6, 0.75], [0.45, 0.7]]) {
          const r = Math.min(1, (cote * facteur) / Math.max(img.width, img.height));
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          x.imageSmoothingQuality = "high";
          x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          url = c.toDataURL("image/jpeg", q);
          if (url.length <= max) break;
        }
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
export function GalerieImages({ choisir, libelleChoisir = "Insérer", enPlus = null }) {
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
        const r = await api({ action: "image_ajouter", image: await versDataUrl(f, 4096, { qualite: 0.93, max: 3_800_000 }), description: f.name });
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
                {enPlus && <button className="btn petit btn-toute" onClick={() => enPlus.faire(i.id, urlImage(i.id))}>{enPlus.libelle}</button>}
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
st.textContent='.zone-clic{outline:2px dashed #f5c542;background:rgba(245,197,66,.18)}[data-kz-sel]{outline:3px solid #f5c542!important;outline-offset:2px!important}[data-kz-survol]{outline:2px dashed #a78bfa!important;outline-offset:2px!important}';
(document.head||document.documentElement).appendChild(st);
function dire(m){m.kz=true;parent.postMessage(m,'*');}
var ACTIF=/^(actif|active|is-active|selected|current|show|visible|open|on|ouverte)$/;
[].slice.call(document.querySelectorAll('*')).forEach(function(x){if(typeof x.className==='string'){x.__kzCl=x.className;x.__kzDisp=x.style.display;}});
function code(){var c=document.documentElement.cloneNode(true);
var o=document.documentElement.querySelectorAll('*'),k=c.querySelectorAll('*');
for(var i=0;i<o.length&&i<k.length;i++){if(o[i].__kzCl===undefined||typeof k[i].className!=='string')continue;
var avant=o[i].__kzCl.split(/\\s+/).filter(function(t){return ACTIF.test(t);});
k[i].className.split(/\\s+/).forEach(function(t){if(ACTIF.test(t)&&avant.indexOf(t)<0)k[i].classList.remove(t);});
avant.forEach(function(t){k[i].classList.add(t);});if(!k[i].className)k[i].removeAttribute('class');
if(k[i].style&&k[i].style.display!==o[i].__kzDisp)k[i].style.display=o[i].__kzDisp;if(k[i].getAttribute('style')==='')k[i].removeAttribute('style');}
c.querySelectorAll('[data-kz]').forEach(function(e){e.remove();});
c.querySelectorAll('[data-kz-sel]').forEach(function(e){e.removeAttribute('data-kz-sel');});
c.querySelectorAll('[data-kz-survol]').forEach(function(e){e.removeAttribute('data-kz-survol');});
return '<!doctype html>\\n'+c.outerHTML;}
function imageSous(t){if(!t||!t.closest)return null;var s=t.closest('svg');if(s)return s;if(t.tagName==='IMG')return t;var x=t;
for(var i=0;i<3&&x&&x!==document.body&&x!==document.documentElement;i++,x=x.parentElement){var bg=getComputedStyle(x).backgroundImage||'';
var cl=String((x.className&&x.className.baseVal!==undefined)?x.className.baseVal:(x.className||''))+' '+(x.id||'')+' '+(x.getAttribute('aria-label')||'');
if(/url\\(/.test(bg)||/(img|image|photo|visuel|banner|banniere|hero|cover|avatar|placeholder|thumb|vignette|illustration|media|poster|icone|icon|logo|signet)/i.test(cl))return x;}return null;}
function choisir(e){if(sel)sel.removeAttribute('data-kz-sel');sel=e||null;
if(sel){sel.setAttribute('data-kz-sel','');
dire({type:'sel',tag:sel.tagName.toLowerCase(),image:imageSous(sel)===sel,texte:(sel.innerText||'').trim().slice(0,50),lien:sel.getAttribute('data-lien-ecran')||''});}else dire({type:'sel',tag:''});}
function bloc(x){while(x&&x.parentElement&&x.parentElement!==document.body&&/^inline/.test(getComputedStyle(x).display))x=x.parentElement;return x;}
var dessin=null,ignorerClic=false;
function majZone(e){var d=dessin,r=d.c.getBoundingClientRect();var x1=Math.max(0,Math.min(d.x,e.clientX)-r.left),x2=Math.min(r.width,Math.max(d.x,e.clientX)-r.left),y1=Math.max(0,Math.min(d.y,e.clientY)-r.top),y2=Math.min(r.height,Math.max(d.y,e.clientY)-r.top);
d.z.style.left=(x1/r.width*100).toFixed(2)+'%';d.z.style.top=(y1/r.height*100).toFixed(2)+'%';d.z.style.width=((x2-x1)/r.width*100).toFixed(2)+'%';d.z.style.height=((y2-y1)/r.height*100).toFixed(2)+'%';d.l=x2-x1;d.h=y2-y1;}
document.addEventListener('pointerdown',function(e){if(mode!=='zone')return;e.preventDefault();e.stopPropagation();var c=e.target.closest('.toile')||e.target.closest('section')||e.target.parentElement||document.body;
if(c.classList&&c.classList.contains('zone-clic'))c=c.parentElement;if(getComputedStyle(c).position==='static')c.style.position='relative';
var z=document.createElement('a');z.className='zone-clic';z.setAttribute('aria-label','Zone cliquable');z.style.cssText='position:absolute;display:block;z-index:5;cursor:pointer';c.appendChild(z);
dessin={z:z,c:c,x:e.clientX,y:e.clientY,l:0,h:0};majZone(e);},true);
document.addEventListener('pointermove',function(e){if(dessin){e.preventDefault();majZone(e);}},true);
document.addEventListener('pointerup',function(e){if(!dessin)return;var d=dessin;dessin=null;if(d.l<10||d.h<10){d.z.remove();return;}ignorerClic=true;setTimeout(function(){ignorerClic=false;},400);mode='selection';document.body.style.touchAction='';choisir(d.z);dire({type:'zone-faite'});dire({type:'modif'});},true);
document.addEventListener('click',function(e){if(ignorerClic){ignorerClic=false;e.preventDefault();e.stopPropagation();return;}if(mode==='zone'){e.preventDefault();e.stopPropagation();return;}if(mode==='texte'){var im=imageSous(e.target);if(im&&(im===e.target||im.contains(e.target)&&(im.tagName==='IMG'||im.tagName.toLowerCase()==='svg'))){e.preventDefault();choisir(im);}else if(sel)choisir(null);return;}
if(mode!=='selection')return;e.preventDefault();e.stopPropagation();var t=e.target,im2=imageSous(t);choisir(im2&&(im2===t||im2.tagName.toLowerCase()==='svg')?im2:t);},true);
document.addEventListener('mouseover',function(e){if(mode==='selection'&&e.target.setAttribute)e.target.setAttribute('data-kz-survol','');},true);
document.addEventListener('mouseout',function(e){if(e.target.removeAttribute)e.target.removeAttribute('data-kz-survol');},true);
document.addEventListener('input',function(){dire({type:'modif'});});
function changerMode(m){mode=m;try{document.designMode=m==='texte'?'on':'off';}catch(x){}document.body.style.touchAction=m==='zone'?'none':'';if(m!=='selection')choisir(null);}
window.addEventListener('message',function(e){var d=e.data||{};if(!d.kz)return;
if(d.type==='mode')changerMode(d.mode);
if(d.type==='lire')dire({type:'code',id:d.id,html:code()});
if(d.type==='cibles'){var vus={},l=[];[].slice.call(document.querySelectorAll(d.selecteur)).forEach(function(x){if(x.closest('[data-kz]')||x.closest('[data-lien-ecran]'))return;var t=(x.innerText||x.textContent||'').replace(/\\s+/g,' ').trim();if(t&&t.length<=30&&!vus[t]){vus[t]=1;l.push(t);}});dire({type:'cibles',id:d.id,liste:l.slice(0,30)});}
if(d.type==='ajouter-image'){var i=document.createElement('img');i.src=d.src;i.alt='';i.style.cssText='display:block;width:100%;height:auto;border-radius:16px;margin:10px 0';
var r=sel;if(!r){var p=document.elementFromPoint(innerWidth/2,innerHeight/3);r=(p&&p!==document.body&&p!==document.documentElement)?bloc(p):null;}
if(r&&r.parentNode)r.parentNode.insertBefore(i,r.nextSibling);else document.body.insertBefore(i,document.body.firstChild);
if(mode==='selection')choisir(i);i.scrollIntoView({block:'center'});dire({type:'modif'});return;}
if(!sel)return;
if(d.type==='lien'){if(d.cible){sel.setAttribute('data-lien-ecran',d.cible);sel.style.cursor='pointer';if(!document.getElementById('kaizen-liens')){var k=document.createElement('script');k.id='kaizen-liens';k.textContent=d.code;document.body.appendChild(k);}}else{sel.removeAttribute('data-lien-ecran');sel.style.cursor='';}choisir(sel);dire({type:'modif'});}
if(d.type==='image'){var tg=sel.tagName.toLowerCase();
if(tg==='img'){sel.src=d.src;sel.removeAttribute('srcset');sel.style.objectFit=sel.style.objectFit||'cover';}
else if(tg==='svg'){var rc=sel.getBoundingClientRect();var ni=document.createElement('img');ni.src=d.src;ni.alt='';var c2=sel.getAttribute('class');if(c2)ni.setAttribute('class',c2);
ni.style.cssText='display:block;width:'+(rc.width?Math.round(rc.width)+'px':'100%')+';height:'+(rc.height?Math.round(rc.height)+'px':'auto')+';max-width:100%;object-fit:cover;border-radius:inherit';sel.replaceWith(ni);sel=null;choisir(ni);}
else{sel.style.backgroundImage='url("'+d.src+'")';sel.style.backgroundSize='cover';sel.style.backgroundPosition='center';sel.style.backgroundRepeat='no-repeat';
var tx=(sel.textContent||'').trim();if(!sel.children.length&&(tx.length<=3||/^(image|photo|visuel|illustration|img|📷|🖼️?)/i.test(tx)))sel.textContent='';
else [].slice.call(sel.querySelectorAll('svg')).forEach(function(v){if(v.getBoundingClientRect().width>sel.getBoundingClientRect().width*0.3)v.remove();});
if(sel.getBoundingClientRect().height<60)sel.style.minHeight='160px';}
dire({type:'modif'});}
if(d.type==='supprimer'){var s=sel;choisir(null);s.remove();dire({type:'modif'});}
if(d.type==='dupliquer'){var c=sel.cloneNode(true);c.removeAttribute('data-kz-sel');sel.parentNode.insertBefore(c,sel.nextSibling);choisir(c);dire({type:'modif'});}
if(d.type==='parent'&&sel.parentElement&&sel.parentElement!==document.documentElement)choisir(sel.parentElement);
});
changerMode('selection');dire({type:'pret'});
})();<\/script>`;

// Éléments qui servent à naviguer (onglets, menus, boutons) : cibles possibles d'un lien.
const SELECTEUR_CIBLES = "nav button,nav a,[role=tab],[data-tab],[data-vers],[data-target],[data-screen],[onclick],button,a";
// Petit script enregistré DANS la maquette : un bloc ou une image « lien » clique sur l'onglet choisi.
const CODE_LIENS = `(function(){var S=${JSON.stringify(SELECTEUR_CIBLES)};function n(x){return (x.innerText||x.textContent||"").replace(/\\s+/g," ").trim();}
document.addEventListener("click",function(e){if(document.designMode==="on")return;var s=e.target.closest&&e.target.closest("[data-lien-ecran]");if(!s)return;var t=s.getAttribute("data-lien-ecran");if(!t)return;
var c=[].slice.call(document.querySelectorAll(S)).find(function(x){return !x.closest("[data-lien-ecran]")&&n(x)===t;});if(c){e.preventDefault();c.click();window.scrollTo(0,0);}});})();`;

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
export function EditeurMaquette({ htmlInitial, enregistrer, titre, versImages }) {
  const cadre = useRef(null);
  const enAttente = useRef({});
  const [source, setSource] = useState(htmlInitial); // ce qui est chargé dans l'aperçu
  const [version, setVersion] = useState(0); // force le rechargement de l'aperçu
  const [historique, setHistorique] = useState([]);
  const [mode, setMode] = useState(() => (/data-maquette-images|data-maquette-vitrine|<section class="ecran[^>]*>\s*<img/.test(htmlInitial) ? "selection" : "texte"));
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
      if (d.type === "sel") { setSel(d.tag ? d : null); if (d.tag && d.image) setPanneau("images"); }
      if (d.type === "zone-faite") { setMode("selection"); setMessage({ type: "succes", texte: "▭ Zone créée : choisissez ci-dessus dans « 🔗 Au clic, aller vers » l'écran qu'elle ouvre." }); }
      if (d.type === "modif") setModifie(true);
      if ((d.type === "code" || d.type === "cibles") && enAttente.current[d.id]) { enAttente.current[d.id](d.type === "code" ? d.html : d.liste); delete enAttente.current[d.id]; }
    };
    window.addEventListener("message", ecouter);
    return () => window.removeEventListener("message", ecouter);
  }, [mode]);

  const envoyer = (m) => cadre.current?.contentWindow?.postMessage({ kz: true, ...m }, "*");
  const demander = (type, extra = {}) => new Promise((ok) => {
    const id = `${Date.now()}-${Math.random()}`;
    enAttente.current[id] = ok;
    envoyer({ type, id, ...extra });
    setTimeout(() => { if (enAttente.current[id]) { delete enAttente.current[id]; ok(null); } }, 4000);
  });
  const lire = () => demander("lire");
  // Onglets / boutons de la maquette vers lesquels un bloc peut renvoyer au clic.
  const [cibles, setCibles] = useState([]);
  useEffect(() => { if (sel) demander("cibles", { selecteur: SELECTEUR_CIBLES }).then((l) => setCibles(l || [])); }, [sel?.tag, sel?.texte]); // eslint-disable-line react-hooks/exhaustive-deps
  async function lier(cible) {
    await outil("lien", { cible, code: CODE_LIENS });
    setMessage({ type: "succes", texte: cible ? `🔗 Au clic, ce bloc ouvre « ${cible} ». Essayez avec ▶ Tester.` : "Lien retiré." });
  }
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
    if (!sel) { await ajouterImage(_id, url); return; }
    await outil("image", { src: url });
    setMessage({ type: "succes", texte: sel.image ? "✅ Image remplacée." : "Image placée en fond du bloc sélectionné." });
  }
  async function ajouterImage(_id, url) {
    await outil("ajouter-image", { src: url });
    setMessage({ type: "succes", texte: sel ? "Image ajoutée sous le bloc sélectionné." : "Image ajoutée à l'écran affiché. Pour la rendre cliquable : 👆 Sélectionner → cliquez sur l'image → 🔗 Au clic, aller vers…" });
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
      <div className="entete-atelier">
      <div className="barre-outils" role="toolbar" aria-label="Outils de l'atelier">
        <button className={`btn petit ${mode === "texte" ? "" : "secondaire"}`} onClick={() => changerMode("texte")} title="Cliquez sur un texte de l'aperçu pour l'écrire">✏️ Textes</button>
        <button className={`btn petit ${mode === "selection" ? "" : "secondaire"}`} onClick={() => changerMode("selection")} title="Cliquez sur un bloc ou une image pour le sélectionner">👆 Sélectionner</button>
        <button className={`btn petit ${mode === "zone" ? "" : "secondaire"}`} onClick={() => changerMode("zone")} title="Dessinez un rectangle sur un bouton de l'image pour le rendre cliquable">▭ Zone cliquable</button>
        <button className={`btn petit ${mode === "test" ? "" : "secondaire"}`} onClick={() => changerMode("test")} title="Cliquez dans la maquette comme le client : onglets, boutons, liens">▶ Tester</button>
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
        {mode === "zone" ? "▭ Avec le doigt ou la souris, dessinez un rectangle sur le bouton de l'image (ex. « Entretien »), puis choisissez l'écran qu'il ouvre." : mode === "texte" && sel?.image ? "🖼️ Image sélectionnée : choisissez dans la galerie à droite l'image qui la remplace." : mode === "texte" ? "✏️ Cliquez sur un texte pour l'écrire, ou sur une image pour la remplacer." : mode === "test" ? "▶ Mode test : cliquez dans la maquette comme le client (onglets, boutons, images cliquables)." : sel ? <>Sélection : <b>&lt;{sel.tag}&gt;</b> {sel.texte ? `« ${sel.texte} »` : ""}</> : "👆 Cliquez sur un bloc ou une image de l'aperçu pour le sélectionner."}
      </p>
      {mode === "selection" && sel && (
        <div className="actions outils-selection">
          <button className="btn petit secondaire" onClick={() => envoyer({ type: "parent" })}>⬆️ Bloc parent</button>
          <button className="btn petit secondaire" onClick={() => outil("dupliquer")}>⧉ Dupliquer</button>
          <button className="btn petit secondaire" onClick={() => outil("supprimer")}>🗑 Supprimer</button>
          <button className="btn petit secondaire" onClick={() => setPanneau("images")}>🖼️ {sel.image ? "Remplacer l'image" : "Mettre une image"}</button>
          <label className="lien-clic">
            <span>🔗 Au clic, aller vers</span>
            <select value={sel.lien || ""} onChange={(e) => lier(e.target.value)}>
              <option value="">— rien (pas cliquable) —</option>
              {sel.lien && !cibles.includes(sel.lien) && <option value={sel.lien}>{sel.lien}</option>}
              {cibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}
      {message.texte && <p className={`alerte ${message.type === "erreur" ? "erreur" : "succes"}`}>{message.texte}</p>}
      </div>

      <div className={`atelier-zone ${panneau ? "avec-panneau" : ""}`}>
        <div className={`cadre-maquette ${format}`}>
          <iframe key={version} ref={cadre} title="Aperçu modifiable de la maquette" sandbox="allow-scripts allow-modals" srcDoc={injecter(source)} />
        </div>
        {panneau && (
          <aside className="panneau-atelier">
            {panneau === "images" && (
              <>
                {versImages && <button type="button" className="btn petit bouton-toute-maquette" onClick={() => versImages()}>🖼️ Remplacer TOUTE la maquette par mes images</button>}
                <p className="note">{sel?.image ? <b>🔁 Cliquez sur « Remplacer » sous une image de votre galerie : elle prend la place de l'image sélectionnée dans la maquette.</b> : sel ? <>Choisissez une image pour le bloc sélectionné (<b>&lt;{sel.tag}&gt;</b>).</> : "Pour remplacer une image de la maquette : cliquez dessus dans l'aperçu, puis sur « Remplacer » sous l'image de votre choix. « Ajouter » place une nouvelle image dans l'écran affiché."}</p>
                {sel && !sel.image && <p className="note">« Fond du bloc » met l'image en fond du bloc ; les petites vignettes en dessous l'ajoutent juste sous le bloc.</p>}
                <GalerieImages choisir={choisirImage} libelleChoisir={!sel ? "Ajouter" : sel.image ? "Remplacer" : "Fond du bloc"}
                  enPlus={versImages && !sel?.image ? { libelle: "🖼️ Remplacer toute la maquette", faire: (id, url) => versImages({ id, url }) } : null} />
                {sel && !sel.image && <GalerieAjout ajouter={ajouterImage} />}
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

// Maquette faite uniquement de vos images (un écran par image) : onglets en bas,
// et un clic sur l'image passe à l'écran suivant. Modifiable ensuite dans l'atelier.
export function maquetteImages(ecrans, titre = "Mon application", options = {}) {
  if (options.style === "vitrine") return maquetteVitrine(ecrans, titre, options);
  const { onglets = true } = options;
  const echapper = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const plusieurs = ecrans.length > 1;
  const barre = plusieurs && onglets;
  // Chaque écran tient en entier dans la fenêtre (pas besoin de faire défiler), quelle que soit sa taille.
  const reste = 30 + (barre ? 62 : 0);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${echapper(titre)}</title>
<style>
*{box-sizing:border-box;margin:0}html,body{height:100%}
body{background:#05060f;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;height:100vh;height:100dvh;overflow:hidden}
.bandeau{flex:none;font-size:11px;text-align:center;padding:4px;background:#1b2040;color:#a5abd6}
.ecran{display:none;flex:1;min-height:0;align-items:center;justify-content:center;padding:4px}.ecran.actif{display:flex}
.toile{position:relative;display:flex;max-width:100%;max-height:100%}
.toile img{display:block;width:auto;height:auto;max-width:100%;max-height:calc(100vh - ${reste}px);max-height:calc(100dvh - ${reste}px);object-fit:contain;${plusieurs ? "cursor:pointer;" : ""}}
.toile .decoupe{display:block;height:calc(100vh - ${reste}px);height:calc(100dvh - ${reste}px);max-width:100%;background-repeat:no-repeat;${plusieurs ? "cursor:pointer;" : ""}}
nav{flex:none;display:flex;justify-content:space-around;gap:4px;padding:10px 6px 14px;background:rgba(10,12,30,.94);border-top:1px solid #222a52;overflow-x:auto}
nav button{background:none;border:0;color:#8b93c9;font-size:13px;font-weight:600;padding:6px 10px;border-radius:10px;white-space:nowrap}
nav button.actif{color:#fff;background:#7b5cff}
</style></head><body data-maquette-images="1">
<div class="bandeau">Maquette Kaizen — aperçu non fonctionnel</div>
${ecrans.map((e, i) => `<section class="ecran${i === 0 ? " actif" : ""}" data-ecran="e${i}"><div class="toile">${e.decoupe ? styleDecoupe(e, echapper) : `<img src="${echapper(e.url)}" alt="${echapper(e.nom)}">`}</div></section>`).join("\n")}
${plusieurs ? `<nav${onglets ? "" : ' style="display:none"'}>${ecrans.map((e, i) => `<button${i === 0 ? ' class="actif"' : ""} data-vers="e${i}">${echapper(e.nom)}</button>`).join("")}</nav>` : ""}
<script>(function(){var b=[].slice.call(document.querySelectorAll('nav button'));function aller(id){document.querySelectorAll('.ecran').forEach(function(e){e.classList.toggle('actif',e.dataset.ecran===id)});b.forEach(function(x){x.classList.toggle('actif',x.dataset.vers===id)});}
b.forEach(function(x){x.addEventListener('click',function(){aller(x.dataset.vers)})});
document.querySelectorAll('.ecran img, .ecran .decoupe').forEach(function(im,i,l){im.addEventListener('click',function(e){if(e.target.closest('[data-lien-ecran]')||l.length<2)return;aller('e'+((i+1)%l.length));});});})();</script>
</body></html>`;
}

// Présentation « vitrine » (inspirée des fiches d'applications) : en-tête avec l'icône et le nom,
// puis les écrans en carrousel, chacun dans un téléphone sur fond coloré avec une phrase.
// Un clic sur un écran l'ouvre en grand. C'est une présentation de maquette, pas une vraie fiche de magasin.
export function maquetteVitrine(ecrans, titre = "Mon application", { sousTitre = "", couleur = "#7b2cbf", resume = "", icone = "" } = {}) {
  const e = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const initiale = (String(titre).trim()[0] || "K").toUpperCase();
  const ecranHtml = (x) => (x.decoupe ? styleDecoupe(x, e) : `<img src="${e(x.url)}" alt="${e(x.nom)}">`);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(titre)}</title>
<style>
*{box-sizing:border-box;margin:0}body{background:#000;color:#fff;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;--c:${e(couleur)}}
.bandeau{font-size:11px;text-align:center;padding:4px;background:#1b2040;color:#a5abd6}
.app{display:flex;gap:16px;align-items:center;padding:20px 18px 12px;max-width:900px;margin:0 auto}
.icone{flex:none;width:104px;height:104px;border-radius:24px;display:grid;place-items:center;font-size:62px;font-weight:900;background:linear-gradient(135deg,var(--c),#1a0533);box-shadow:0 8px 24px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.12)}
.app h1{font-size:22px;line-height:1.15}.app p{color:#9a9aa5;font-size:14px;margin-top:4px}
.voir{margin-top:12px;border:0;border-radius:999px;background:#0a84ff;color:#fff;font-weight:700;font-size:15px;padding:7px 18px;cursor:pointer}
.infos{display:flex;justify-content:space-between;gap:8px;padding:12px 18px;border-top:1px solid #222;border-bottom:1px solid #222;max-width:900px;margin:0 auto;text-align:center}
.infos div{flex:1}.infos small{display:block;font-size:10px;letter-spacing:.06em;color:#8e8e96;text-transform:uppercase}.infos b{display:block;font-size:20px;color:#c9c9d1;margin-top:4px}
.carrousel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:18px;max-width:100%;-webkit-overflow-scrolling:touch}
.carte{flex:0 0 74%;max-width:300px;scroll-snap-align:center;border-radius:24px;overflow:hidden;background:linear-gradient(165deg,var(--c) 0%,#2a0a4a 55%,#12031f 100%);padding:22px 16px 0;display:flex;flex-direction:column;align-items:center;cursor:zoom-in;aspect-ratio:9/17}
.carte h2{font-size:18px;line-height:1.25;text-align:center;font-weight:600;min-height:2.5em}
.tel{margin-top:16px;width:82%;flex:1;min-height:0;border:6px solid #0d0d10;border-bottom:0;border-radius:30px 30px 0 0;overflow:hidden;background:#111;box-shadow:0 14px 34px rgba(0,0,0,.55)}
.tel img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}.tel .decoupe{width:100%;height:100%;background-repeat:no-repeat}
.texte{max-width:900px;margin:0 auto;padding:4px 18px 30px;color:#d0d0d8;font-size:15px;line-height:1.5}
.visionneuse{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.94);display:none;align-items:center;justify-content:center}
.visionneuse.ouverte{display:flex}.visionneuse .vue{max-width:94vw;max-height:88vh;display:flex}
.visionneuse img{max-width:94vw;max-height:88vh;width:auto;height:auto;border-radius:18px}.visionneuse .decoupe{height:88vh;max-width:94vw}
.visionneuse button{position:absolute;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:22px;width:46px;height:46px;border-radius:50%;cursor:pointer}
.fermer{top:12px;right:12px}.prec{left:10px;top:50%}.suiv{right:10px;top:50%}
</style></head><body data-maquette-vitrine="1">
<div class="bandeau">Maquette Kaizen — aperçu non fonctionnel</div>
<header class="app">${icone ? `<div class="icone" style="background-image:url('${e(icone)}');background-size:cover;background-position:center"></div>` : `<div class="icone">${e(initiale)}</div>`}<div><h1>${e(titre)}</h1><p>${e(sousTitre || "Votre application, en avant-première")}</p><button class="voir" data-ouvrir="0">Voir la maquette</button></div></header>
<div class="infos"><div><small>Maquette</small><b>V1</b></div><div><small>Écrans</small><b>${ecrans.length}</b></div><div><small>Statut</small><b>✨</b></div><div><small>Création</small><b>Kaizen</b></div></div>
<div class="carrousel">
${ecrans.map((x, i) => `<div class="carte" data-ouvrir="${i}"><h2>${e(x.legende || x.nom)}</h2><div class="tel">${ecranHtml(x)}</div></div>`).join("\n")}
</div>
${resume ? `<p class="texte">${e(resume)}</p>` : ""}
<div class="visionneuse" aria-hidden="true"><div class="vue"></div><button class="fermer" aria-label="Fermer">✕</button><button class="prec" aria-label="Précédent">‹</button><button class="suiv" aria-label="Suivant">›</button></div>
<script>(function(){var cartes=[].slice.call(document.querySelectorAll('.carte')),v=document.querySelector('.visionneuse'),vue=v.querySelector('.vue'),n=0;
function montrer(i){n=(i+cartes.length)%cartes.length;var t=cartes[n].querySelector('.tel').firstElementChild.cloneNode(true);vue.innerHTML='';vue.appendChild(t);v.classList.add('ouverte');}
document.addEventListener('click',function(ev){if(document.designMode==='on')return;var o=ev.target.closest('[data-ouvrir]');if(o&&!ev.target.closest('[data-lien-ecran]')){montrer(+o.getAttribute('data-ouvrir'));return;}
if(ev.target.closest('.fermer')||ev.target===v)v.classList.remove('ouverte');if(ev.target.closest('.prec'))montrer(n-1);if(ev.target.closest('.suiv'))montrer(n+1);});})();</script>
</body></html>`;
}

// Vitrines déjà enregistrées : l'image remplit maintenant tout l'écran du téléphone.
export const majVitrine = (html) => String(html || "").replace('.tel img{display:block;width:100%;height:auto}.tel .decoupe{width:100%;background-repeat:no-repeat}', '.tel img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}.tel .decoupe{width:100%;height:100%;background-repeat:no-repeat}');

// Une partie d'une image qui contient plusieurs écrans (côte à côte et/ou sur plusieurs lignes).
const MAX_ECRANS = 40;
function fond(d) {
  const n = d.n || 1, m = d.m || 1, k = d.k || 0, r = d.r || 0;
  return {
    taille: `${n * 100}% ${m * 100}%`,
    position: `${n === 1 ? 0 : (k / (n - 1)) * 100}% ${m === 1 ? 0 : (r / (m - 1)) * 100}%`,
    ratio: `${Math.round(d.l / n)} / ${Math.round(d.h / m)}`,
  };
}
function styleDecoupe(e, echapper) {
  const f = fond(e.decoupe);
  return `<div class="decoupe" role="img" aria-label="${echapper(e.nom)}" style="background-image:url('${echapper(e.url)}');background-size:${f.taille};background-position:${f.position};aspect-ratio:${f.ratio}"></div>`;
}
// Accentue légèrement les contours (filtre de netteté) après un agrandissement.
function nettete(ctx, l, h, force) {
  const src = ctx.getImageData(0, 0, l, h);
  const d = src.data, out = new Uint8ClampedArray(d);
  const c = 1 + 4 * force;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < l - 1; x++) {
      const i = (y * l + x) * 4;
      for (let k = 0; k < 3; k++) {
        out[i + k] = c * d[i + k] - force * (d[i + k - 4] + d[i + k + 4] + d[i + k - l * 4] + d[i + k + l * 4]);
      }
    }
  }
  ctx.putImageData(new ImageData(out, l, h), 0, 0);
}
const dimensions = (url) => new Promise((ok) => { const i = new Image(); i.onload = () => ok({ l: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => ok(null); i.src = url; });

// Découpe d'une image : nombre d'écrans par ligne et nombre de lignes.
function Decoupe({ couper }) {
  const [n, setN] = useState(2);
  const [m, setM] = useState(1);
  return (
    <span className="decoupe-choix">
      <span aria-hidden="true">✂️</span>
      <label><small>Écrans côte à côte (de gauche à droite)</small>
        <select value={n} onChange={(e) => setN(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => <option key={x} value={x}>{x} écran{x > 1 ? "s" : ""} par ligne</option>)}
        </select>
      </label>
      <label><small>Lignes (de haut en bas)</small>
        <select value={m} onChange={(e) => setM(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((x) => <option key={x} value={x}>{x} ligne{x > 1 ? "s" : ""}</option>)}
        </select>
      </label>
      <button type="button" className="btn petit" disabled={n * m < 2} onClick={() => couper(n, m)}>Couper en {n * m} écrans</button>
    </span>
  );
}

// Choix des images qui deviennent les écrans de la maquette.
export function ChoixEcransImages({ valider, annuler, initial = null }) {
  const [ecrans, setEcrans] = useState(initial ? [{ ...initial, nom: "Accueil" }] : []);
  const [onglets, setOnglets] = useState(true);
  const [style, setStyle] = useState("ecrans");
  const [sousTitre, setSousTitre] = useState("");
  const [couleur, setCouleur] = useState("#7b2cbf");
  const [icone, setIcone] = useState("");
  const [choixIcone, setChoixIcone] = useState(false);
  // Une planche avec plusieurs écrans (ex. 6 par ligne sur 2 lignes) est VRAIMENT découpée :
  // chaque écran devient sa propre image (ajoutée à la galerie), lue ligne par ligne.
  const [decoupe, setDecoupe] = useState("");
  const [erreur, setErreur] = useState("");
  async function couper(i, n, m) {
    const e = ecrans[i];
    setErreur(""); setDecoupe("Découpe de l'image…");
    try {
      const img = await new Promise((ok, ko) => { const x = new Image(); x.onload = () => ok(x); x.onerror = () => ko(new Error("Image illisible")); x.src = e.url; });
      const lc = img.naturalWidth / n, hc = img.naturalHeight / m;
      // Petits écrans (planche en basse définition) : agrandis jusqu'à 2× avec un lissage de qualité,
      // puis rendus plus nets, pour un aperçu moins flou.
      const agrandir = Math.max(1, Math.min(2, 720 / lc));
      const toile = document.createElement("canvas");
      toile.width = Math.round(lc * agrandir); toile.height = Math.round(hc * agrandir);
      const ctx = toile.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      const parts = [];
      for (let r = 0; r < m; r++) {
        for (let k = 0; k < n; k++) {
          const numero = parts.length + 1;
          setDecoupe(`Découpe : écran ${numero} sur ${n * m}…`);
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, toile.width, toile.height);
          ctx.drawImage(img, k * lc, r * hc, lc, hc, 0, 0, toile.width, toile.height);
          if (agrandir > 1.05) nettete(ctx, toile.width, toile.height, 0.35);
          let donnees = toile.toDataURL("image/jpeg", 0.94);
          if (donnees.length > 3_800_000) donnees = toile.toDataURL("image/jpeg", 0.85);
          const rep = await api({ action: "image_ajouter", image: donnees, description: `${e.nom || "Planche"} — écran ${numero}` });
          parts.push({ id: rep.image.id, url: urlImage(rep.image.id), nom: numero === 1 ? e.nom : `Écran ${i + numero}` });
        }
      }
      setEcrans((l) => [...l.slice(0, i), ...parts, ...l.slice(i + 1)].slice(0, MAX_ECRANS));
      if (n * m > 6) setOnglets(false); // l'image a souvent sa propre barre de menu : on la rend cliquable avec « ▭ Zone cliquable »
    } catch (err) {
      setErreur(`La découpe n'a pas abouti (${err.message}). Réessayez.`);
    } finally { setDecoupe(""); }
  }
  const deplacer = (i, d) => setEcrans((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div className="choix-ecrans">
      <h3>🖼️ Faire la maquette avec mes images</h3>
      <p className="note">Chaque image devient un écran (vos captures, vos dessins, les images de l'IA…). Cliquez sur « + Écran » sous vos images dans l'ordre voulu. Si une image contient plusieurs écrans (une planche), choisissez combien il y en a par ligne et combien de lignes, puis « Couper ». Nommez les écrans comme les boutons de votre application (Accueil, Entretien, Historique…). Jusqu'à {MAX_ECRANS} écrans.</p>
      {ecrans.length > 0 && (
        <ol className="liste-ecrans">
          {ecrans.map((e, i) => {
            const f = e.decoupe ? fond(e.decoupe) : null;
            return (
              <li key={`${e.id}-${i}-${e.decoupe ? `${e.decoupe.k}-${e.decoupe.r}` : ""}`}>
                {f
                  ? <span className="vignette-decoupe" style={{ backgroundImage: `url(${e.url})`, backgroundSize: f.taille, backgroundPosition: f.position }} />
                  : <img src={e.url} alt="" />}
                <input value={e.nom} maxLength={24} onChange={(ev) => setEcrans((l) => l.map((x, j) => (j === i ? { ...x, nom: ev.target.value } : x)))} aria-label={`Nom de l'écran ${i + 1}`} />
                {style === "vitrine" && <input className="legende" value={e.legende ?? ""} maxLength={80} placeholder="Phrase au-dessus de l'écran (ex. Suivez l'entretien de votre moto)" onChange={(ev) => setEcrans((l) => l.map((x, j) => (j === i ? { ...x, legende: ev.target.value } : x)))} aria-label={`Phrase de l'écran ${i + 1}`} />}
                <button type="button" className="btn petit secondaire" onClick={() => deplacer(i, -1)} aria-label="Monter">↑</button>
                <button type="button" className="btn petit secondaire" onClick={() => deplacer(i, 1)} aria-label="Descendre">↓</button>
                {!e.decoupe && !decoupe && <Decoupe couper={(n, m) => couper(i, n, m)} />}
                <button type="button" className="btn petit secondaire" onClick={() => setEcrans((l) => l.filter((_, j) => j !== i))} aria-label="Retirer">×</button>
              </li>
            );
          })}
        </ol>
      )}
      {decoupe && <div className="chargement"><span className="rond" /> {decoupe}</div>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      {ecrans.length > 0 && (
        <div className="style-presentation">
          <span>Présentation :</span>
          <button type="button" className={`btn petit ${style === "ecrans" ? "" : "secondaire"}`} onClick={() => setStyle("ecrans")}>📱 Écran par écran</button>
          <button type="button" className={`btn petit ${style === "vitrine" ? "" : "secondaire"}`} onClick={() => setStyle("vitrine")}>🛍️ Vitrine (comme une fiche d'application)</button>
        </div>
      )}
      {style === "vitrine" && ecrans.length > 0 && (
        <div className="options-vitrine">
          <label className="champ" style={{ marginTop: 0 }}><span>Phrase sous le nom de l'application</span>
            <input value={sousTitre} maxLength={70} onChange={(e) => setSousTitre(e.target.value)} placeholder="Ex. : Votre moto connectée et suivie au quotidien" />
          </label>
          <div className="choix-signet">
            <span className="apercu-signet" style={icone ? { backgroundImage: `url(${icone})` } : { background: `linear-gradient(135deg, ${couleur}, #1a0533)` }}>{icone ? "" : "K"}</span>
            <div>
              <b>Signet (icône de l'application)</b>
              <div className="actions">
                <button type="button" className="btn petit" onClick={() => setChoixIcone((x) => !x)}>{choixIcone ? "Fermer" : "🖼️ Choisir dans ma galerie"}</button>
                {icone && <button type="button" className="btn petit secondaire" onClick={() => setIcone("")}>Retirer</button>}
              </div>
            </div>
          </div>
          {choixIcone && <GalerieImages libelleChoisir="Prendre comme signet" choisir={(_id, url) => { setIcone(url); setChoixIcone(false); }} />}
          <label className="ligne-couleur"><input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} /> <span>Couleur des fonds</span></label>
          <p className="note">Écrivez une phrase pour chaque écran (au-dessus du téléphone). Le client fait défiler les écrans et les ouvre en grand d'un clic.</p>
        </div>
      )}
      {ecrans.length > 1 && style === "ecrans" && (
        <label className="case">
          <input type="checkbox" checked={onglets} onChange={(e) => setOnglets(e.target.checked)} />
          <span>Ajouter une barre d'onglets en bas (décochez si vos images ont déjà leur menu : rendez-le cliquable avec « ▭ Zone cliquable »)</span>
        </label>
      )}
      <div className="actions">
        <button className="btn" disabled={!ecrans.length || Boolean(decoupe)} onClick={() => valider(ecrans, { onglets, style, sousTitre, couleur, icone })}>✅ Créer la maquette avec {ecrans.length || "mes"} écran{ecrans.length > 1 ? "s" : ""}</button>
        <button className="btn secondaire" onClick={annuler}>Annuler</button>
      </div>
      <GalerieImages libelleChoisir="+ Écran" choisir={(id, url) => setEcrans((l) => (l.length >= MAX_ECRANS ? l : [...l, { id, url, nom: l.length === 0 ? "Accueil" : `Écran ${l.length + 1}` }]))} />
    </div>
  );
}

// Server envoie la maquette au client : message dans son espace + e-mail avec le lien.
export function EnvoiMaquette({ commande, apres }) {
  const genie = commande.formule === "genie";
  const [mot, setMot] = useState("");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [enCours, setEnCours] = useState(false);
  if (!commande.maquette) return null;
  const deja = commande.projet?.maquetteEnvoyeeLe;
  async function envoyer() {
    setEnCours(true); setEtat({ type: "", texte: "" });
    try {
      const r = await api({ action: "maquette_envoyer", commandeId: commande.id, mot });
      setEtat({ type: "succes", texte: r.email ? `✅ Envoyé ! ${commande.nom || "Le client"} a reçu un e-mail avec le lien de sa maquette, et un message dans son espace.` : "✅ Message envoyé dans l'espace du client (l'e-mail n'a pas pu partir : vérifiez RESEND_API_KEY dans Vercel)." });
      setMot("");
      apres?.();
    } catch (e) { setEtat({ type: "erreur", texte: e.message }); } finally { setEnCours(false); }
  }
  return (
    <div className="envoi-maquette">
      <h3>{genie ? "🧞 Exaucer le vœu : envoyer la maquette au client" : "📩 Envoyer la maquette au client"}</h3>
      <p className="note">{deja ? `Déjà envoyée le ${new Date(deja).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Vous pouvez la renvoyer après une modification.` : "Le client recevra un e-mail avec le lien de sa maquette et un message dans son espace, où il pourra l'accepter ou demander une modification."}</p>
      <label className="champ" style={{ marginTop: 0 }}>
        <span>Votre mot pour le client <small className="discret">(facultatif)</small></span>
        <textarea rows={3} maxLength={1500} value={mot} onChange={(e) => setMot(e.target.value)} placeholder={genie ? "Ex. : Voici votre application telle que je l'imagine ! Dites-moi ce que vous en pensez." : "Ex. : Voici la maquette de votre application, j'attends votre avis."} />
      </label>
      <button className="btn" disabled={enCours} onClick={envoyer}>{enCours ? "Envoi…" : genie ? "🧞 Vœu exaucé : envoyer au client" : "📩 Envoyer au client"}</button>
      {etat.texte && <p className={`alerte ${etat.type === "erreur" ? "erreur" : "succes"}`}>{etat.texte}</p>}
    </div>
  );
}

// « Vitrine express » : 6 emplacements d'images + 1 pour le signet, puis la maquette est créée
// directement en présentation Vitrine (comme une fiche d'application).
export function VitrineExpress({ titre, valider, annuler }) {
  const [cases, setCases] = useState(() => Array.from({ length: 6 }, () => ({ url: "", phrase: "" })));
  const [signet, setSignet] = useState("");
  const [nom, setNom] = useState(titre || "");
  const [sousTitre, setSousTitre] = useState("");
  const [couleur, setCouleur] = useState("#7b2cbf");
  const [attente, setAttente] = useState("");
  const [erreur, setErreur] = useState("");
  const [galeriePour, setGaleriePour] = useState(null); // "signet" ou numéro de case

  const placer = (cible, url) => {
    if (cible === "signet") setSignet(url);
    else setCases((l) => l.map((c, j) => (j === cible ? { ...c, url } : c)));
  };
  async function importer(cible, fichier) {
    if (!fichier) return;
    if (!/^image\//.test(fichier.type)) { setErreur("Choisissez une image (JPG, PNG…)."); return; }
    setErreur(""); setAttente(cible === "signet" ? "Envoi du signet…" : `Envoi de l'image ${cible + 1}…`);
    try {
      const r = await api({ action: "image_ajouter", image: await versDataUrl(fichier, cible === "signet" ? 1024 : 4096, { qualite: 0.93, max: 3_800_000 }), description: cible === "signet" ? `Signet — ${fichier.name}` : `Vitrine ${cible + 1} — ${fichier.name}` });
      placer(cible, urlImage(r.image.id));
    } catch (e) { setErreur(e.message); } finally { setAttente(""); }
  }
  const remplies = cases.filter((c) => c.url);
  const Emplacement = ({ cible, url, libelle, carre }) => (
    <div className={`emplacement ${carre ? "carre" : ""} ${url ? "rempli" : ""}`}>
      <label className="emplacement-zone">
        {url ? <img src={url} alt={libelle} /> : <span><b>📥</b>{libelle}<small>Toucher pour ajouter</small></span>}
        <input type="file" accept="image/*" hidden onChange={(e) => { importer(cible, e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="emplacement-actions">
        <button type="button" className="btn petit secondaire" onClick={() => setGaleriePour(galeriePour === cible ? null : cible)}>🖼️ Galerie</button>
        {url && <button type="button" className="btn petit secondaire" onClick={() => placer(cible, "")} aria-label="Retirer">×</button>}
      </div>
    </div>
  );

  return (
    <div className="vitrine-express">
      <h3>🛍️ Vitrine en 6 images</h3>
      <p className="note">Ajoutez le signet (l'icône) et jusqu'à 6 écrans de l'application, avec une phrase pour chacun. La maquette sera présentée comme une fiche d'application.</p>
      <div className="ve-entete">
        <div>
          <p className="ve-titre">Signet</p>
          <Emplacement cible="signet" url={signet} libelle="Signet" carre />
        </div>
        <div className="ve-champs">
          <label className="champ" style={{ marginTop: 0 }}><span>Nom de l'application</span><input value={nom} maxLength={40} onChange={(e) => setNom(e.target.value)} /></label>
          <label className="champ" style={{ marginTop: 0 }}><span>Phrase d'accroche</span><input value={sousTitre} maxLength={70} onChange={(e) => setSousTitre(e.target.value)} placeholder="Ex. : Votre moto connectée et suivie au quotidien" /></label>
          <label className="ligne-couleur"><input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} /> <span>Couleur des fonds</span></label>
        </div>
      </div>
      {galeriePour === "signet" && <GalerieImages libelleChoisir="Prendre comme signet" choisir={(_id, url) => { placer("signet", url); setGaleriePour(null); }} />}
      <div className="ve-grille">
        {cases.map((c, i) => (
          <div key={i} className="ve-case">
            <Emplacement cible={i} url={c.url} libelle={`Image ${i + 1}`} />
            <input className="ve-phrase" value={c.phrase} maxLength={80} placeholder={`Phrase de l'image ${i + 1}`} onChange={(e) => setCases((l) => l.map((x, j) => (j === i ? { ...x, phrase: e.target.value } : x)))} />
          </div>
        ))}
      </div>
      {typeof galeriePour === "number" && <GalerieImages libelleChoisir={`Mettre en image ${galeriePour + 1}`} choisir={(_id, url) => { placer(galeriePour, url); setGaleriePour(null); }} />}
      {attente && <div className="chargement"><span className="rond" /> {attente}</div>}
      {erreur && <p className="alerte erreur">{erreur}</p>}
      <div className="actions">
        <button className="btn" disabled={!remplies.length || Boolean(attente)} onClick={() => valider(remplies.map((c, i) => ({ id: `v${i}`, url: c.url, nom: c.phrase || `Écran ${i + 1}`, legende: c.phrase })), { style: "vitrine", sousTitre, couleur, icone: signet, nom: nom.trim() || titre })}>✅ Créer la maquette ({remplies.length} image{remplies.length > 1 ? "s" : ""})</button>
        <button className="btn secondaire" onClick={annuler}>Annuler</button>
      </div>
    </div>
  );
}
