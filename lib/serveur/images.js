// Atelier de Server : génération d'images par l'IA (OpenAI) et images importées.
import OpenAI from "openai";

export const FORMATS_IMAGE = { carre: "1024x1024", portrait: "1024x1536", paysage: "1536x1024" };
// Modèles d'image : celui choisi dans Vercel (OPENAI_MODEL_IMAGE), sinon les modèles d'image
// réellement disponibles sur le compte OpenAI (les noms changent avec le temps).
const PREFERES = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini", "dall-e-3"];
let modelesCompte = null;
async function modelesImage(client) {
  const choisis = [process.env.OPENAI_MODEL_IMAGE].filter(Boolean);
  if (!modelesCompte) {
    try {
      const ids = [];
      for await (const m of client.models.list()) ids.push(m.id);
      const image = ids.filter((id) => /^(gpt-image|chatgpt-image|dall-e-3)/.test(id) && !/\d{4}-\d{2}-\d{2}$/.test(id));
      // Les plus récents d'abord (gpt-image-2 avant gpt-image-1…), les « mini » après, DALL·E en dernier.
      image.sort((a, b) => (/dall-e/.test(a) - /dall-e/.test(b)) || (/mini/.test(a) - /mini/.test(b)) || b.localeCompare(a, "en", { numeric: true }));
      modelesCompte = image;
    } catch { modelesCompte = []; }
  }
  return [...new Set([...choisis, ...modelesCompte, ...(modelesCompte.length ? [] : PREFERES)])];
}

const TAILLES_DALLE = { carre: "1024x1024", portrait: "1024x1792", paysage: "1792x1024" };
const modeleInconnu = (e) => /does not exist|not found|model_not_found|unknown model|invalid model|not supported|unsupported/i.test(String(e?.message || "")) && e?.status !== 403;

async function generer(client, modele, description, format) {
  const dalle = /^dall-e/.test(modele);
  const r = await client.images.generate(dalle
    ? { model: modele, prompt: description, size: TAILLES_DALLE[format] || TAILLES_DALLE.carre, response_format: "b64_json", n: 1 }
    : { model: modele, prompt: description, size: FORMATS_IMAGE[format] || FORMATS_IMAGE.carre, quality: "medium", output_format: "webp", output_compression: 82, n: 1 });
  const b64 = r.data?.[0]?.b64_json;
  if (!b64) throw new Error("Pas d'image dans la réponse");
  return { type: dalle ? "image/png" : "image/webp", contenu: b64 };
}

export async function genererImage(description, format = "carre") {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 240_000, maxRetries: 0 });
  const essais = [];
  try {
    for (const modele of await modelesImage(client)) {
      try {
        return await generer(client, modele, description, format);
      } catch (e) {
        if (!modeleInconnu(e)) throw e; // vraie erreur : on s'arrête
        essais.push(modele);
        console.error(`Kaizen image : modèle ${modele} indisponible (${e?.message})`);
      }
    }
    throw new Error(`Aucun modèle d'image disponible sur votre compte OpenAI (essayés : ${essais.join(", ") || "aucun"}). Indiquez le bon nom dans Vercel : variable OPENAI_MODEL_IMAGE.`);
  } catch (e) {
    const m = String(e?.message || "");
    if (/^Aucun modèle/.test(m)) throw e;
    if (e?.status === 403 && /verif/i.test(m)) throw new Error("Votre organisation OpenAI doit être vérifiée pour générer des images : platform.openai.com → Settings → Organization → Verify. Réessayez ensuite (comptez quelques minutes).");
    if (e?.status === 400 && /safety|moderation|policy/i.test(m)) throw new Error("L'IA a refusé cette description (règles de sécurité). Reformulez-la.");
    if (/timed? ?out|timeout|aborted/i.test(m)) throw new Error("La génération a pris trop de temps. Réessayez.");
    throw new Error(`L'image n'a pas pu être générée (${m.slice(0, 160) || "erreur inconnue"}).`);
  }
}

// Image importée par Server (déjà réduite dans le navigateur).
export function validerImageImportee(url) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(url || ""));
  if (!m || m[2].length > 1_600_000) return null;
  return { type: m[1], contenu: m[2] };
}

// Maquette écrite à la main dans l'atelier.
export function validerMaquetteAtelier(html) {
  const h = String(html || "").trim();
  if (!/^<!doctype html/i.test(h)) return { erreur: "La maquette doit commencer par <!doctype html>." };
  if (h.length < 100) return { erreur: "La maquette est vide." };
  if (h.length > 120_000) return { erreur: `La maquette est trop lourde (${Math.round(h.length / 1000)} 000 caractères, maximum 120 000). Utilisez des images de la galerie (adresse /api/images/…) plutôt que des images collées.` };
  return { html: h };
}
