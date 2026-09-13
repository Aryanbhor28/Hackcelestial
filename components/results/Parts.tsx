"use client";

import Link from "next/link";
import { useState } from "react";
import type { Recommendation, ScoreLine, TravelerRequest } from "@/lib/types";
import type { RequestMeta } from "@/lib/clientState";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { photoFor } from "@/lib/data/media";
import { CATEGORY_LABEL } from "@/components/Bits";
import { SaveButton } from "@/components/SaveButton";

/* ========================================================== match score ring */

export function ScoreRing({
  score,
  size = 74,
  label = true,
}: {
  score: number;
  size?: number;
  label?: boolean;
}) {
  const stroke = size >= 64 ? 6 : 4.5;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 85 ? "var(--color-teal)" : score >= 70 ? "#b8621c" : "var(--color-muted)";
  return (
    <div className="rs-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ ["--dash" as string]: String(c * (1 - score / 100)) }}
          className="rs-ring-arc"
        />
      </svg>
      <span className="rs-ring-text" style={{ color: tone }}>
        <span style={{ fontSize: size * 0.29 }}>{score}</span>
        {label && <span className="rs-ring-unit">% match</span>}
      </span>
    </div>
  );
}

/* ============================================================ trip context */

const CONF_LABEL: Record<string, string> = {
  explicit: "you said this",
  inferred: "inferred from your words",
  default: "our default",
};

export function TripContext({
  req,
  meta,
  onRefine,
}: {
  req: TravelerRequest;
  meta: RequestMeta | null;
  onRefine: () => void;
}) {
  const chips: { icon: string; text: string; field: string }[] = [
    { icon: "📍", text: req.location, field: "location" },
    {
      icon: "👥",
      text: `${
        req.travelerType === "parents"
          ? "With parents"
          : req.travelerType.charAt(0).toUpperCase() + req.travelerType.slice(1)
      } · ${req.groupSize}`,
      field: "groupSize",
    },
    { icon: "⏱", text: `${fmtDuration(req.availableMin)} from ${fmtTime(req.startMin)}`, field: "availableMin" },
    { icon: "₹", text: `${req.budgetPerPerson} / person`, field: "budgetPerPerson" },
    ...(req.interests.length
      ? [{ icon: "✦", text: req.interests.map((i) => CATEGORY_LABEL[i]).join(", "), field: "interests" }]
      : []),
    {
      icon: "◌",
      text: req.pace === "relaxing" ? "Relaxed" : req.pace === "energetic" ? "Energetic" : "Balanced",
      field: "pace",
    },
    {
      icon: "🚶",
      text:
        req.mobility === "low_walking"
          ? "Very little walking"
          : req.mobility === "wheelchair"
            ? "Step-free access"
            : req.mobility === "high"
              ? "Happy to be active"
              : "Some walking is fine",
      field: "mobility",
    },
  ];

  const stated = meta ? Object.values(meta.conf).filter((c) => c === "explicit").length : 0;
  // the heading follows the request's real start time, not a fixed phrase
  const hour = Math.floor(req.startMin / 60);
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";

  return (
    <section className="rs-context">
      <div className="rs-situation">
        <h1 className="rs-situation-title">Here&apos;s what fits your {period}.</h1>
        <p className="rs-situation-sub">
          Based on your time, budget, group and preferences in {req.location}.
        </p>
      </div>

      <div className="rs-capsule">
        <div className="rs-context-head">
          <p className="rs-eyebrow">We understood you</p>
          <button
            className="btn btn-ghost btn-sm shrink-0"
            onClick={onRefine}
            aria-label="Adjust your trip context"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M3 6h14M6 10h8M8.5 14h3" strokeLinecap="round" />
            </svg>
            Adjust
          </button>
        </div>

        <div className="rs-chips">
          {chips.map((c) => {
            const conf = meta?.conf[c.field];
            const ev = meta?.evidence[c.field];
            const fromProfile = meta?.fromProfile.includes(c.field);
            return (
              <span
                key={c.field}
                className={`rs-chip ${conf ? `is-${conf}` : ""}`}
                title={
                  fromProfile
                    ? "From your saved travel preferences"
                    : conf
                      ? `${CONF_LABEL[conf]}${ev ? ` — "${ev}"` : ""}`
                      : undefined
                }
              >
                <span className="rs-chip-icon" aria-hidden>
                  {c.icon}
                </span>
                {c.text}
                {fromProfile && <span className="rs-chip-src">profile</span>}
              </span>
            );
          })}
        </div>

        {meta && (
          <p className="rs-understood">
            {stated} detail{stated === 1 ? "" : "s"} came straight from what you said; the rest are
            inferred or defaults you can adjust.
          </p>
        )}
      </div>
    </section>
  );
}

