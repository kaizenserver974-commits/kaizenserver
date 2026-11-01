"use client";

import { useId } from "react";

// Hexagone néon « K » de KaizenServer.
export default function Logo({ className = "logo", titre = "KaizenServer" }) {
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label={titre}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2ad4ff" />
          <stop offset="0.5" stopColor="#7b5cff" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="#0b0c2a" stroke={`url(#${id}a)`} strokeWidth="5" strokeLinejoin="round" />
      <polygon points="50,16 80,33 80,67 50,84 20,67 20,33" fill="none" stroke={`url(#${id}a)`} strokeWidth="1.5" opacity="0.5" />
      <path d="M38 30 V70 M38 52 L62 30 M44 47 L64 70" stroke={`url(#${id}a)`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
