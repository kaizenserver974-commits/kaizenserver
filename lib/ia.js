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

export async function demanderJSON({ consignes, contenu, nom, schema, effort = "low" }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const reponse = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    store: false,
    reasoning: { effort },
    instructions: `${CONSIGNES_GENERALES}\n${consignes}`,
    input: [{ role: "user", content: [{ type: "input_text", text: contenu }] }],
    text: { format: { type: "json_schema", name: nom, strict: true, schema } },
  });
  if (!reponse.output_text) throw new Error("Réponse IA vide");
  return JSON.parse(reponse.output_text);
}

export async function demanderTexte({ consignes, contenu, effort = "low", images = [] }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const reponse = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    store: false,
    reasoning: { effort },
    instructions: `${CONSIGNES_GENERALES}\n${consignes}`,
    input: [{ role: "user", content: [{ type: "input_text", text: contenu }, ...images.map((url) => ({ type: "input_image", image_url: url }))] }],
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
