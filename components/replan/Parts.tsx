"use client";

import Link from "next/link";
import type { Recommendation, TravelerRequest } from "@/lib/types";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { photoFor } from "@/lib/data/media";
import { CATEGORY_LABEL } from "@/components/Bits";
import { ScoreRing } from "@/components/results/Parts";

/* ============================================================ disruption */

export interface ReasonSpec {
  key: string;
  headline: string;
  changedLabel: string;
  changedFrom: (r: TravelerRequest) => string;
  changedTo: (r: TravelerRequest) => string;
  /** the engine's own rule name that this disruption makes bite */
  engineRule: string;
}

/**
 * What actually became of the original experience after the disruption --
 * read from the engine's own rejection list rather than assumed.
 */
export interface OriginalStatus {
  /** true when the engine no longer returns it as a match */
  droppedOut: boolean;
  /** the engine's rule name, when it was rejected */
  rule: string | null;
  /** its new score, when it survived */
  stillScore: number | null;
}

export function DisruptionHeader({
  reason,
  original,
  before,
  status,
}: {
  reason: ReasonSpec;
  original: Recommendation | null;
  before: TravelerRequest;
  status: OriginalStatus;
}) {
  const e = original?.experience;
  const photo = e ? photoFor(e.experienceId, e.category) : null;

  return (
    <header className="rp-head">
      <div className="rp-head-copy">
        <p className="rp-eyebrow">
          <span className="rp-pulse" aria-hidden />
          Change detected
        </p>
        <h1 className="rp-title">{reason.headline}</h1>
        <p className="rp-sub">
          LocalFlow has re-checked your remaining time, budget, group, accessibility and
          availability — and kept everything else about your request exactly as it was.
        </p>
      </div>

      {original && e && (
        <div className="rp-original">
          <div className={`rp-original-media ${status.droppedOut ? "is-gone" : ""}`}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" />
            ) : (
              <span
                className="rp-original-fallback"
                style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
              >
                {e.glyph}
              </span>
            )}
            {status.droppedOut && <span className="rp-original-strike" aria-hidden />}
          </div>
          <div className="min-w-0">
            <p className="rp-original-label">Previously planned</p>
            <p className="rp-original-name">{e.name}</p>
            <p className="rp-original-meta">
              {fmtTime(original.feasibility.earliestStartMin ?? before.startMin)} ·{" "}
              {fmtDuration(e.durationMin)} · ₹{e.price}
            </p>
            <span className={`rp-original-flag ${status.droppedOut ? "" : "is-soft"}`}>
              {status.droppedOut
                ? `⚠ ${reason.key === "unavailable" ? "No longer available" : (status.rule ?? "No longer a match")}`
                : `Still available at ${status.stillScore}% — no longer your best fit`}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

/* ==================================================== before → after flow */

export function FlowStrip({
  originalName,
  replacementName,
  stage,
}: {
  originalName: string | null;
  replacementName: string | null;
  stage: "working" | "done" | "none";
}) {
  return (
    <ol className="rp-flow" aria-label="Replanning flow">
      <li className="is-past">
        <span className="rp-flow-label">Your original plan</span>
        <span className="rp-flow-value">{originalName ?? "—"}</span>
      </li>
      <li className="is-change">
        <span className="rp-flow-label">Change detected</span>
        <span className="rp-flow-value">Availability &amp; constraints</span>
      </li>
      <li className={stage === "working" ? "is-working" : "is-done"}>
        <span className="rp-flow-label">LocalFlow replanned</span>
        <span className="rp-flow-value">
          {stage === "working" ? "Re-evaluating…" : "Re-scored every experience"}
        </span>
      </li>
      <li className={stage === "done" ? "is-new" : ""}>
        <span className="rp-flow-label">New plan</span>
        <span className="rp-flow-value">
          {stage === "working" ? "…" : (replacementName ?? "No feasible option")}
        </span>
      </li>
    </ol>
  );
}

/* ======================================================= re-evaluating */

const CHECKS = [
  "Remaining time",
  "Budget",
  "Location & travel time",
  "Group suitability",
  "Interests",
  "Accessibility",
  "Availability today",
  "Existing itinerary",
];

/**
 * Shown only while the recommend request is genuinely in flight. Each line is a
 * constraint the engine really evaluates; when the response lands every line
 * completes at once rather than pretending to finish on a timer.
 */
export function ReEvaluating({
  done,
  title,
  doneTitle,
  lede,
  items = CHECKS,
  foot,
  doneFoot,
}: {
  done: boolean;
  title?: string;
  doneTitle?: string;
  lede?: string;
  items?: string[];
  foot?: string;
  doneFoot?: string;
}) {
  return (
    <section className={`rp-eval ${done ? "is-done" : ""}`} aria-live="polite">
      <p className="rp-eval-title">
        {done ? (doneTitle ?? "Re-evaluated your situation") : (title ?? "Re-evaluating your situation")}
      </p>
      {lede && <p className="rp-eval-lede">{lede}</p>}
      <ul className="rp-eval-list">
        {items.map((c, i) => (
          <li key={c} style={{ animationDelay: `${i * 55}ms` }}>
            <span className="rp-eval-tick" aria-hidden>
              ✓
            </span>
            {c}
          </li>
        ))}
      </ul>
      <p className="rp-eval-foot">
        {done
          ? (doneFoot ?? "Ranked against what is still possible.")
          : (foot ?? "Finding the best feasible alternative…")}
      </p>
    </section>
  );
}

/* ================================================ original vs replacement */

export function Comparison({
  original,
  replacement,
  availableMin,
  status,
}: {
  original: Recommendation | null;
  replacement: Recommendation;
  availableMin: number;
  status: OriginalStatus;
}) {
  const o = original;
  const r = replacement;

  const rows: { label: string; before: React.ReactNode; after: React.ReactNode }[] = [
    {
      label: "Experience",
      before: o ? o.experience.name : "—",
      after: r.experience.name,
    },
    {
      label: "Availability",
      before: status.droppedOut ? (
        <span className="rp-no">✕ {status.rule ?? "Unavailable"}</span>
      ) : (
        <span>Still available</span>
      ),
      after: (
        <span className="rp-yes">
          ✓ {fmtTime(r.feasibility.earliestStartMin ?? 0)}
        </span>
      ),
    },
    {
      label: "Duration",
      before: o ? fmtDuration(o.experience.durationMin) : "—",
      after: fmtDuration(r.experience.durationMin),
    },
    {
      label: "Price / person",
      before: o ? (o.experience.price === 0 ? "Free" : `₹${o.experience.price}`) : "—",
      after: r.experience.price === 0 ? "Free" : `₹${r.experience.price}`,
    },
    {
      label: "Match score",
      before: o ? `${o.matchScore}%` : "—",
      after: <strong>{r.matchScore}%</strong>,
    },
    {
      label: "Fits your window",
      before: status.droppedOut ? (
        <span className="rp-no">✕ Ruled out</span>
      ) : o ? (
        <span>{fmtDuration(o.feasibility.totalCommitmentMin)}</span>
      ) : (
        "—"
      ),
      after: r.feasibility.fits ? (
        <span className="rp-yes">
          ✓ {fmtDuration(r.feasibility.totalCommitmentMin)} of {fmtDuration(availableMin)}
        </span>
      ) : (
        <span className="rp-no">✕ {fmtDuration(r.feasibility.totalCommitmentMin)}</span>
      ),
    },
    {
      label: "Local relevance",
      before: o ? `${o.experience.localRelevance}/100` : "—",
      after: `${r.experience.localRelevance}/100`,
    },
  ];

  return (
    <section className="rp-compare">
      <div className="rp-compare-head">
        <span />
        <span className="rp-compare-col is-old">Original</span>
        <span className="rp-compare-col is-new">Replacement</span>
      </div>
      <dl className="rp-compare-rows">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd className="is-old">{row.before}</dd>
            <dd className="is-new">{row.after}</dd>
          </div>
        ))}
      </dl>
      <p className="rp-compare-foot">
        LocalFlow did not pick another experience at random — this is the highest-scoring option
        that still clears every hard constraint.
      </p>
    </section>
  );
}

