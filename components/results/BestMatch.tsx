"use client";

import Link from "next/link";
import { useState } from "react";
import type { Recommendation } from "@/lib/types";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { photoFor } from "@/lib/data/media";
import { CATEGORY_LABEL } from "@/components/Bits";
import { SaveButton } from "@/components/SaveButton";
import {
  FeasibilityBreakdown,
  LocalRelevance,
  MatchFactors,
  ScoreRing,
  TrustPanel,
  WhyMatch,
} from "./Parts";

/**
 * The top match. Reads in the order an evaluator should: what it is, why it
 * matches you, whether it actually fits, how the match was formed, then act.
 * Every value is the engine's own output for this recommendation.
 */
export function BestMatch({
  rec,
  availableMin,
  inPlan,
  onAddToPlan,
  onUnavailable,
}: {
  rec: Recommendation;
  availableMin: number;
  inPlan: boolean;
  onAddToPlan: (rec: Recommendation) => void;
  onUnavailable: () => void;
}) {
  const [breakdown, setBreakdown] = useState(false);
  const e = rec.experience;
  const f = rec.feasibility;
  const photo = photoFor(e.experienceId, e.category);

  return (
    <section className="rs-best fade-up" aria-labelledby="rs-best-title">
      <div className="rs-best-media">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <span
            className="rs-best-fallback"
            style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
          >
            {e.glyph}
          </span>
        )}
        <span className="rs-best-scrim" aria-hidden />
        <span className="rs-best-badge">Top match</span>
        <span className="rs-best-save">
          <SaveButton experienceId={e.experienceId} onDark />
        </span>
        <div className="rs-best-overlay">
          <p className="rs-best-cat">
            {CATEGORY_LABEL[e.category]} · {e.area} · {f.distanceKm} km
          </p>
          <h2 className="rs-best-title" id="rs-best-title">
            <Link href={`/experience/${e.experienceId}`}>{e.name}</Link>
          </h2>
          <p className="rs-best-host">Hosted by {rec.provider.name}</p>
        </div>
      </div>

      <div className="rs-best-body">
        <div className="rs-best-headline">
          <ScoreRing score={rec.matchScore} size={88} />
          <div className="rs-best-facts">
            <div>
              <span className="rs-fact-value">{e.price === 0 ? "Free" : `₹${e.price}`}</span>
              <span className="rs-fact-label">per person</span>
            </div>
            <div>
              <span className="rs-fact-value">{fmtDuration(e.durationMin)}</span>
              <span className="rs-fact-label">experience</span>
            </div>
            <div>
              <span className="rs-fact-value">{f.distanceKm} km</span>
              <span className="rs-fact-label">away</span>
            </div>
            <div>
              <span className="rs-fact-value is-time">{fmtTime(f.earliestStartMin ?? 0)}</span>
              <span className="rs-fact-label">available today</span>
            </div>
          </div>
        </div>

        {/* 1 — why this matches you (the engine's own reasons) */}
        <div className="rs-best-section">
          <h3 className="rs-best-h">Why this matches you</h3>
          <ul className="rs-reasons-list">
            {rec.reasons.map((r, i) => (
              <li key={r} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="rs-tick" aria-hidden>
                  ✓
                </span>
                {r}
              </li>
            ))}
            {rec.warnings.map((w, i) => (
              <li
                key={w}
                className="is-warn"
                style={{ animationDelay: `${(rec.reasons.length + i) * 60}ms` }}
              >
                <span className="rs-tick" aria-hidden>
                  !
                </span>
                <span>
                  <span className="sr-only">Note: </span>
                  {w}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 2 — can it actually fit? (the engine's feasibility calculation) */}
        <div className="rs-best-section">
          <h3 className="rs-best-h">Fits your window</h3>
          <FeasibilityBreakdown rec={rec} availableMin={availableMin} />
        </div>

        {/* 3 — how the match was formed */}
        <div className="rs-best-section">
          <h3 className="rs-best-h">
            Match factors
            <button
              className="rs-inline-btn"
              onClick={() => setBreakdown((v) => !v)}
              aria-expanded={breakdown}
            >
              {breakdown ? "Hide full breakdown" : "See full breakdown"}
            </button>
          </h3>
          <MatchFactors rec={rec} />
          {breakdown && (
            <div className="rs-best-why fade-up">
              <WhyMatch rec={rec} />
            </div>
          )}
        </div>

        <div className="rs-best-meta">
          <LocalRelevance rec={rec} />
          <TrustPanel rec={rec} />
        </div>

        {/* 4 — act on it, through the existing experience and booking flow */}
        <div className="rs-best-actions">
          <Link href={`/experience/${e.experienceId}`} className="btn btn-brand">
            View experience
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href={`/experience/${e.experienceId}#book`} className="btn btn-ghost">
            Request booking
          </Link>
          <SaveButton experienceId={e.experienceId} label />
          <button className="btn btn-ghost" onClick={() => onAddToPlan(rec)} disabled={inPlan}>
            {inPlan ? "✓ In your plan" : "Add to plan"}
          </button>
          <button className="rs-ghost-link ml-auto" onClick={onUnavailable}>
            This is unavailable →
          </button>
        </div>
      </div>
    </section>
  );
}
