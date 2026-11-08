"use client";
// Ambiances sonores des mondes, synthétisées dans le navigateur (Web Audio),
// sans fichier à charger. Une ambiance par personnage ; volume doux.
// Un fichier audio peut remplacer la synthèse : champ « son » du personnage.

let ctx = null, maitre = null, enCours = null, minuterie = null, audioFichier = null;

function contexte() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    maitre = ctx.createGain(); maitre.gain.value = 0.0; maitre.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const freq = (n) => 440 * Math.pow(2, (n - 69) / 12); // note MIDI -> Hz

function note(n, t, duree, { type = "sine", vol = 0.2, attaque = 0.01, sortie = maitre, filtre } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq(n);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attaque); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  if (filtre) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtre; o.connect(f); f.connect(g); } else o.connect(g);
  g.connect(sortie); o.start(t); o.stop(t + duree + 0.05);
}

function bruit(t, duree, { vol = 0.2, passeHaut = 6000, passeBas } = {}) {
  const n = Math.floor(ctx.sampleRate * duree), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = b; f.type = passeBas ? "lowpass" : "highpass"; f.frequency.value = passeBas || passeHaut; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(maitre); s.start(t);
}

const kick = (t, v = 0.5) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g); g.connect(maitre); o.start(t); o.stop(t + 0.3); };
const charley = (t, v = 0.07) => bruit(t, 0.05, { vol: v, passeHaut: 8000 });
const clap = (t, v = 0.15) => bruit(t, 0.12, { vol: v, passeHaut: 1500 });

// Fond continu (vent, vagues, bourdonnement) : bruit filtré modulé
function nappeBruit({ vol = 0.05, frequence = 500, lfo = 0.1, profondeur = 300 }) {
  const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = frequence;
  const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfo; lg.gain.value = profondeur; l.connect(lg); lg.connect(f.frequency);
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(maitre); s.start(); l.start();
  return () => { try { s.stop(); l.stop(); } catch { /* déjà arrêté */ } };
}

