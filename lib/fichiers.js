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

// Ajoute des fichiers en respectant les limites. Retourne { fichiers, refus }.
export async function ajouterFichiers(existants, nouveaux) {
  const fichiers = [...existants];
  const refus = [];
  let total = fichiers.reduce((acc, f) => acc + f.taille, 0);
  for (const f of nouveaux) {
    if (fichiers.length >= LIMITES.nombre) { refus.push(`${f.name} : ${LIMITES.nombre} fichiers maximum.`); continue; }
    if (!LIMITES.types.includes(f.type)) { refus.push(`${f.name} : format non accepté (images ou PDF).`); continue; }
    if (f.size > LIMITES.tailleMax) { refus.push(`${f.name} : trop lourd (1,5 Mo maximum).`); continue; }
    if (total + f.size > LIMITES.totalMax) { refus.push(`${f.name} : la taille totale dépasse 2,5 Mo.`); continue; }
    fichiers.push({ nom: f.name.slice(0, 120), type: f.type, taille: f.size, contenu: await lireEnBase64(f) });
    total += f.size;
  }
  return { fichiers, refus };
}

export const tailleLisible = (o) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);
