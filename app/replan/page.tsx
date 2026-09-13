"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Recommendation, RecommendationResult, TravelerRequest } from "@/lib/types";
import { decodeRequest, encodeRequest } from "@/lib/clientState";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { useToast } from "@/components/Toast";
import { MiniMap } from "@/components/MiniMap";
import { WhyMatch, weakestLines } from "@/components/results/Parts";
import { ScoreRing } from "@/components/results/Parts";
import { photoFor } from "@/lib/data/media";
import { CATEGORY_LABEL } from "@/components/Bits";
import {
  AlternativeRow,
  ChangeSummary,
  Comparison,
  DisruptionHeader,
  FlowStrip,
  PlanHistory,
  ReEvaluating,
  ReplanTimeline,
  type OriginalStatus,
  type ReasonSpec,
} from "@/components/replan/Parts";

/**
 * Every reason here maps to a disruption the existing engine genuinely reacts
 * to — each `engineRule` is a real hard-filter rule name from
 * lib/engine/recommend.ts. Nothing is simulated.
 */
const REASONS: Record<string, ReasonSpec & { mutate: (r: TravelerRequest) => TravelerRequest }> = {
  unavailable: {
    key: "unavailable",
    headline: "Your experience is no longer available",
    changedLabel: "Experience availability",
    changedFrom: () => "Available",
    changedTo: () => "No longer available",
    engineRule: "Cancelled today",
    mutate: (r) => r,
  },
  less_time: {
    key: "less_time",
    headline: "You have less time than you planned",
    changedLabel: "Remaining time",
    changedFrom: (r) => fmtDuration(r.availableMin),
    changedTo: (r) => fmtDuration(r.availableMin),
    engineRule: "Will not fit your time",
    mutate: (r) => ({ ...r, availableMin: Math.max(45, r.availableMin - 60) }),
  },
  budget: {
    key: "budget",
    headline: "Your budget changed",
    changedLabel: "Budget per person",
    changedFrom: (r) => `₹${r.budgetPerPerson}`,
    changedTo: (r) => `₹${r.budgetPerPerson}`,
    engineRule: "Over budget",
    mutate: (r) => ({ ...r, budgetPerPerson: Math.max(100, Math.round(r.budgetPerPerson * 0.5)) }),
  },
  weather: {
    key: "weather",
    headline: "The weather turned",
    changedLabel: "Conditions",
    changedFrom: () => "Outdoors fine",
    changedTo: () => "Indoors, low walking",
    engineRule: "Too physically demanding",
    mutate: (r) => ({ ...r, mobility: "low_walking", pace: "relaxing" }),
  },
};

function ReplanInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [before, setBefore] = useState<TravelerRequest | null>(null);
  const [after, setAfter] = useState<TravelerRequest | null>(null);
  const [original, setOriginal] = useState<Recommendation | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [working, setWorking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [why, setWhy] = useState(false);
  const [hover, setHover] = useState<string | undefined>();
  const ran = useRef(false);

  const reasonKey = params.get("r") ?? "unavailable";
  const reason = REASONS[reasonKey] ?? REASONS.unavailable;
  const disruptedId = params.get("x");

  /* The whole replan is three real requests: score the original situation,
     apply the disruption, then score the new situation. */
  const runReplan = useCallback(async () => {
    const req = decodeRequest(params.get("q"));
    if (!req) {
      setError("No trip context to replan against.");
      setWorking(false);
      return;
    }
    setBefore(req);
    setWorking(true);
    setError(null);

    try {
      // 1. what the situation looked like before
      const beforeRes: RecommendationResult = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: req }),
      }).then((r) => r.json());

      const orig =
        beforeRes.recommendations.find((x) => x.experience.experienceId === disruptedId) ??
        beforeRes.recommendations[0] ??
        null;
      setOriginal(orig);

      // 2. apply the disruption for real
      let next = reason.mutate(req);
      if (reason.key === "unavailable" && orig) {
        await fetch("/api/disrupt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceId: orig.experience.experienceId, action: "cancel" }),
        });
        next = { ...next, excludedIds: [...next.excludedIds, orig.experience.experienceId] };
      }
      setAfter(next);

      // 3. re-score against the changed situation
      const afterRes: RecommendationResult = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: next }),
      }).then((r) => r.json());
      setResult(afterRes);
    } catch {
      setError("We couldn't reach the matching service to replan.");
    } finally {
      setWorking(false);
    }
  }, [params, reason, disruptedId]);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke would cancel twice
    ran.current = true;
    void runReplan();
  }, [runReplan]);

  /** Read from the engine's own output -- never assumed from the reason. */
  const originalStatus: OriginalStatus = (() => {
    const id = original?.experience.experienceId;
    if (!id || !result) return { droppedOut: true, rule: null, stillScore: null };
    const survived = result.recommendations.find((r) => r.experience.experienceId === id);
    if (survived) return { droppedOut: false, rule: null, stillScore: survived.matchScore };
    const rejected = result.rejected.find((r) => r.experience.experienceId === id);
    return { droppedOut: true, rule: rejected?.rule ?? null, stillScore: null };
  })();

  const replacement = result?.recommendations[0] ?? null;
  const alternatives = result?.recommendations.slice(1, 4) ?? [];

  const accept = () => {
    if (!replacement || !after) return;
    setAccepted(true);
    toast(`${replacement.experience.name} accepted as your replacement`);
  };

  const bookIt = () => {
    if (!replacement) return;
    router.push(`/experience/${replacement.experience.experienceId}`);
  };

  /* ---------------------------------------------------------------- guards */

  if (error)
    return (
      <div className="rp-page">
        <section className="rp-none">
          <p className="rp-none-title">We couldn&apos;t replan</p>
          <p className="rp-none-body">{error}</p>
          <div className="rp-none-actions">
            <button className="btn btn-brand btn-sm" onClick={() => void runReplan()}>
              Try again
            </button>
            <Link href="/discover" className="btn btn-ghost btn-sm">
              Back to Plan My Day
            </Link>
          </div>
        </section>
      </div>
    );

  return (
    <div className="rp-page">
      <DisruptionHeader
        reason={reason}
        original={original}
        before={before ?? ({} as TravelerRequest)}
        status={originalStatus}
      />

      <FlowStrip
        originalName={original?.experience.name ?? null}
        replacementName={replacement?.experience.name ?? null}
        stage={working ? "working" : replacement ? "done" : "none"}
      />

      {working && <ReEvaluating done={false} />}

      {!working && result && before && after && (
        <>
          <ReEvaluating done />

          {replacement ? (
            <div className="rp-grid">
              <div className="rp-main">
                {/* ------------------------------------ new best match */}
                <section className="rp-new fade-up">
                  <div className="rp-new-media">
                    {(() => {
                      const e = replacement.experience;
                      const photo = photoFor(e.experienceId, e.category);
                      return photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" />
                      ) : (
                        <span
                          className="rp-new-fallback"
                          style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
                        >
                          {e.glyph}
                        </span>
                      );
                    })()}
                    <span className="rp-new-scrim" aria-hidden />
                    <span className="rp-new-badge">New best match</span>
                    <div className="rp-new-overlay">
                      <p className="rp-new-cat">
                        {CATEGORY_LABEL[replacement.experience.category]} ·{" "}
                        {replacement.experience.area}
                      </p>
                      <h2 className="rp-new-title">
                        <Link href={`/experience/${replacement.experience.experienceId}`}>
                          {replacement.experience.name}
                        </Link>
                      </h2>
                      <p className="rp-new-host">Hosted by {replacement.provider.name}</p>
                    </div>
                  </div>

                  <div className="rp-new-body">
                    <div className="rp-new-headline">
                      <ScoreRing score={replacement.matchScore} size={84} />
                      <div className="rp-new-facts">
                        <div>
                          <span className="rp-fact-v">
                            {replacement.experience.price === 0
                              ? "Free"
                              : `₹${replacement.experience.price}`}
                          </span>
                          <span className="rp-fact-l">per person</span>
                        </div>
                        <div>
                          <span className="rp-fact-v">
                            {fmtDuration(replacement.experience.durationMin)}
                          </span>
                          <span className="rp-fact-l">experience</span>
                        </div>
                        <div>
                          <span className="rp-fact-v">{replacement.feasibility.distanceKm} km</span>
                          <span className="rp-fact-l">away</span>
                        </div>
                        <div>
                          <span className="rp-fact-v is-time">
                            {fmtTime(replacement.feasibility.earliestStartMin ?? 0)}
                          </span>
                          <span className="rp-fact-l">next start</span>
                        </div>
                      </div>
                    </div>

                    <ul className="rp-new-reasons">
                      {replacement.reasons.map((r) => (
                        <li key={r}>
                          <span aria-hidden>✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>

                    <p className="rp-explain">
                      {reason.key === "unavailable"
                        ? `Your original experience became unavailable, so LocalFlow kept your ${
                            after.interests.length
                              ? after.interests.map((i) => CATEGORY_LABEL[i]).join(" and ").toLowerCase()
                              : "stated"
                          } preference and ₹${after.budgetPerPerson} budget, and prioritised experiences that still fit the ${fmtDuration(
                            after.availableMin
                          )} you have left.`
                        : `Your situation changed, so LocalFlow re-scored every experience against the updated constraint while keeping the rest of your request identical.`}
                    </p>

                    <div className="rp-new-actions">
                      {!accepted ? (
                        <button className="btn btn-brand" onClick={accept}>
                          Accept replacement
                        </button>
                      ) : (
                        <button className="btn btn-brand" onClick={bookIt}>
                          Book this experience →
                        </button>
                      )}
                      <Link
                        href={`/experience/${replacement.experience.experienceId}`}
                        className="btn btn-ghost"
                      >
                        View experience
                      </Link>
                      <button
                        className={`rp-why-toggle ${why ? "is-open" : ""}`}
                        onClick={() => setWhy((v) => !v)}
                        aria-expanded={why}
                      >
                        Why LocalFlow chose this
                      </button>
                      <Link
                        href={`/results?q=${encodeRequest(after)}`}
                        className="rp-keep-link ml-auto"
                      >
                        Keep searching →
                      </Link>
                    </div>

                    {why && (
                      <div className="rp-new-why fade-up">
                        <WhyMatch rec={replacement} />
                      </div>
                    )}
                  </div>
                </section>

                <ChangeSummary reason={reason} before={before} after={after} />

                <Comparison
                  original={original}
                  replacement={replacement}
                  availableMin={after.availableMin}
                  status={originalStatus}
                />

                {accepted && (
                  <div className="fade-up">
                    <ReplanTimeline
                      original={original}
                      replacement={replacement}
                      originalStart={original?.feasibility.earliestStartMin ?? null}
                      status={originalStatus}
                    />
                  </div>
                )}

                {/* ------------------------------------- alternatives */}
                {alternatives.length > 0 && (
                  <section>
                    <h3 className="rp-section-title">Other feasible options</h3>
                    <div className="rp-alts">
                      {alternatives.map((a) => (
                        <AlternativeRow
                          key={a.experience.experienceId}
                          rec={a}
                          availableMin={after.availableMin}
                          onHover={setHover}
                          active={hover === a.experience.experienceId}
                        />
                      ))}
                    </div>

                    <details className="rp-whynot">
                      <summary>Why these ranked lower</summary>
                      <ul>
                        {alternatives.map((a) => (
                          <li key={a.experience.experienceId}>
                            <span className="rp-whynot-name">
                              {a.experience.name} — {a.matchScore}%
                            </span>
                            <ul>
                              {weakestLines(a, 2).map((l) => (
                                <li key={l.key}>
                                  <strong>{l.label}:</strong> {l.detail}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </section>
                )}
              </div>

              {/* ---------------------------------------------- rail */}
              <aside className="rp-rail">
                <PlanHistory
                  originalName={original?.experience.name ?? null}
                  replacementName={replacement.experience.name}
                  accepted={accepted}
                />
                <div className="rp-map">
                  <MiniMap
                    recs={result.recommendations}
                    origin={{ lat: after.lat, lng: after.lng }}
                    selectedId={hover ?? replacement.experience.experienceId}
                    onSelect={setHover}
                  />
                </div>
                <section className="rp-panel">
                  <h3 className="rp-panel-title">Still true about your trip</h3>
                  <p className="rp-panel-body">
                    {result.recommendations.length} of {result.consideredCount} experiences still
                    clear every hard constraint. {result.rejected.length} do not — including the one
                    that changed.
                  </p>
                  <Link href={`/results?q=${encodeRequest(after)}`} className="btn btn-ghost btn-sm mt-3">
                    See all matches
                  </Link>
                </section>
              </aside>
            </div>
          ) : (
            /* -------------------------------------- no alternative */
            <section className="rp-none">
              <p className="rp-none-title">Nothing currently fits your updated situation</p>
              <p className="rp-none-body">
                No remaining experience clears all of your constraints at once. The engine ruled out{" "}
                {result.rejected.length} of {result.consideredCount}, most often for these reasons:
              </p>
              <ul className="rp-none-rules">
                {Object.entries(
                  result.rejected.reduce<Record<string, number>>((acc, r) => {
                    acc[r.rule] = (acc[r.rule] ?? 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([rule, n]) => (
                    <li key={rule}>
                      <strong>{n}</strong> {rule.toLowerCase()}
                    </li>
                  ))}
              </ul>
              <div className="rp-none-actions">
                <Link href={`/results?q=${encodeRequest({ ...after, availableMin: after.availableMin + 60 })}`} className="btn btn-ghost btn-sm">
                  + 1 hour of time
                </Link>
                <Link href={`/results?q=${encodeRequest({ ...after, budgetPerPerson: after.budgetPerPerson + 500 })}`} className="btn btn-ghost btn-sm">
                  + ₹500 budget
                </Link>
                <Link href={`/results?q=${encodeRequest({ ...after, itinerary: [] })}`} className="btn btn-ghost btn-sm">
                  Clear my plan
                </Link>
                <Link href="/discover" className="btn btn-brand btn-sm">
                  Back to Plan My Day
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function ReplanPage() {
  return (
    <Suspense fallback={<div className="rp-page"><div className="shimmer" style={{ height: 300, borderRadius: 24 }} /></div>}>
      <ReplanInner />
    </Suspense>
  );
}