/* =========================================== what changed / intent kept */

export function ChangeSummary({
  reason,
  before,
  after,
}: {
  reason: ReasonSpec;
  before: TravelerRequest;
  after: TravelerRequest;
}) {
  const kept: string[] = [];
  if (after.interests.length)
    kept.push(after.interests.map((i) => CATEGORY_LABEL[i]).join(" · "));
  kept.push(
    after.travelerType === "parents" ? "With parents" : after.travelerType.replace(/^\w/, (c) => c.toUpperCase())
  );
  kept.push(after.pace === "relaxing" ? "Relaxing" : after.pace === "energetic" ? "Energetic" : "Balanced");
  if (reason.key !== "budget") kept.push(`₹${after.budgetPerPerson} / person`);
  if (reason.key !== "weather")
    kept.push(
      after.mobility === "low_walking"
        ? "Low walking"
        : after.mobility === "wheelchair"
          ? "Step-free"
          : "Some walking"
    );
  if (reason.key !== "less_time") kept.push(fmtDuration(after.availableMin));

  return (
    <section className="rp-changed">
      <div className="rp-changed-col">
        <h3 className="rp-changed-title">What changed</h3>
        <div className="rp-changed-item">
          <span className="rp-changed-key">{reason.changedLabel}</span>
          <span className="rp-changed-val">
            <s>{reason.changedFrom(before)}</s>
            <span aria-hidden>→</span>
            <strong>{reason.changedTo(after)}</strong>
          </span>
          <span className="rp-changed-rule">
            Engine rule applied: “{reason.engineRule}”
          </span>
        </div>
      </div>

      <div className="rp-changed-col">
        <h3 className="rp-changed-title">Your preferences stayed the same</h3>
        <div className="rp-kept">
          {kept.map((k) => (
            <span key={k} className="rp-kept-chip">
              {k}
            </span>
          ))}
        </div>
        <p className="rp-changed-note">
          You did not have to describe your trip again — LocalFlow replanned around the change.
        </p>
      </div>
    </section>
  );
}

