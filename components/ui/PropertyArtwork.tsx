'use client';

import React from 'react';
import { PropertyType } from '@/lib/types';

interface PropertyArtworkProps {
  propertyId?: string;
  propertyName: string;
  propertyType: PropertyType;
  city?: string;
  className?: string;
  heightClass?: string;
}

const PALETTES: Array<{
  skyTop: string;
  skyBottom: string;
  facadePrimary: string;
  facadeSecondary: string;
  windowGlow: string;
  accentLine: string;
}> = [
  {
    skyTop: '#0F2E2A',
    skyBottom: '#1B4B44',
    facadePrimary: '#E8ECEA',
    facadeSecondary: '#C8D3CE',
    windowGlow: '#F3DFC1',
    accentLine: '#C99B58',
  },
  {
    skyTop: '#16262E',
    skyBottom: '#284552',
    facadePrimary: '#D9CFC3',
    facadeSecondary: '#B8AA99',
    windowGlow: '#FCE8C8',
    accentLine: '#D6AE72',
  },
  {
    skyTop: '#1A2421',
    skyBottom: '#2D423C',
    facadePrimary: '#CFD8D5',
    facadeSecondary: '#9FB0AA',
    windowGlow: '#E9F5F1',
    accentLine: '#5BC4B4',
  },
  {
    skyTop: '#1F242D',
    skyBottom: '#343F4E',
    facadePrimary: '#EAE6DF',
    facadeSecondary: '#C7C0B6',
    windowGlow: '#F8E3B4',
    accentLine: '#C99B58',
  },
];

