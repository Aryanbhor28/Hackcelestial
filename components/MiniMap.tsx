"use client";

import type { Recommendation } from "@/lib/types";

/**
 * Schematic valley map. Deliberately not a tile map: it plots only the
 * recommended set against the traveler's position, which is the whole point -
 * we show what fits, not every business in town.
 */
export function MiniMap({
  recs,
  origin,
  selectedId,
  onSelect,
}: {
  recs: Recommendation[];
  origin: { lat: number; lng: number };
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const pts = recs.map((r) => ({
    id: r.experience.experienceId,
    lat: r.experience.lat,
    lng: r.experience.lng,
    name: r.experience.name,
    score: r.matchScore,
    km: r.feasibility.distanceKm,
    glyph: r.experience.glyph,
  }));

  const lats = [origin.lat, ...pts.map((p) => p.lat)];
  const lngs = [origin.lng, ...pts.map((p) => p.lng)];
  const pad = 0.012;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;

  const W = 100;
  const H = 100;
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * W;
  const y = (lat: number) => H - ((lat - minLat) / (maxLat - minLat)) * H;

  const ox = x(origin.lng);
  const oy = y(origin.lat);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <span className="text-sm font-semibold">Where these are</span>
        <span className="text-xs text-[var(--color-muted)]">
          {recs.length} matches · you at centre
        </span>
      </div>
      <div className="relative bg-[#f3efe7]">
        <svg viewBox="0 0 100 100" className="block h-[320px] w-full">
          <defs>
            <linearGradient id="valley" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eef3ec" />
              <stop offset="100%" stopColor="#e6ece2" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#valley)" />

          {/* stylised river + road running the length of the valley */}
          <path
            d="M 18 -5 C 30 25, 24 45, 38 70 S 52 100, 58 108"
            stroke="#c3d8e6"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 24 -5 C 36 25, 30 45, 44 70 S 58 100, 64 108"
            stroke="#ded5c6"
            strokeWidth="1.4"
            fill="none"
            strokeDasharray="3 2"
          />

          {/* travel spokes from the traveler to each match */}
          {pts.map((p) => (
            <line
              key={`l-${p.id}`}
              x1={ox}
              y1={oy}
              x2={x(p.lng)}
              y2={y(p.lat)}
              stroke={selectedId === p.id ? "#b4451f" : "#cdc2b4"}
              strokeWidth={selectedId === p.id ? 0.8 : 0.35}
              strokeDasharray="1.5 1.5"
            />
          ))}

          {/* traveler */}
          <circle cx={ox} cy={oy} r="2.6" fill="#14110f" />
          <circle cx={ox} cy={oy} r="5" fill="none" stroke="#14110f" strokeWidth="0.4" opacity="0.35" />

          {pts.map((p, i) => {
            const sel = selectedId === p.id;
            const top = i === 0;
            return (
              <g
                key={p.id}
                onClick={() => onSelect?.(p.id)}
                style={{ cursor: onSelect ? "pointer" : "default" }}
              >
                <circle
                  cx={x(p.lng)}
                  cy={y(p.lat)}
                  r={sel ? 3.6 : top ? 3.2 : 2.4}
                  fill={sel || top ? "#b4451f" : "#ffffff"}
                  stroke={sel || top ? "#8c3415" : "#9c9084"}
                  strokeWidth="0.6"
                />
                <text
                  x={x(p.lng)}
                  y={y(p.lat) + 1}
                  textAnchor="middle"
                  fontSize="2.4"
                  fill={sel || top ? "#fff" : "#4a423c"}
                  style={{ pointerEvents: "none" }}
                >
                  {p.score}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[11px] leading-snug text-[var(--color-ink-soft)] shadow-sm">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--color-ink)] align-middle" />
          You
          <span className="mx-2">·</span>
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--color-brand)] align-middle" />
          match score
        </div>
      </div>
    </div>
  );
}
