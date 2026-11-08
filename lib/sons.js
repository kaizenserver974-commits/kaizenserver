"use client";
// Ambiances sonores des mondes, synthétisées dans le navigateur (Web Audio),
// sans fichier à charger. 3 propositions (A, B, C) par personnage ; CHOIX
// indique celle utilisée dans le jeu. Un fichier audio peut remplacer la
// synthèse : champ « son » du personnage.

let ctx = null, maitre = null, arrets = [], minuterie = null, audioFichier = null;

function contexte() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    maitre = ctx.createGain(); maitre.gain.value = 0; maitre.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);
const alea = (l) => l[Math.floor(Math.random() * l.length)];

// ---------- Briques sonores ----------
function note(n, t, duree, { type = "sine", vol = 0.1, attaque = 0.02, filtre, glisse } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq(n), t);
  if (glisse) o.frequency.exponentialRampToValueAtTime(freq(n + glisse), t + duree);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attaque); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  if (filtre) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtre; o.connect(f); f.connect(g); } else o.connect(g);
  g.connect(maitre); o.start(t); o.stop(t + duree + 0.05);
}
// Nappe : accord qui monte et redescend lentement
const nappe = (notes, t, duree, { type = "sine", vol = 0.035, filtre = 1200 } = {}) =>
  notes.forEach((n, k) => note(n, t + k * 0.08, duree, { type, vol, attaque: duree * 0.4, filtre }));
// Cloche douce
const cloche = (n, t, vol = 0.04) => { note(n, t, 2.5, { vol, attaque: 0.005 }); note(n + 12, t, 1.2, { vol: vol * 0.3, attaque: 0.005 }); };
// Goutte d'eau
const goutte = (t, vol = 0.05) => note(alea([84, 86, 88, 91]), t, 0.18, { vol, attaque: 0.003, glisse: -10 });
// Chant d'oiseau
const oiseau = (t, vol = 0.03) => { const b = alea([88, 91, 93]); for (let k = 0; k < 3; k++) note(b, t + k * 0.09, 0.08, { vol, attaque: 0.004, glisse: alea([5, 7, -4]) }); };
// Grillon
const grillon = (t, vol = 0.015) => { for (let k = 0; k < 4; k++) note(100, t + k * 0.045, 0.03, { type: "square", vol, attaque: 0.002, filtre: 6000 }); };
// Pincement (koto / guitare douce)
const pince = (n, t, vol = 0.05) => note(n, t, 1.4, { type: "triangle", vol, attaque: 0.004, filtre: 2500 });
// Petit battement très doux
const kickDoux = (t, v = 0.18) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(maitre); o.start(t); o.stop(t + 0.4); };

function tamponBruit(secondes = 2) {
  const n = ctx.sampleRate * secondes, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function souffle(t, duree, { vol = 0.04, de = 300, a = 2500 } = {}) { // passage, rafale
  const s = ctx.createBufferSource(); s.buffer = tamponBruit(duree + 0.1);
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(de, t); f.frequency.exponentialRampToValueAtTime(a, t + duree);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + duree / 2); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  s.connect(f); f.connect(g); g.connect(maitre); s.start(t); s.stop(t + duree + 0.1);
}
const craquement = (t, vol = 0.05) => { const s = ctx.createBufferSource(); s.buffer = tamponBruit(0.02); const g = ctx.createGain(); g.gain.value = vol; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2000; s.connect(f); f.connect(g); g.connect(maitre); s.start(t); };

