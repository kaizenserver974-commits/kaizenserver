// Envoi d'e-mails par Resend (API HTTP). Ne lève pas d'erreur si non configuré.
export const emailConfigure = () => Boolean(process.env.RESEND_API_KEY);

export async function envoyerEmail({ a, sujet, texte, html, repondreA, pieces = [] }) {
  if (!emailConfigure()) throw new Error("Resend non configuré");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.KAIZEN_EMAIL_FROM || "KaizenServer <onboarding@resend.dev>",
      to: [a],
      subject: sujet,
      text: texte,
      ...(html ? { html } : {}),
      ...(repondreA ? { reply_to: repondreA } : {}),
      ...(pieces.length ? { attachments: pieces.map((p) => ({ filename: p.nom, content: p.contenu })) } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status} : ${(await r.text()).slice(0, 200)}`);
}

// Notification « best effort » : journalise l'échec sans bloquer l'action.
export async function notifier(options) {
  if (!emailConfigure() || !options.a) return false;
  try { await envoyerEmail(options); return true; } catch (e) { console.error("Kaizen notification :", e?.message); return false; }
}

export const urlSite = (request) => String(process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).trim().replace(/\/+$/, "");
