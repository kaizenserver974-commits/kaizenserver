"use client";
// Une seule vidéo, réutilisée pour toutes les introductions d'étape.
// Safari (iPad, iPhone) n'autorise le son automatique que sur un élément vidéo déjà
// « débloqué » par un toucher : on le débloque au premier toucher du client, une fois pour toutes.
let el = null;

export function videoPartagee() {
  if (typeof document === "undefined") return null;
  if (!el) {
    el = document.createElement("video");
    el.setAttribute("playsinline", "");
    el.playsInline = true;
    el.preload = "auto";
  }
  return el;
}

export function deverrouillerSon() {
  const v = videoPartagee();
  if (!v || v.dataset.debloquee === "1") return;
  const enCours = Boolean(v.currentSrc) && !v.paused;
  if (enCours) { v.dataset.debloquee = "1"; return; }
  if (!v.getAttribute("src")) v.src = "/sons/silence.mp4";
  v.muted = false;
  const p = v.play();
  if (p) p.then(() => { v.dataset.debloquee = "1"; if (v.getAttribute("src") === "/sons/silence.mp4") v.pause(); }).catch(() => {});
}

export function installerDeverrouillage() {
  if (typeof document === "undefined" || document.__kaizenSon) return;
  document.__kaizenSon = true;
  for (const evt of ["pointerdown", "touchend", "keydown"]) document.addEventListener(evt, deverrouillerSon, { capture: true, passive: true });
}