// Fonds continus (bruit filtré modulé, ou bourdon)
const FONDS = {
  pluie: { type: "highpass", f: 1800, vol: 0.05 },
  vent: { type: "lowpass", f: 600, vol: 0.06, lfo: 0.07, prof: 400 },
  vagues: { type: "lowpass", f: 700, vol: 0.09, lfo: 0.11, prof: 600, ampli: 0.6 },
  cascade: { type: "lowpass", f: 1400, vol: 0.06 },
  ville: { type: "lowpass", f: 220, vol: 0.05, lfo: 0.03, prof: 60 },
  foule: { type: "bandpass", f: 500, vol: 0.05, lfo: 0.2, prof: 150 },
  electrique: { bourdon: [33, 45], vol: 0.025 },
  cosmos: { bourdon: [26, 38, 45], vol: 0.03, ampli: 0.25 },
  grave: { bourdon: [31, 43], vol: 0.035, ampli: 0.15 },
};
function fond(nom) {
  const c = FONDS[nom]; const g = ctx.createGain(); g.gain.value = c.vol; g.connect(maitre);
  const sources = [];
  if (c.bourdon) {
    c.bourdon.forEach((n) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq(n); o.connect(g); o.start(); sources.push(o); });
  } else {
    const s = ctx.createBufferSource(); s.buffer = tamponBruit(3); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = c.type; f.frequency.value = c.f;
    s.connect(f); f.connect(g); s.start(); sources.push(s);
    if (c.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = c.lfo; lg.gain.value = c.prof; l.connect(lg); lg.connect(f.frequency); l.start(); sources.push(l); }
  }
  if (c.ampli) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = c.ampli; lg.gain.value = c.vol * 0.6; l.connect(lg); lg.connect(g.gain); l.start(); sources.push(l); }
  return () => sources.forEach((s) => { try { s.stop(); } catch { /* déjà arrêté */ } });
}

// ---------- Les ambiances : chaque « pas » dure 1/4 de temps ; 16 pas = 1 mesure ----------
const M = (i) => Math.floor(i / 16); // numéro de mesure
const debut = (i, n = 16) => i % n === 0;

