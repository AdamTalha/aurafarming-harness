import type { SVGProps } from "react";

/** Aurafarming Harness geometric aura-prism emblem. */
export function T3Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="afMarkLeft" x1="110" y1="395" x2="275" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id="afMarkRight" x1="256" y1="95" x2="402" y2="395" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="45%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="afMarkRing" x1="88" y1="88" x2="424" y2="424" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="afMarkSpark" x1="256" y1="242" x2="256" y2="358" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle
        cx="256"
        cy="256"
        r="214"
        stroke="url(#afMarkRing)"
        strokeWidth="16"
        strokeDasharray="220 38 92 38"
        strokeLinecap="round"
      />
      <path d="M256 76L108 398H172L256 212L292 292L322 228L256 76Z" fill="url(#afMarkLeft)" />
      <path
        d="M256 76L404 398H340L256 212V76Z"
        fill="url(#afMarkRight)"
        fillOpacity="0.94"
      />
      <path d="M256 244L286 306L256 366L226 306L256 244Z" fill="url(#afMarkSpark)" />
      <rect x="188" y="302" width="136" height="10" rx="5" fill="#FFFFFF" fillOpacity="0.92" />
    </svg>
  );
}
