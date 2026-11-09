// Comment installer le signet KaizenServer (icône sur l'écran d'accueil), selon l'appareil.
export const ETAPES_SIGNET = [
  { appareil: "iPhone / iPad", icone: "🍏", etapes: ["Ouvrez le lien avec Safari.", "Touchez le bouton Partager (le carré avec une flèche vers le haut ⬆️).", "Choisissez « Sur l'écran d'accueil », puis « Ajouter »."] },
  { appareil: "Android", icone: "🤖", etapes: ["Ouvrez le lien avec Chrome.", "Touchez les trois points ⋮ en haut à droite.", "Choisissez « Installer l'application » (ou « Ajouter à l'écran d'accueil »)."] },
  { appareil: "Ordinateur", icone: "💻", etapes: ["Ouvrez le lien avec Chrome ou Edge.", "Cliquez sur l'icône « Installer » à droite de l'adresse (ou appuyez sur Ctrl + D, Cmd + D sur Mac, pour l'ajouter aux favoris).", "KaizenServer s'ouvre alors en un clic."] },
];

export function texteSignet(lien) {
  return ETAPES_SIGNET.map((a) => `${a.icone} ${a.appareil}\n${a.etapes.map((e, i) => `   ${i + 1}. ${e}`).join("\n")}`).join("\n\n")
    + `\n\nLien à ouvrir : ${lien}`;
}

const echapper = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function htmlSignet({ nom, lien, mot, site }) {
  return `<div style="font-family:Arial,sans-serif;color:#14213d;max-width:580px;margin:auto">
<h2 style="margin:0 0 10px">Bonjour ${echapper(nom || "")} 👋</h2>
${mot ? `<p style="white-space:pre-wrap">${echapper(mot)}</p>` : ""}
<p>Voici votre accès à <b>KaizenServer</b>, pour suivre votre projet d'application :</p>
<p style="text-align:center;margin:22px 0"><a href="${echapper(lien)}" style="background:linear-gradient(135deg,#4f7cff,#d946ef);color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:bold;display:inline-block">Ouvrir KaizenServer</a></p>
<h3 style="margin:24px 0 6px">📲 Gardez KaizenServer sur votre écran d'accueil</h3>
<p style="margin:0 0 10px">En 3 gestes, l'icône KaizenServer s'ajoute à côté de vos applications :</p>
${ETAPES_SIGNET.map((a) => `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:10px 14px;margin:8px 0"><b>${a.icone} ${a.appareil}</b><ol style="margin:6px 0 0;padding-left:20px">${a.etapes.map((e) => `<li>${echapper(e)}</li>`).join("")}</ol></div>`).join("")}
<p style="font-size:13px;color:#64748b">Explications illustrées : <a href="${echapper(site)}/installer">${echapper(site)}/installer</a></p>
<p>À très vite,<br>Server — KaizenServer</p></div>`;
}