/* =========================================================== match factors */

const FACTOR_LABEL: Record<string, string> = {
  interest: "Interest fit",
  time: "Time fit",
  budget: "Budget fit",
  group: "Group fit",
  accessibility: "Walking & access",
  distance: "Distance",
  availability: "Availability",
  local: "Local character",
  trust: "Trust",
  itinerary: "Plan fit",
};

const FACTOR_ORDER = [
  "interest",
  "time",
  "budget",
  "group",
  "accessibility",
  "distance",
  "availability",
  "local",
  "trust",
  "itinerary",
];

/**
 * A qualitative band over the engine's own 0–1 factor score. Deliberately words,
 * not percentages — the factor scores are a ranking methodology, not a measurement.
 */
export function factorBand(score: number): "Strong" | "Good" | "Fair" | "Weak" {
  return score >= 0.8 ? "Strong" : score >= 0.6 ? "Good" : score >= 0.4 ? "Fair" : "Weak";
}

export function MatchFactors({ rec }: { rec: Recommendation }) {
  // on narrow screens only the first four (interest, time, budget, group) show
  // until expanded, so the booking actions stay within reach
  const [all, setAll] = useState(false);
  const lines = FACTOR_ORDER.map((k) => rec.lines.find((l) => l.key === k)).filter(
    (l): l is ScoreLine => Boolean(l)
  );
  return (
    <>
      <ul className={`rs-factors ${all ? "is-all" : ""}`}>
        {lines.map((l, i) => {
          const band = factorBand(l.score);
          return (
            <li
              key={l.key}
              className={`is-${band.toLowerCase()}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="rs-factor-label">{FACTOR_LABEL[l.key] ?? l.label}</span>
              <span className="rs-factor-band">
                <span className="rs-factor-dot" aria-hidden />
                {band}
              </span>
              <span className="rs-factor-detail">{l.detail}</span>
            </li>
          );
        })}
      </ul>
      {lines.length > 4 && (
        <button
          className="rs-factors-more"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
        >
          {all ? "Show fewer factors" : `Show all ${lines.length} factors`}
        </button>
      )}
      <p className="rs-factors-note">
        Each band summarises one of the ten factors the matching engine scored for this experience.
      </p>
    </>
  );
}

/* ============================================================= feasibility */

export function FeasibilityBreakdown({
  rec,
  availableMin,
  compact = false,
}: {
  rec: Recommendation;
  availableMin: number;
  compact?: boolean;
}) {
  const f = rec.feasibility;
  const spare = availableMin - f.totalCommitmentMin;
  const tight = spare < 20;
  const pct = (n: number) => `${Math.min(100, (n / Math.max(availableMin, 1)) * 100)}%`;

  if (compact)
    return (
      <span className={`rs-feas-pill ${!f.fits ? "is-no" : tight ? "is-tight" : "is-yes"}`}>
        {!f.fits ? "✕ Doesn't fit" : tight ? "⚠ Tight schedule" : "✓ Fits your time"}
      </span>
    );

  return (
    <div className={`rs-feas ${!f.fits ? "is-no" : tight ? "is-tight" : "is-yes"}`}>
      <div className="rs-feas-head">
        <span className="rs-feas-verdict">
          {!f.fits ? "✕ Doesn't fit your window" : tight ? "⚠ Tight schedule" : "✓ Fits your time"}
        </span>
        <span className="rs-feas-total">
          {fmtDuration(f.totalCommitmentMin)} door to door of {fmtDuration(availableMin)}
        </span>
      </div>

      <div className="rs-feas-bar" aria-hidden>
        <span className="seg is-travel" style={{ width: pct(f.travelToMin) }} />
        <span className="seg is-exp" style={{ width: pct(rec.experience.durationMin) }} />
        <span className="seg is-travel" style={{ width: pct(f.travelBackMin) }} />
      </div>

      <dl className="rs-feas-math">
        <div>
          <dt>Experience</dt>
          <dd>{fmtDuration(rec.experience.durationMin)}</dd>
        </div>
        <div>
          <dt>Travel there</dt>
          <dd>{fmtDuration(f.travelToMin)}</dd>
        </div>
        <div>
          <dt>Return</dt>
          <dd>{fmtDuration(f.travelBackMin)}</dd>
        </div>
        <div className="is-total">
          <dt>Total commitment</dt>
          <dd>{fmtDuration(f.totalCommitmentMin)}</dd>
        </div>
        <div className={spare < 0 ? "is-over" : ""}>
          <dt>{spare < 0 ? "Over your window by" : "You have spare"}</dt>
          <dd>{fmtDuration(Math.abs(spare))}</dd>
        </div>
      </dl>

      {!f.fits && f.reason && <p className="rs-feas-reason">{f.reason}</p>}
    </div>
  );
}

/* ============================================================== why match */

const FACTOR_ICON: Record<string, string> = {
  interest: "🎭",
  time: "⏱",
  budget: "₹",
  group: "👥",
  distance: "📍",
  accessibility: "🚶",
  local: "🌿",
  availability: "🕕",
  trust: "✓",
  itinerary: "🗓",
};

export function WhyMatch({ rec }: { rec: Recommendation }) {
  const sorted = [...rec.lines].sort((a, b) => b.score * b.weight - a.score * a.weight);
  return (
    <div className="rs-why">
      <p className="rs-why-lede">
        Why LocalFlow recommends this — every line below is a factor the engine actually scored.
      </p>
      <ul className="rs-why-list">
        {sorted.map((l) => (
          <li key={l.key} className={l.score >= 0.75 ? "is-strong" : l.score >= 0.45 ? "is-ok" : "is-weak"}>
            <span className="rs-why-icon" aria-hidden>
              {FACTOR_ICON[l.key] ?? "•"}
            </span>
            <div className="min-w-0">
              <span className="rs-why-label">
                {l.label}
                <span className="rs-why-weight">weight {Math.round(l.weight * 100)}</span>
              </span>
              <p className="rs-why-detail">{l.detail}</p>
            </div>
            <span className="rs-why-bar" aria-hidden>
              <span style={{ width: `${Math.round(l.score * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="rs-why-foot">
        Match Score is a weighted blend of these ten factors — a stated platform methodology, not a
        measure of certainty.
      </p>
    </div>
  );
}

/* ======================================================= local relevance */

export function LocalRelevance({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);
  const v = rec.experience.localRelevance;
  return (
    <div className="rs-local">
      <button className="rs-local-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="rs-local-label">Local relevance</span>
        <span className="rs-local-value">{v}<span>/100</span></span>
        <span className="rs-local-track" aria-hidden>
          <span style={{ width: `${v}%` }} />
        </span>
        <span className="rs-local-info" aria-hidden>
          ⓘ
        </span>
      </button>
      {open && (
        <div className="rs-local-body fade-up">
          <p>
            Local relevance reflects factors such as local ownership, community involvement,
            cultural relevance and local expertise. It is LocalFlow&apos;s methodology, not an
            objective universal measure.
          </p>
          <ul>
            {rec.experience.localRelevanceFactors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ================================================================== trust */

export function TrustPanel({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);
  const ev = rec.provider.evidence;
  const checks: [string, boolean][] = [
    ["Phone verified", ev.phoneVerified],
    ["Identity verified", ev.identityVerified],
    ["Location verified", ev.locationVerified],
    ["Experience details confirmed by the provider", ev.detailsConfirmedByProvider],
  ];
  const verified = rec.experience.verification === "verified";
  return (
    <div className="rs-trust">
      <button className="rs-trust-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={verified ? "chip chip-good" : "chip chip-warn"}>
          {verified ? "✓ Verified provider" : "◷ Verification in progress"}
        </span>
        <span className="rs-trust-more">{open ? "Hide evidence" : "What was checked?"}</span>
      </button>
      {open && (
        <div className="rs-trust-body fade-up">
          <ul>
            {checks.map(([label, ok]) => (
              <li key={label} className={ok ? "is-ok" : ""}>
                <span aria-hidden>{ok ? "✓" : "○"}</span>
                {label}
              </li>
            ))}
          </ul>
          {ev.permitsOnFile?.length ? <p>On file: {ev.permitsOnFile.join(", ")}</p> : null}
          {ev.localReference ? <p>Local reference: {ev.localReference}</p> : null}
          <p className="rs-trust-note">
            Last verified {ev.lastVerifiedAt}. We show what was checked and when, rather than
            claiming an experience is “100% safe”.
          </p>
        </div>
      )}
    </div>
  );
}

/* ========================================================= secondary card */

export function ResultCard({
  rec,
  rank,
  active,
  availableMin,
  onHover,
  onAddToPlan,
  inPlan,
}: {
  rec: Recommendation;
  rank: number;
  active: boolean;
  availableMin: number;
  onHover: (id: string | undefined) => void;
  onAddToPlan: (rec: Recommendation) => void;
  inPlan: boolean;
}) {
  const e = rec.experience;
  const photo = photoFor(e.experienceId, e.category);
  const f = rec.feasibility;

  return (
    <article
      className={`rs-card ${active ? "is-active" : ""}`}
      onMouseEnter={() => onHover(e.experienceId)}
      onMouseLeave={() => onHover(undefined)}
      style={{ animationDelay: `${Math.min(rank, 8) * 45}ms` }}
    >
      <Link href={`/experience/${e.experienceId}`} className="rs-card-media">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <span
            className="rs-card-fallback"
            style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
          >
            {e.glyph}
          </span>
        )}
        <span className="rs-card-rank">#{rank}</span>
      </Link>

      <div className="rs-card-body">
        <div className="rs-card-top">
          <div className="min-w-0">
            <p className="rs-card-cat">
              {CATEGORY_LABEL[e.category]} · {e.area}
            </p>
            <h3 className="rs-card-title">
              <Link href={`/experience/${e.experienceId}`}>{e.name}</Link>
            </h3>
          </div>
          <ScoreRing score={rec.matchScore} size={54} label={false} />
        </div>

        <div className="rs-card-facts">
          <span>{e.price === 0 ? "Free" : `₹${e.price}`}</span>
          <span>{fmtDuration(e.durationMin)}</span>
          <span>{f.distanceKm} km</span>
          <span className="is-time">{fmtTime(f.earliestStartMin ?? 0)}</span>
        </div>

        <div className="rs-card-tags">
          <FeasibilityBreakdown rec={rec} availableMin={availableMin} compact />
          {rec.reasons.slice(0, 2).map((r) => (
            <span key={r} className="rs-tag">
              ✓ {r}
            </span>
          ))}
        </div>

        <div className="rs-card-foot">
          <span className="rs-card-local" title="Local relevance — LocalFlow methodology">
            <span className="rs-local-track sm" aria-hidden>
              <span style={{ width: `${e.localRelevance}%` }} />
            </span>
            {e.localRelevance}
          </span>
          <span className={e.verification === "verified" ? "rs-verif is-ok" : "rs-verif"}>
            {e.verification === "verified" ? "✓ Verified" : "◷ Pending"}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <SaveButton experienceId={e.experienceId} />
            <button
              className="rs-mini-btn"
              onClick={() => onAddToPlan(rec)}
              disabled={inPlan || !f.fits}
              title={!f.fits ? "Doesn't fit your window" : inPlan ? "Already in your plan" : "Add to plan"}
            >
              {inPlan ? "In plan" : "+ Plan"}
            </button>
            <Link href={`/experience/${e.experienceId}`} className="rs-mini-btn is-primary">
              View
            </Link>
          </span>
        </div>
      </div>
    </article>
  );
}

/* ================================================== why not ranked higher */

export function weakestLines(rec: Recommendation, n = 3): ScoreLine[] {
  return [...rec.lines].sort((a, b) => a.score - b.score).slice(0, n);
}
