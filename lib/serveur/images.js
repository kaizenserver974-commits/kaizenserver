// Atelier de Server : génération d'images par l'IA (OpenAI) et images importées.
import OpenAI from "openai";

export const FORMATS_IMAGE = { carre: "1024x1024", portrait: "1024x1536", paysage: "1536x1024" };
export const MODELE_IMAGE = () => process.env.OPENAI_MODEL_IMAGE || "gpt-image-1";

export async function genererImage(description, format = "carre") {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 240_000, maxRetries: 0 });
  try {
    const r = await client.images.generate({
      model: MODELE_IMAGE(),
      prompt: description,
      size: FORMATS_IMAGE[format] || FORMATS_IMAGE.carre,
      quality: "medium",
      output_format: "webp",
      output_compression: 82,
      n: 1,
    });
    const b64 = r.data?.[0]?.b64_json;
    if (!b64) throw new Error("Pas d'image dans la réponse");
    return { type: "image/webp", contenu: b64 };
  } catch (e) {
    const m = String(e?.message || "");
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