/* ================================================================ timeline */

export function ReplanTimeline({
  original,
  replacement,
  originalStart,
  status,
}: {
  original: Recommendation | null;
  replacement: Recommendation;
  originalStart: number | null;
  status: OriginalStatus;
}) {
  const f = replacement.feasibility;
  const start = f.earliestStartMin ?? 0;
  const rows = [
    ...(original && originalStart !== null && status.droppedOut
      ? [
          {
            time: originalStart,
            label: original.experience.name,
            kind: "cancelled" as const,
            dur: original.experience.durationMin,
          },
        ]
      : []),
    { time: start - f.travelToMin, label: `Travel to ${replacement.experience.area}`, kind: "travel" as const, dur: f.travelToMin },
    { time: start, label: replacement.experience.name, kind: "exp" as const, dur: replacement.experience.durationMin },
    {
      time: start + replacement.experience.durationMin,
      label: "Return",
      kind: "travel" as const,
      dur: f.travelBackMin,
    },
  ];

  return (
    <section className="rp-timeline-wrap">
      <h3 className="rp-section-title">Your updated plan</h3>
      <ol className="rp-timeline">
        {rows.map((r) => (
          <li key={`${r.label}-${r.time}`} className={`is-${r.kind}`}>
            <span className="rp-tl-time">{fmtTime(r.time)}</span>
            <span className="rp-tl-dot" aria-hidden />
            <span className="rp-tl-body">
              <span className="rp-tl-label">{r.label}</span>
              <span className="rp-tl-meta">
                {r.kind === "cancelled" ? (status.rule ?? "No longer available") : fmtDuration(r.dur)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ============================================================= history */

export function PlanHistory({
  originalName,
  replacementName,
  accepted,
}: {
  originalName: string | null;
  replacementName: string | null;
  accepted: boolean;
}) {
  const steps = [
    { label: `${originalName ?? "Experience"} selected`, state: "done" },
    { label: "Availability changed", state: "warn" },
    { label: "LocalFlow recalculated", state: "done" },
    {
      label: accepted ? `${replacementName} accepted` : "Replacement proposed",
      state: accepted ? "done" : "pending",
    },
  ];
  return (
    <section className="rp-history">
      <h3 className="rp-panel-title">Plan history</h3>
      <ol>
        {steps.map((s) => (
          <li key={s.label} className={`is-${s.state}`}>
            <span aria-hidden>{s.state === "warn" ? "⚠" : s.state === "pending" ? "→" : "✓"}</span>
            {s.label}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ========================================================== alternatives */

export function AlternativeRow({
  rec,
  availableMin,
  onHover,
  active,
}: {
  rec: Recommendation;
  availableMin: number;
  onHover: (id: string | undefined) => void;
  active: boolean;
}) {
  const e = rec.experience;
  const photo = photoFor(e.experienceId, e.category);
  const spare = availableMin - rec.feasibility.totalCommitmentMin;
  return (
    <article
      className={`rp-alt ${active ? "is-active" : ""}`}
      onMouseEnter={() => onHover(e.experienceId)}
      onMouseLeave={() => onHover(undefined)}
    >
      <Link href={`/experience/${e.experienceId}`} className="rp-alt-media">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <span
            className="rp-alt-fallback"
            style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
          >
            {e.glyph}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="rp-alt-cat">
          {CATEGORY_LABEL[e.category]} · {e.area}
        </p>
        <h4 className="rp-alt-name">
          <Link href={`/experience/${e.experienceId}`}>{e.name}</Link>
        </h4>
        <p className="rp-alt-facts">
          {e.price === 0 ? "Free" : `₹${e.price}`} · {fmtDuration(e.durationMin)} ·{" "}
          {rec.feasibility.distanceKm} km · {fmtTime(rec.feasibility.earliestStartMin ?? 0)}
        </p>
        <p className="rp-alt-tags">
          <span className={rec.feasibility.fits ? "rp-yes" : "rp-no"}>
            {rec.feasibility.fits ? `✓ ${fmtDuration(spare)} spare` : "✕ Doesn't fit"}
          </span>
          <span className="rp-alt-local">Local {e.localRelevance}</span>
          {e.verification === "verified" && <span className="rp-yes">✓ Verified</span>}
        </p>
      </div>
      <ScoreRing score={rec.matchScore} size={46} label={false} />
    </article>
  );
}