export const AMBIANCES = {
  kai: {
    A: { nom: "Pluie néon", desc: "Pluie fine sur la ville, nappe synthé sombre", bpm: 60, fonds: ["pluie", "ville"], pas: (i, t) => {
      if (debut(i, 32)) nappe([[45, 52, 57, 60], [41, 48, 53, 57]][M(i) / 2 % 2 | 0], t, 9, { type: "sawtooth", vol: 0.012, filtre: 700 });
      if (Math.random() < 0.02) cloche(alea([69, 72, 76]), t, 0.02);
    } },
    B: { nom: "Nuit cyber", desc: "Nappe planante et écho d'arpège lointain", bpm: 70, fonds: ["ville"], pas: (i, t) => {
      if (debut(i, 32)) nappe([57, 60, 64, 67], t, 10, { type: "triangle", vol: 0.02, filtre: 1500 });
      if (i % 2 === 0) note([69, 72, 76, 79, 76, 72][(i / 2) % 6], t, 0.6, { type: "sine", vol: 0.012 });
    } },
    C: { nom: "Toits de la ville", desc: "Vent en hauteur, bourdon grave, véhicules qui passent", bpm: 60, fonds: ["vent", "grave"], pas: (i, t) => {
      if (Math.random() < 0.012) souffle(t, 3, { vol: 0.05, de: 200, a: 1800 });
      if (debut(i, 64)) nappe([45, 52, 60], t, 12, { vol: 0.02, filtre: 900 });
    } },
  },
  mia: {
    A: { nom: "Vagues calmes", desc: "Ressac du lagon et carillons espacés", bpm: 60, fonds: ["vagues"], pas: (i, t) => {
      if (Math.random() < 0.05) cloche(alea([72, 74, 76, 79, 81]), t, 0.03);
    } },
    B: { nom: "Lagon mystique", desc: "Gouttes d'eau et nappe douce", bpm: 60, fonds: ["vagues"], pas: (i, t) => {
      if (Math.random() < 0.12) goutte(t, 0.035);
      if (debut(i, 32)) nappe([[60, 64, 67, 71], [57, 60, 64, 69]][M(i) / 2 % 2 | 0], t, 10, { vol: 0.02 });
    } },
    C: { nom: "Coucher tropical", desc: "Vagues, oiseaux, accord chaleureux", bpm: 60, fonds: ["vagues"], pas: (i, t) => {
      if (Math.random() < 0.025) oiseau(t, 0.025);
      if (debut(i, 32)) nappe([[60, 64, 67, 72], [65, 69, 72, 76]][M(i) / 2 % 2 | 0], t, 10, { type: "triangle", vol: 0.018, filtre: 1800 });
    } },
  },
  leo: {
    A: { nom: "Énergie du portail", desc: "Bourdon qui pulse et éclats lumineux", bpm: 60, fonds: ["cosmos"], pas: (i, t) => {
      if (Math.random() < 0.06) note(alea([84, 86, 91, 93, 96]), t, 1.5, { type: "triangle", vol: 0.015 });
    } },
    B: { nom: "Cosmos", desc: "Nappe très lente et étoiles", bpm: 55, fonds: ["grave"], pas: (i, t) => {
      if (debut(i, 48)) nappe([50, 57, 62, 69], t, 14, { vol: 0.025 });
      if (Math.random() < 0.04) cloche(alea([86, 88, 93]), t, 0.015);
    } },
    C: { nom: "Cascade", desc: "Chute d'eau au loin et bourdon grave", bpm: 60, fonds: ["cascade", "grave"], pas: (i, t) => {
      if (Math.random() < 0.03) goutte(t, 0.02);
    } },
  },
  malik: {
    A: { nom: "Studio lo-fi", desc: "Craquement de vinyle, accords doux, battement léger", bpm: 72, fonds: [], pas: (i, t) => {
      if (Math.random() < 0.25) craquement(t, 0.03);
      if (debut(i)) nappe([[60, 63, 67, 70], [56, 60, 63, 67], [58, 62, 65, 68], [55, 58, 62, 65]][M(i) % 4], t, 3.5, { type: "triangle", vol: 0.022, filtre: 1300 });
      if (i % 16 === 0 || i % 16 === 10) kickDoux(t, 0.12);
    } },
    B: { nom: "Ondes sonores", desc: "Nappes qui ondulent comme des ondes", bpm: 60, fonds: ["grave"], pas: (i, t) => {
      if (debut(i, 16)) note(alea([57, 60, 64]), t, 6, { type: "sine", vol: 0.03, attaque: 2, glisse: alea([2, -2, 5]) });
    } },
    C: { nom: "Nuit au studio", desc: "Accords de piano électrique, sans rythme", bpm: 66, fonds: [], pas: (i, t) => {
      if (debut(i)) [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]][M(i) % 4].forEach((n, k) => note(n, t + k * 0.05, 3.5, { type: "triangle", vol: 0.025, attaque: 0.01, filtre: 1600 }));
      if (Math.random() < 0.15) craquement(t, 0.015);
    } },
  },
  teo: {
    A: { nom: "Soir au skatepark", desc: "Vent du soir et rythme lointain", bpm: 85, fonds: ["vent"], pas: (i, t) => {
      if (i % 8 === 0) kickDoux(t, 0.08);
      if (debut(i, 32)) nappe([52, 59, 64], t, 9, { type: "triangle", vol: 0.018, filtre: 1000 });
    } },
    B: { nom: "Ville au crépuscule", desc: "Rumeur de la ville et nappe", bpm: 60, fonds: ["ville", "vent"], pas: (i, t) => {
      if (debut(i, 32)) nappe([[52, 56, 59, 64], [50, 54, 57, 62]][M(i) / 2 % 2 | 0], t, 10, { vol: 0.02 });
      if (Math.random() < 0.01) souffle(t, 2.5, { vol: 0.03 });
    } },
    C: { nom: "Chill urbain", desc: "Accords lo-fi et petits charleys", bpm: 80, fonds: [], pas: (i, t) => {
      if (debut(i)) nappe([[52, 55, 59, 62], [48, 52, 55, 59]][M(i) % 2], t, 3.2, { type: "triangle", vol: 0.022, filtre: 1400 });
      if (i % 4 === 2 && Math.random() < 0.7) craquement(t, 0.04);
    } },
  },
  axel: {
    A: { nom: "Laboratoire calme", desc: "Ronronnement électrique et bips rares", bpm: 60, fonds: ["electrique"], pas: (i, t) => {
      if (Math.random() < 0.05) note(alea([84, 88, 91]), t, 0.12, { type: "square", vol: 0.012, filtre: 3000 });
    } },
    B: { nom: "Machines", desc: "Petits cliquetis réguliers et bourdon", bpm: 90, fonds: ["electrique"], pas: (i, t) => {
      if (i % 2 === 0) craquement(t, 0.025);
      if (debut(i, 32)) nappe([45, 52, 57], t, 9, { vol: 0.018 });
    } },
    C: { nom: "Invention", desc: "Arpège scintillant très doux", bpm: 75, fonds: ["electrique"], pas: (i, t) => {
      note([72, 76, 79, 84, 79, 76][i % 6], t, 0.4, { type: "sine", vol: 0.012 });
    } },
  },
  jade: {
    A: { nom: "Jardin au coucher du soleil", desc: "Oiseaux et nappe chaude", bpm: 60, fonds: ["vent"], pas: (i, t) => {
      if (Math.random() < 0.04) oiseau(t, 0.025);
      if (debut(i, 32)) nappe([[60, 64, 67, 71], [57, 60, 64, 67]][M(i) / 2 % 2 | 0], t, 10, { type: "triangle", vol: 0.018, filtre: 1500 });
    } },
    B: { nom: "Brise", desc: "Vent léger et carillons à vent", bpm: 60, fonds: ["vent"], pas: (i, t) => {
      if (Math.random() < 0.08) cloche(alea([79, 81, 84, 86, 88]), t, 0.02);
    } },
    C: { nom: "Lo-fi terrasse", desc: "Accords lo-fi doux, sans percussion", bpm: 70, fonds: [], pas: (i, t) => {
      if (debut(i)) nappe([[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]][M(i) % 4], t, 3.4, { type: "triangle", vol: 0.024, filtre: 1500 });
      if (Math.random() < 0.12) craquement(t, 0.015);
    } },
  },
  nala: {
    A: { nom: "Avant le show", desc: "Murmure du public et nappe grave", bpm: 60, fonds: ["foule"], pas: (i, t) => {
      if (debut(i, 32)) nappe([45, 52, 57, 60], t, 10, { type: "sawtooth", vol: 0.01, filtre: 600 });
    } },
    B: { nom: "Basse douce", desc: "Pulsation grave lente et nappe", bpm: 90, fonds: [], pas: (i, t) => {
      if (i % 8 === 0) note([33, 33, 31, 36][M(i) % 4], t, 1.2, { vol: 0.08, attaque: 0.05 });
      if (debut(i, 32)) nappe([57, 60, 64], t, 9, { vol: 0.018 });
    } },
    C: { nom: "Lumières", desc: "Nappe scintillante et battement étouffé", bpm: 110, fonds: [], pas: (i, t) => {
      if (i % 4 === 0) kickDoux(t, 0.07);
      if (debut(i, 32)) nappe([57, 64, 69, 72], t, 8, { vol: 0.02 });
      if (Math.random() < 0.05) note(alea([81, 84, 88]), t, 0.8, { type: "triangle", vol: 0.012 });
    } },
  },
  lou: {
    A: { nom: "Ciel étoilé", desc: "Nappe céleste et étoiles", bpm: 55, fonds: [], pas: (i, t) => {
      if (debut(i, 32)) nappe([60, 67, 72, 76], t, 12, { vol: 0.025 });
      if (Math.random() < 0.06) note(alea([88, 91, 93, 96]), t, 1.4, { vol: 0.015 });
    } },
    B: { nom: "Silence de l'espace", desc: "Bourdon très profond et cloche rare", bpm: 50, fonds: ["cosmos"], pas: (i, t) => {
      if (Math.random() < 0.012) cloche(alea([69, 76, 81]), t, 0.03);
    } },
    C: { nom: "Nuit en montagne", desc: "Vent, grillons et nappe", bpm: 60, fonds: ["vent"], pas: (i, t) => {
      if (Math.random() < 0.1) grillon(t);
      if (debut(i, 48)) nappe([55, 62, 67], t, 14, { vol: 0.02 });
    } },
  },
  yuna: {
    A: { nom: "Soir au village", desc: "Grillons et flûte pentatonique", bpm: 60, fonds: [], pas: (i, t) => {
      if (Math.random() < 0.1) grillon(t);
      const mel = [69, -1, 72, -1, 74, -1, 72, -1, 69, -1, -1, -1, 67, -1, 64, -1];
      if (M(i) % 2 === 0 && mel[i % 16] > 0) note(mel[i % 16], t, 1.2, { type: "sine", vol: 0.025, attaque: 0.15 });
    } },
    B: { nom: "Vent et clochettes", desc: "Vent et carillons du village", bpm: 60, fonds: ["vent"], pas: (i, t) => {
      if (Math.random() < 0.07) cloche(alea([76, 79, 81, 84, 86]), t, 0.022);
    } },
    C: { nom: "Lanternes", desc: "Notes pincées type koto et nappe", bpm: 66, fonds: [], pas: (i, t) => {
      if (i % 4 === 0 && Math.random() < 0.7) pince(alea([62, 64, 67, 69, 71, 74]), t, 0.04);
      if (debut(i, 32)) nappe([50, 57, 62], t, 10, { vol: 0.018 });
    } },
  },
};