// Chaque ambiance : tempo (pas/s) + fonction appelée à chaque pas (16 pas par mesure)
const AMBIANCES = {
  // Ville néon : basse pulsée + arpège synthé mineur
  kai: { bpm: 110, fond: { vol: 0.025, frequence: 300 }, pas: (i, t) => {
    if (i % 4 === 0) note([45, 45, 41, 43][Math.floor(i / 16) % 4], t, 0.4, { type: "sawtooth", vol: 0.08, filtre: 500 });
    note([69, 72, 76, 72][i % 4] + (Math.floor(i / 16) % 2 ? -2 : 0), t, 0.18, { type: "square", vol: 0.03, filtre: 2500 });
    if (i % 8 === 4) charley(t, 0.04);
  } },
  // Lagon : vagues + carillon pentatonique
  mia: { bpm: 60, fond: { vol: 0.07, frequence: 700, lfo: 0.12, profondeur: 500 }, pas: (i, t) => {
    if (Math.random() < 0.35) note([72, 74, 76, 79, 81, 84][Math.floor(Math.random() * 6)], t, 1.6, { vol: 0.06, attaque: 0.02 });
  } },
  // Portail : bourdon grave + scintillements aigus
  leo: { bpm: 70, fond: { vol: 0.03, frequence: 200, lfo: 0.05, profondeur: 120 }, pas: (i, t) => {
    if (i % 16 === 0) note(38, t, 4, { type: "sawtooth", vol: 0.05, attaque: 1, filtre: 300 });
    if (Math.random() < 0.3) note(84 + [0, 3, 7, 10][Math.floor(Math.random() * 4)], t, 0.8, { type: "triangle", vol: 0.03 });
  } },
  // Studio : beat hip-hop + basse
  malik: { bpm: 90, pas: (i, t) => {
    const m = i % 16;
    if (m === 0 || m === 10) kick(t, 0.45); if (m === 4 || m === 12) clap(t, 0.14); if (m % 2 === 0) charley(t, 0.05);
    if (m === 0 || m === 7) note([36, 39, 34, 41][Math.floor(i / 16) % 4], t, 0.5, { type: "sine", vol: 0.18 });
    if (m === 2 || m === 8) note([63, 67, 70][Math.floor(i / 4) % 3], t, 0.4, { type: "triangle", vol: 0.03 });
  } },
  // Skatepark : rock-électro énergique
  teo: { bpm: 135, pas: (i, t) => {
    const m = i % 16;
    if (m % 4 === 0) kick(t, 0.4); if (m === 4 || m === 12) clap(t, 0.12); charley(t, 0.035);
    if (m % 2 === 0) note([40, 40, 43, 45][Math.floor(i / 8) % 4], t, 0.2, { type: "sawtooth", vol: 0.06, filtre: 900 });
  } },
  // Laboratoire : bips et bourdonnement électrique
  axel: { bpm: 100, fond: { vol: 0.02, frequence: 150 }, pas: (i, t) => {
    if (Math.random() < 0.45) note(76 + Math.floor(Math.random() * 18), t, 0.08, { type: "square", vol: 0.03 });
    if (i % 8 === 0) note(52, t, 0.3, { type: "triangle", vol: 0.05 });
  } },
  // Terrasse au coucher du soleil : accords lo-fi doux
  jade: { bpm: 75, fond: { vol: 0.015, frequence: 3000 }, pas: (i, t) => {
    const acc = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]][Math.floor(i / 16) % 4];
    if (i % 16 === 0) acc.forEach((n) => note(n, t, 3, { type: "triangle", vol: 0.03, attaque: 0.15, filtre: 1500 }));
    if (i % 8 === 0) kick(t, 0.2); if (i % 8 === 4) charley(t, 0.04);
  } },
  // Scène de danse : house 4/4
  nala: { bpm: 124, pas: (i, t) => {
    const m = i % 16;
    if (m % 4 === 0) kick(t, 0.5); if (m % 4 === 2) charley(t, 0.07); if (m === 4 || m === 12) clap(t, 0.13);
    if (m % 4 === 2) note([45, 48, 43, 47][Math.floor(i / 16) % 4], t, 0.2, { type: "sawtooth", vol: 0.07, filtre: 700 });
    if (m === 0) [69, 72, 76].forEach((n) => note(n + [0, -2, -4, -1][Math.floor(i / 16) % 4], t, 0.3, { type: "square", vol: 0.015, filtre: 2000 }));
  } },
  // Observatoire : nappe céleste + étoiles
  lou: { bpm: 55, fond: { vol: 0.02, frequence: 400, lfo: 0.03, profondeur: 200 }, pas: (i, t) => {
    if (i % 16 === 0) [60, 67, 74].forEach((n) => note(n, t, 5, { type: "sine", vol: 0.035, attaque: 1.5 }));
    if (Math.random() < 0.25) note(88 + [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)], t, 1.2, { vol: 0.025 });
  } },
  // Village : petite mélodie pentatonique + vent
  yuna: { bpm: 85, fond: { vol: 0.03, frequence: 900, lfo: 0.08, profondeur: 400 }, pas: (i, t) => {
    const mel = [69, 72, 74, 76, 74, 72, 69, -1, 67, 69, 72, 69, 67, 64, -1, -1];
    const n = mel[i % 16]; if (n > 0) note(n, t, 0.5, { type: "triangle", vol: 0.04 });
    if (i % 8 === 0) note(45 + (Math.floor(i / 16) % 2 ? -5 : 0), t, 1.5, { vol: 0.05 });
  } },
};

export const sonDisponible = () => typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);

export function arreterSon(fondu = 0.4) {
  if (minuterie) { clearInterval(minuterie); minuterie = null; }
  if (audioFichier) { audioFichier.pause(); audioFichier = null; }
  if (ctx && maitre) { const t = ctx.currentTime; maitre.gain.cancelScheduledValues(t); maitre.gain.setTargetAtTime(0, t, fondu / 3); }
  const arret = enCours; enCours = null;
  if (arret) setTimeout(arret, fondu * 1000 + 100);
}

// Lance l'ambiance d'un personnage (appelée suite à un geste de l'utilisateur).
export function jouerSon(id, fichier) {
  arreterSon(0.3);
  if (fichier) {
    audioFichier = new Audio(fichier); audioFichier.loop = true; audioFichier.volume = 0.5;
    audioFichier.play().catch(() => {});
    return;
  }
  const amb = AMBIANCES[id]; if (!amb || !contexte()) return;
  const t0 = ctx.currentTime;
  maitre.gain.cancelScheduledValues(t0); maitre.gain.setValueAtTime(0, t0); maitre.gain.linearRampToValueAtTime(0.9, t0 + 1.2);
  const stopFond = amb.fond ? nappeBruit(amb.fond) : null;
  const pasDuree = 60 / amb.bpm / 4;
  let i = 0, prochain = ctx.currentTime + 0.1;
  const planifier = () => { while (prochain < ctx.currentTime + 0.25) { amb.pas(i++, prochain); prochain += pasDuree; } };
  planifier(); minuterie = setInterval(planifier, 80);
  enCours = () => { stopFond?.(); };
}
