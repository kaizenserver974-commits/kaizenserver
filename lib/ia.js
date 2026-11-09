// Accès à l'IA (OpenAI, Responses API). Si OPENAI_API_KEY est absente
// ou si l'appel échoue, les routes basculent sur le moteur de règles.

import OpenAI from "openai";

export const iaDisponible = () => Boolean(process.env.OPENAI_API_KEY);

const CONSIGNES_GENERALES = `
Tu es Kaizen, un assistant qui aide des personnes qui ne connaissent rien au développement à transformer leur idée en projet d'application.
Règles :
- Réponds uniquement en français, avec des mots simples, sans jargon technique (ou en l'expliquant).
- Sois concret, bienveillant et honnête : si une idée est trop large, propose de commencer petit.
- Ne donne jamais de prix, de délai ni de chiffre : c'est Server, le maître du jeu (une vraie personne), qui les donne au client après sa commande.
- Ne promets jamais un résultat commercial.
`;

export const MODELE = () => process.env.OPENAI_MODEL || "gpt-5-mini";
// Modèle plus puissant pour les maquettes de Server (fidélité aux images, qualité visuelle).
export const MODELE_MAQUETTE = () => process.env.OPENAI_MODEL_MAQUETTE || "gpt-5";

// Images jointes en haute définition : l'IA voit les détails (couleurs, icônes, petits textes).
const entreesImages = (images) => images.map((url) => ({ type: "input_image", image_url: url, detail: "high" }));

export async function demanderJSON({ consignes, contenu, nom, schema, effort = "low", images = [], modele, delai }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, ...(delai ? { timeout: delai, maxRetries: 0 } : {}) });
  const reponse = await client.responses.create({
    model: modele || MODELE(),
    store: false,
    reasoning: { effort },
    instructions: `${CONSIGNES_GENERALES}\n${consignes}`,
    input: [{ role: "user", content: [{ type: "input_text", text: contenu }, ...entreesImages(images)] }],
    text: { format: { type: "json_schema", name: nom, strict: true, schema } },
  });
  if (!reponse.output_text) throw new Error("Réponse IA vide");
  return JSON.parse(reponse.output_text);
}

export async function demanderTexte({ consignes, contenu, effort = "low", images = [], delai = 50_000, modele }) {
  // Coupe avant la limite de durée de la fonction Vercel (voir maxDuration de la route).
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: delai, maxRetries: 0 });
  const reponse = await client.responses.create({
    model: modele || MODELE(),
    store: false,
    reasoning: { effort },
    instructions: `${CONSIGNES_GENERALES}\n${consignes}`,
    input: [{ role: "user", content: [{ type: "input_text", text: contenu }, ...entreesImages(images)] }],
  });
  if (!reponse.output_text) throw new Error("Réponse IA vide");
  return reponse.output_text;
}

// Petit utilitaire pour écrire les schémas JSON stricts plus vite.
export const s = {
  str: () => ({ type: "string" }),
  enumStr: (values) => ({ type: "string", enum: values }),
  arr: (items) => ({ type: "array", items }),
  obj: (properties) => ({
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  }),
};
