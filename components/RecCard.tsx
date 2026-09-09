"use client";

import Link from "next/link";
import { useState } from "react";
import type { Recommendation } from "@/lib/types";
import { Art, LocalMeter, MatchRing, VerifiedBadge } from "./Bits";
import { fmtDuration, fmtTime } from "@/lib/engine/time";

export function Timeline({ rec }: { rec: Recommendation }) {
  const f = rec.feasibility;
  const start = f.earliestStartMin ?? 0;
  const segments = [
    { label: "Travel there", min: f.travelToMin, tone: "#ded5c6" },
    { label: rec.experience.name, min: rec.experience.durationMin, tone: "#b4451f" },
    { label: "Travel back", min: f.travelBackMin, tone: "#ded5c6" },
  ];
  const totalWindow = Math.max(f.totalCommitmentMin, 1);

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>Leave {fmtTime(start - f.travelToMin)}</span>
        <span className="font-medium text-[var(--color-ink-soft)]">
          {fmtDuration(f.totalCommitmentMin)} door to door
        </span>
        <span>Back {fmtTime(start + rec.experience.durationMin + f.travelBackMin)}</span>
      </div>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[var(--color-line)]">
        {segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label} — ${fmtDuration(s.min)}`}
            style={{ width: `${(s.min / totalWindow) * 100}%`, background: s.tone }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)]">
        <span>🚗 {fmtDuration(f.travelToMin)} out</span>
        <span>● {fmtDuration(rec.experience.durationMin)} experience</span>
        <span>🚗 {fmtDuration(f.travelBackMin)} back</span>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ rec }: { rec: Recommendation }) {
  return (
    <div className="space-y-2.5">
      {[...rec.lines]
        .sort((a, b) => b.score * b.weight - a.score * a.weight)
        .map((l) => (
          <div key={l.key} className="grid grid-cols-[130px_60px_1fr] items-center gap-3 text-xs">
            <span className="font-medium text-[var(--color-ink-soft)]">{l.label}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
              <div
                className="h-full rounded-full bg-[var(--color-ink)]"
                style={{ width: `${Math.round(l.score * 100)}%` }}
              />
            </div>
            <span className="text-[var(--color-muted)]">{l.detail}</span>
          </div>
        ))}
      <p className="pt-1 text-[11px] text-[var(--color-muted)]">
        Weights: interest 20 · time 15 · budget 12 · group 10 · distance 9 · accessibility 8 ·
        local 8 · availability 7 · trust 6 · plan 5.
      </p>
    </div>
  );
}

export function TopRecommendation({
  rec,
  onBook,
  onNotAvailable,
}: {
  rec: Recommendation;
  onBook?: () => void;
  onNotAvailable?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const e = rec.experience;

  return (
    <article className="card fade-up overflow-hidden">
      <div className="grid md:grid-cols-[240px_1fr]">
        <Art exp={e} className="h-44 md:h-full" big />

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <span className="chip chip-brand">Best match</span>
              <h2 className="display mt-3 text-2xl leading-tight font-semibold">
                <Link href={`/experience/${e.experienceId}`} className="hover:underline">
                  {e.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {rec.provider.name} · {e.area}
              </p>
            </div>
            <MatchRing score={rec.matchScore} size={72} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-semibold">
              {e.price === 0 ? "Free" : `₹${e.price}`}
              <span className="font-normal text-[var(--color-muted)]"> per person</span>
            </span>
            <span>{fmtDuration(e.durationMin)}</span>
            <span>{rec.feasibility.distanceKm} km</span>
            <span className="font-medium text-[var(--color-pine)]">
              Starts {fmtTime(rec.feasibility.earliestStartMin ?? 0)}
            </span>
          </div>

          <p className="mt-4 leading-relaxed text-[var(--color-ink-soft)]">{rec.explanation}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {rec.reasons.map((r) => (
              <span key={r} className="chip chip-good">
                ✓ {r}
              </span>
            ))}
            {rec.warnings.map((w) => (
              <span key={w} className="chip chip-warn">
                ! {w}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-[var(--color-paper)] p-4">
            <Timeline rec={rec} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/experience/${e.experienceId}`} className="btn btn-brand">
              View & book
            </Link>
            {onBook && (
              <button className="btn btn-ghost" onClick={onBook}>
                Add to plan
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
              {open ? "Hide score" : "How this was scored"}
            </button>
            {onNotAvailable && (
              <button
                className="ml-auto text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-brand)]"
                onClick={onNotAvailable}
              >
                This is unavailable →
              </button>
            )}
          </div>

          {open && (
            <div className="fade-up mt-5 border-t border-[var(--color-line)] pt-5">
              <ScoreBreakdown rec={rec} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function RecRow({
  rec,
  rank,
  active,
  onHover,
}: {
  rec: Recommendation;
  rank: number;
  active?: boolean;
  onHover?: (id: string) => void;
}) {
  const e = rec.experience;
  return (
    <Link
      href={`/experience/${e.experienceId}`}
      onMouseEnter={() => onHover?.(e.experienceId)}
      className={`card card-hover flex gap-4 overflow-hidden p-3 ${
        active ? "border-[var(--color-brand)]" : ""
      }`}
    >
      <Art exp={e} className="h-24 w-24 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wide text-[var(--color-muted)] uppercase">
              #{rank} · {e.area}
            </p>
            <h3 className="truncate font-semibold">{e.name}</h3>
          </div>
          <MatchRing score={rec.matchScore} size={44} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-soft)]">
          <span className="font-medium">{e.price === 0 ? "Free" : `₹${e.price}`}</span>
          <span>{fmtDuration(e.durationMin)}</span>
          <span>{rec.feasibility.distanceKm} km</span>
          <span>{fmtTime(rec.feasibility.earliestStartMin ?? 0)}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <LocalMeter value={e.localRelevance} />
          <VerifiedBadge status={e.verification} />
        </div>
      </div>
    </Link>
  );
}