// Ambiance utilisée dans le jeu pour chaque personnage (choisie par Server).
export const CHOIX = { kai: "A", mia: "A", leo: "A", malik: "A", teo: "A", axel: "A", jade: "A", nala: "A", lou: "A", yuna: "A" };

export const sonDisponible = () => typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);

export function arreterSon(fondu = 0.5) {
  if (minuterie) { clearInterval(minuterie); minuterie = null; }
  if (audioFichier) { audioFichier.pause(); audioFichier = null; }
  if (ctx && maitre) { const t = ctx.currentTime; maitre.gain.cancelScheduledValues(t); maitre.gain.setTargetAtTime(0, t, fondu / 3); }
  const anciens = arrets; arrets = [];
  setTimeout(() => anciens.forEach((a) => a()), fondu * 1000 + 100);
}

// Lance une ambiance (à appeler suite à un geste de l'utilisateur).
export function jouerSon(id, fichier, variante) {
  arreterSon(0.3);
  if (fichier) { audioFichier = new Audio(fichier); audioFichier.loop = true; audioFichier.volume = 0.45; audioFichier.play().catch(() => {}); return; }
  const amb = AMBIANCES[id]?.[variante || CHOIX[id] || "A"]; if (!amb || !contexte()) return;
  setTimeout(() => {
    const t0 = ctx.currentTime;
    maitre.gain.cancelScheduledValues(t0); maitre.gain.setValueAtTime(0, t0); maitre.gain.linearRampToValueAtTime(1, t0 + 2);
    arrets = amb.fonds.map(fond);
    const pasDuree = 60 / amb.bpm / 4;
    let i = 0, prochain = ctx.currentTime + 0.1;
    const planifier = () => { while (prochain < ctx.currentTime + 0.3) { amb.pas(i++, prochain); prochain += pasDuree; } };
    planifier(); minuterie = setInterval(planifier, 90);
  }, 350);
}

// Recale la musique au début de l'extrait (appelé quand la vidéo du personnage reboucle).
export function redemarrerSon() {
  if (!audioFichier) return;
  // Très court fondu pour éviter un « clic » au moment du retour au début de l'extrait.
  const a = audioFichier, vol = 0.45;
  a.volume = 0.15;
  try { a.currentTime = 0; if (a.paused) a.play().catch(() => {}); } catch { /* lecture impossible */ }
  let k = 0; const f = setInterval(() => { k++; if (audioFichier !== a) return clearInterval(f); a.volume = Math.min(vol, 0.15 + k * 0.06); if (a.volume >= vol) clearInterval(f); }, 25);
}