export function PropertyArtwork({
  propertyId = 'prop-1',
  propertyName,
  propertyType,
  city,
  className = '',
  heightClass = 'h-44',
}: PropertyArtworkProps) {
  const hash = propertyId
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pal = PALETTES[hash % PALETTES.length];
  const gradId = `est-sky-${propertyId.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#12221F] select-none ${heightClass} ${className}`}
      role="img"
      aria-label={`Architectural elevation of ${propertyName} (${propertyType})`}
    >
      <svg
        viewBox="0 0 600 320"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full object-cover"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.skyTop} />
            <stop offset="100%" stopColor={pal.skyBottom} />
          </linearGradient>
        </defs>

        {/* Architectural Dusk Sky */}
        <rect width="600" height="320" fill={`url(#${gradId})`} />

        {/* Subtle Architectural Grid Lines */}
        <line x1="0" y1="275" x2="600" y2="275" stroke={pal.accentLine} strokeOpacity="0.4" strokeWidth="1.5" />
        <line x1="80" y1="0" x2="80" y2="320" stroke="#FFFFFF" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="520" y1="0" x2="520" y2="320" stroke="#FFFFFF" strokeOpacity="0.04" strokeWidth="1" />

        {/* Distant Skyline Silhouette */}
        <rect x="40" y="130" width="75" height="145" fill="#0B1615" fillOpacity="0.45" />
        <rect x="485" y="110" width="85" height="165" fill="#0B1615" fillOpacity="0.45" />

        {propertyType === 'Townhouse Portfolio' || propertyType === 'Single-Family Rental' ? (
          /* Row of Architectural Townhomes */
          <g>
            {[115, 235, 355].map((x, idx) => (
              <g key={x}>
                <rect
                  x={x}
                  y={95 + (idx % 2) * 10}
                  width="112"
                  height={180 - (idx % 2) * 10}
                  fill={idx === 1 ? pal.facadePrimary : pal.facadeSecondary}
                />
                <polygon
                  points={`${x},${95 + (idx % 2) * 10} ${x + 56},${68 + (idx % 2) * 10} ${x + 112},${95 + (idx % 2) * 10}`}
                  fill={pal.accentLine}
                  fillOpacity="0.85"
                />
                {[0, 1, 2].map((row) =>
                  [0, 1].map((col) => (
                    <rect
                      key={`${row}-${col}`}
                      x={x + 18 + col * 44}
                      y={112 + row * 44}
                      width="30"
                      height="28"
                      fill="#132522"
                    />
                  ))
                )}
                <rect x={x + 21} y={115} width="24" height="22" fill={pal.windowGlow} fillOpacity="0.8" />
                <rect x={x + 65} y={159} width="24" height="22" fill={pal.windowGlow} fillOpacity="0.7" />
              </g>
            ))}
          </g>
        ) : propertyType === 'Commercial Building' ? (
          /* Modern Curtain-Wall Commercial Tower */
          <g>
            <rect x="155" y="42" width="290" height="233" fill={pal.facadePrimary} />
            <rect x="165" y="52" width="270" height="223" fill="#102421" />
            {[0, 1, 2, 3, 4].map((floor) =>
              [0, 1, 2, 3, 4, 5].map((bay) => (
                <rect
                  key={`${floor}-${bay}`}
                  x={173 + bay * 43}
                  y={60 + floor * 38}
                  width="36"
                  height="30"
                  fill={(floor + bay + hash) % 3 === 0 ? pal.windowGlow : '#21443E'}
                  fillOpacity={(floor + bay + hash) % 3 === 0 ? '0.85' : '0.9'}
                />
              ))
            )}
            <rect x="145" y="36" width="310" height="8" fill={pal.accentLine} />
          </g>
        ) : (
          /* Stepped Luxury Residential / Mixed-Use Mid-Rise */
          <g>
            {/* Left Wing */}
            <rect x="120" y="92" width="110" height="183" fill={pal.facadeSecondary} />
            {/* Center Limestone Tower */}
            <rect x="215" y="48" width="170" height="227" fill={pal.facadePrimary} />
            {/* Right Wing */}
            <rect x="375" y="84" width="105" height="191" fill={pal.facadeSecondary} />
            {/* Cornice Accent */}
            <rect x="210" y="42" width="180" height="7" fill={pal.accentLine} />

            {/* Center Tower Windows */}
            {[0, 1, 2, 3, 4].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <g key={`c-${r}-${c}`}>
                  <rect
                    x={231 + c * 36}
                    y={64 + r * 36}
                    width="24"
                    height="24"
                    fill="#142623"
                  />
                  {(r + c + hash) % 2 === 0 && (
                    <rect
                      x={234 + c * 36}
                      y={67 + r * 36}
                      width="18"
                      height="18"
                      fill={pal.windowGlow}
                      fillOpacity="0.82"
                    />
                  )}
                </g>
              ))
            )}

            {/* Side Wing Windows */}
            {[0, 1, 2, 3].map((r) => (
              <g key={`w-${r}`}>
                <rect x="142" y={108 + r * 36} width="22" height="22" fill="#142623" />
                <rect x="174" y={108 + r * 36} width="22" height="22" fill={pal.windowGlow} fillOpacity="0.7" />
                <rect x="400" y={102 + r * 36} width="22" height="22" fill={pal.windowGlow} fillOpacity="0.75" />
                <rect x="434" y={102 + r * 36} width="22" height="22" fill="#142623" />
              </g>
            ))}

            {/* Ground Entrance Colonnade */}
            <rect x="265" y="242" width="70" height="33" fill="#0D1917" />
            <rect x="275" y="247" width="50" height="28" fill={pal.windowGlow} fillOpacity="0.9" />
          </g>
        )}

        {/* Ground Promenade */}
        <rect x="0" y="275" width="600" height="45" fill="#0B1413" />
      </svg>

      {/* Measured Contrast Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      {/* Bottom Caption Overlay */}
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white pointer-events-none">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/80 truncate">
            {propertyType}
            {city ? ` · ${city}` : ''}
          </p>
          <p className="text-sm font-semibold tracking-tight text-white truncate">
            {propertyName}
          </p>
        </div>
      </div>
    </div>
  );
}
