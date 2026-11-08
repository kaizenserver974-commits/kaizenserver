// Pièces jointes d'un projet (images, PDF), gardées dans le navigateur
// (IndexedDB) puis envoyées avec la commande.

export const LIMITES = {
  nombre: 3,
  tailleMax: 1.5 * 1024 * 1024, // par fichier
  totalMax: 2.5 * 1024 * 1024, // tous fichiers confondus (limite d'envoi)
  types: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"],
};

const BASE = "kaizen-fichiers";
const MAGASIN = "fichiers";

function ouvrir() {
  return new Promise((resoudre, rejeter) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN);
    r.onsuccess = () => resoudre(r.result);
    r.onerror = () => rejeter(r.error);
  });
}

async function transaction(mode, action) {
  const db = await ouvrir();
  return new Promise((resoudre, rejeter) => {
    const tx = db.transaction(MAGASIN, mode);
    const resultat = action(tx.objectStore(MAGASIN));
    tx.oncomplete = () => resoudre(resultat?.result);
    tx.onerror = () => rejeter(tx.error);
  });
}

export async function lireFichiers(projetId) {
  try {
    return (await transaction("readonly", (m) => m.get(projetId))) || [];
  } catch {
    return [];
  }
}

export async function enregistrerFichiers(projetId, fichiers) {
  await transaction("readwrite", (m) => m.put(fichiers, projetId));
}

const lireEnBase64 = (fichier) =>
  new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resoudre(String(lecteur.result).split(",")[1] || "");
    lecteur.onerror = () => rejeter(lecteur.error);
    lecteur.readAsDataURL(fichier);
  });

// Réduit une image trop lourde (ex. capture d'écran d'iPad) : redimensionnée et
// convertie en JPEG jusqu'à passer sous la cible. Retourne un Blob, ou null si impossible.
const CIBLE_IMAGE = 700 * 1024;
async function decoderImage(fichier) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(fichier); } catch { /* on essaie autrement */ }
  }
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
async function reduireImage(fichier) {
  try {
    const img = await decoderImage(fichier);
    const largeur = img.width || img.naturalWidth, hauteur = img.height || img.naturalHeight;
    if (!largeur || !hauteur) return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let blob = null;
    for (const [cote, qualite] of [[2000, 0.85], [1600, 0.8], [1280, 0.75], [1000, 0.7], [800, 0.65]]) {
      const r = Math.min(1, cote / Math.max(largeur, hauteur));
      canvas.width = Math.round(largeur * r);
      canvas.height = Math.round(hauteur * r);
      ctx.fillStyle = "#fff"; // fond blanc pour les images transparentes
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", qualite));
      if (blob && blob.size <= CIBLE_IMAGE) break;
    }
    return blob && blob.size <= LIMITES.tailleMax ? blob : null;
  } catch {
    return null;
  }
}

const EST_IMAGE_REDUCTIBLE = (t) => ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"].includes(t);

// Ajoute des fichiers en respectant les limites. Les images trop lourdes sont
// réduites automatiquement. Retourne { fichiers, refus, reduites }.
export async function ajouterFichiers(existants, nouveaux) {
  const fichiers = [...existants];
  const refus = [];
  let reduites = 0;
  let total = fichiers.reduce((acc, f) => acc + f.taille, 0);
  for (const original of nouveaux) {
    let f = original, nom = original.name, type = original.type;
    if (fichiers.length >= LIMITES.nombre) { refus.push(`${nom} : ${LIMITES.nombre} fichiers maximum.`); continue; }
    const heic = /\.(heic|heif)$/i.test(nom) || ["image/heic", "image/heif"].includes(type);
    if (!LIMITES.types.includes(type) && !heic) { refus.push(`${nom} : format non accepté (images ou PDF).`); continue; }
    // Image lourde (ou HEIC d'iPhone) : on la réduit au lieu de la refuser.
    if ((heic || (EST_IMAGE_REDUCTIBLE(type) && f.size > CIBLE_IMAGE))) {
      const blob = await reduireImage(f);
      if (blob) {
        f = blob; type = "image/jpeg"; nom = nom.replace(/\.[^.]+$/, "") + ".jpg"; reduites += 1;
      } else if (heic) {
        refus.push(`${nom} : format non accepté (images ou PDF).`); continue;
      }
    }
    if (f.size > LIMITES.tailleMax) { refus.push(`${nom} : trop lourd (1,5 Mo maximum).`); continue; }
    if (total + f.size > LIMITES.totalMax) { refus.push(`${nom} : la taille totale dépasse 2,5 Mo.`); continue; }
    fichiers.push({ nom: nom.slice(0, 120), type, taille: f.size, contenu: await lireEnBase64(f) });
    total += f.size;
  }
  return { fichiers, refus, reduites };
}

export const tailleLisible = (o) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);
