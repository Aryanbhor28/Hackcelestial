"use client";

import type { ItineraryItem, Recommendation, RecommendationResult, TravelerRequest } from "@/lib/types";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { MiniMap } from "@/components/MiniMap";

/* =============================================================== insight */

/**
 * One sentence assembled from the engine's own output — the top factor by
 * weighted contribution, plus the feasibility headroom it actually computed.
 */
export function Insight({
  result,
  req,
}: {
  result: RecommendationResult;
  req: TravelerRequest;
}) {
  const top = result.recommendations[0];
  if (!top) return null;

  const strongest = [...top.lines].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  const spare = req.availableMin - top.feasibility.totalCommitmentMin;
  const timeRejects = result.rejected.filter((r) => /fit your time|No session/i.test(r.rule)).length;

  return (
    <section className="rs-insight">
      <p className="rs-insight-label">
        <span className="rs-insight-dot" aria-hidden />
        LocalFlow insight
      </p>
      <p className="rs-insight-body">
        <strong>{top.experience.name}</strong> leads at {top.matchScore}% mainly on{" "}
        {strongest.label.toLowerCase()} — {strongest.detail.toLowerCase()}. It leaves{" "}
        {fmtDuration(Math.max(spare, 0))} of your window spare.
      </p>
      <p className="rs-insight-foot">
        {result.recommendations.length} of {result.consideredCount} experiences cleared every hard
        constraint
        {timeRejects > 0 && <> · {timeRejects} were ruled out on time alone</>}
      </p>
    </section>
  );
}

/* ============================================================ plan rail */

export function PlanPanel({
  plan,
  onRemove,
  onClear,
}: {
  plan: { rec: Recommendation; items: ItineraryItem[] }[];
  onRemove: (experienceId: string) => void;
  onClear: () => void;
}) {
  const all = plan.flatMap((p) => p.items).sort((a, b) => a.startMin - b.startMin);

  return (
    <section className="rs-panel">
      <header className="rs-panel-head">
        <h3>Your plan</h3>
        {plan.length > 0 && (
          <button className="rs-ghost-link" onClick={onClear}>
            Clear
          </button>
        )}
      </header>

      {plan.length === 0 ? (
        <p className="rs-panel-empty">
          Nothing planned yet. Add a match and LocalFlow will schedule the travel around it — and
          stop recommending anything that clashes.
        </p>
      ) : (
        <>
          <ol className="rs-timeline">
            {all.map((it) => (
              <li key={it.itemId} className={`is-${it.kind}`}>
                <span className="rs-tl-time">{fmtTime(it.startMin)}</span>
                <span className="rs-tl-dot" aria-hidden />
                <span className="rs-tl-label">
                  {it.label}
                  <span className="rs-tl-dur">{fmtDuration(it.endMin - it.startMin)}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="rs-plan-items">
            {plan.map((p) => (
              <button
                key={p.rec.experience.experienceId}
                className="rs-plan-chip"
                onClick={() => onRemove(p.rec.experience.experienceId)}
                title="Remove from plan"
              >
                {p.rec.experience.name}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ========================================================= dynamic panel */

export function ChangePanel({
  onCancelTop,
  onLessTime,
  onBudgetDrop,
  onSomethingElse,
  onWeather,
  onReset,
  hasTop,
}: {
  onCancelTop: () => void;
  onLessTime: () => void;
  onBudgetDrop: () => void;
  onSomethingElse: () => void;
  onWeather: () => void;
  onReset: () => void;
  hasTop: boolean;
}) {
  return (
    <section className="rs-panel rs-change">
      <header className="rs-panel-head">
        <h3>Something changed?</h3>
      </header>
      <p className="rs-panel-sub">Your recommendations adapt as your plans change.</p>
      <div className="rs-change-grid">
        <button onClick={onCancelTop} disabled={!hasTop}>
          ✕ Top pick cancelled
        </button>
        <button onClick={onLessTime}>⏱ I have an hour less</button>
        <button onClick={onBudgetDrop}>₹ Budget dropped</button>
        <button onClick={onWeather}>☂ Weather turned</button>
        <button onClick={onSomethingElse}>↻ Show me something else</button>
      </div>
      <button className="rs-ghost-link mt-3" onClick={onReset}>
        Reset exclusions
      </button>
    </section>
  );
}

/* =============================================================== map card */

export function MapPanel({
  result,
  req,
  selectedId,
  onSelect,
}: {
  result: RecommendationResult;
  req: TravelerRequest;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rs-map">
      <MiniMap
        recs={result.recommendations}
        origin={{ lat: req.lat, lng: req.lng }}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
