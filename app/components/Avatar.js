"use client";

import { useId } from "react";

import { nettoyerAvatar, trouverPersonnage } from "../../lib/avatar.js";

export default function Avatar({ config, taille = 96, titre }) {
  const c = nettoyerAvatar(config);
  if (c.forme === "illustre") {
    const p = trouverPersonnage(c.perso);
    return (
      <img
        src={p.portrait}
        alt={titre || p.nom}
        width={taille}
        height={taille}
        className="avatar-svg avatar-illustre"
        style={{ "--anneau": p.couleur }}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <AvatarDessine c={c} taille={taille} titre={titre} />;
}

function AvatarDessine({ c, taille, titre }) {
  const id = `av${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={taille} height={taille} viewBox="0 0 120 120" role="img" aria-label={titre || "Avatar"} className="avatar-svg">
      <defs>
        <radialGradient id={`${id}f`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor={c.tenue} stopOpacity="0.55" />
          <stop offset="1" stopColor="#0b0b23" />
        </radialGradient>
        <clipPath id={`${id}c`}><circle cx="60" cy="60" r="58" /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${id}f)`} />
      <g clipPath={`url(#${id}c)`}>
        {/* Corps : sweat à capuche avec le K */}
        <path d="M14 122 C16 96 34 86 60 86 C86 86 104 96 106 122 Z" fill={c.tenue} />
        <path d="M40 90 C46 100 74 100 80 90" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="3" />
        <text x="60" y="113" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="16" fill="#fff" opacity="0.9">K</text>
        {c.forme === "robot" ? <TeteRobot c={c} /> : <TeteHumaine c={c} />}
      </g>
      <circle cx="60" cy="60" r="57" fill="none" stroke={c.tenue} strokeWidth="2" opacity="0.9" />
    </svg>
  );
}

function TeteRobot({ c }) {
  return (
    <g>
      <rect x="52" y="76" width="16" height="12" fill="#9aa4b2" />
      <line x1="60" y1="18" x2="60" y2="28" stroke="#cbd5e1" strokeWidth="3" />
      <circle cx="60" cy="16" r="4" fill={c.yeux} />
      <rect x="30" y="28" width="60" height="52" rx="20" fill="#e5e9f0" />
      <rect x="36" y="40" width="48" height="24" rx="12" fill="#0b1020" />
      <ellipse cx="49" cy="52" rx="6" ry="7" fill={c.yeux} />
      <ellipse cx="71" cy="52" rx="6" ry="7" fill={c.yeux} />
      <path d="M52 70 Q60 75 68 70" stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="24" y="46" width="7" height="16" rx="3" fill={c.tenue} />
      <rect x="89" y="46" width="7" height="16" rx="3" fill={c.tenue} />
    </g>
  );
}

function TeteHumaine({ c }) {
  const h = c.cheveux;
  const derriere = {
    long: <path d="M30 50 C28 80 32 96 40 100 L80 100 C88 96 92 80 90 50 Z" fill={h} />,
    queue: <path d="M86 40 C104 44 106 70 96 86 C94 72 92 60 84 52 Z" fill={h} />,
    chignon: <circle cx="60" cy="18" r="11" fill={h} />,
  }[c.coiffure];
  const devant = {
    pics: <path d="M32 50 L30 30 L40 36 L42 18 L52 30 L58 12 L66 28 L76 16 L78 32 L90 28 L88 50 C80 38 42 38 32 50 Z" fill={h} />,
    court: <path d="M32 52 C30 30 44 20 60 20 C78 20 90 30 88 52 C82 38 70 34 60 34 C48 34 38 40 32 52 Z" fill={h} />,
    long: <path d="M30 56 C28 30 44 20 60 20 C78 20 92 30 90 56 C84 40 74 32 60 32 C46 32 36 40 30 56 Z" fill={h} />,
    queue: <path d="M32 50 C30 28 46 20 60 20 C76 20 90 28 88 50 C80 36 66 30 52 34 C44 36 36 42 32 50 Z" fill={h} />,
    boucles: (
      <g fill={h}>
        {[[36, 38], [46, 28], [60, 24], [74, 28], [84, 38], [32, 50], [88, 50]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="10" />)}
      </g>
    ),
    chignon: <path d="M32 50 C30 30 44 22 60 22 C76 22 90 30 88 50 C82 38 72 32 60 32 C48 32 38 38 32 50 Z" fill={h} />,
    rase: <path d="M34 44 C36 30 48 24 60 24 C72 24 84 30 86 44 C78 36 42 36 34 44 Z" fill={h} opacity="0.55" />,
  }[c.coiffure];

  return (
    <g>
      {derriere}
      <rect x="52" y="74" width="16" height="14" rx="4" fill={c.peau} />
      <ellipse cx="33" cy="58" rx="5" ry="7" fill={c.peau} />
      <ellipse cx="87" cy="58" rx="5" ry="7" fill={c.peau} />
      <ellipse cx="60" cy="54" rx="27" ry="28" fill={c.peau} />
      {/* Yeux style manga */}
      {[48, 72].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="57" rx="6.5" ry="8" fill="#fff" />
          <ellipse cx={x} cy="58" rx="4.5" ry="6" fill={c.yeux} />
          <circle cx={x} cy="59" r="2.2" fill="#0b0b23" />
          <circle cx={x + 1.8} cy="55" r="1.6" fill="#fff" />
        </g>
      ))}
      <path d="M42 46 Q48 43 54 46 M66 46 Q72 43 78 46" stroke="#2b1d14" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M53 70 Q60 75 67 70" stroke="#7a3b2e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="42" cy="66" rx="4" ry="2" fill="#ff7a9a" opacity="0.35" />
      <ellipse cx="78" cy="66" rx="4" ry="2" fill="#ff7a9a" opacity="0.35" />
      {devant}
      {c.accessoire === "lunettes" && (
        <g fill="none" stroke="#111827" strokeWidth="2.4">
          <circle cx="48" cy="57" r="9" /><circle cx="72" cy="57" r="9" /><path d="M57 57 H63" />
        </g>
      )}
      {c.accessoire === "visiere" && (
        <rect x="36" y="50" width="48" height="13" rx="6.5" fill={c.tenue} opacity="0.75" stroke="#fff" strokeOpacity="0.6" />
      )}
      {c.accessoire === "casque" && (
        <g>
          <path d="M30 56 C28 26 92 26 90 56" fill="none" stroke="#111827" strokeWidth="5" />
          <rect x="24" y="50" width="11" height="18" rx="5" fill={c.tenue} stroke="#111827" strokeWidth="2" />
          <rect x="85" y="50" width="11" height="18" rx="5" fill={c.tenue} stroke="#111827" strokeWidth="2" />
        </g>
      )}
    </g>
  );
}
